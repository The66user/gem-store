"""
API 路由 — 管理后台接口
需要 JWT 认证，仅管理员可访问
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import aiosqlite
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta

from database import getDb
from config import settings
from schemas import (
    AdminLogin, AdminToken, DashboardData,
    ProductCreate, ProductUpdate, ProductResponse,
    CardImport, CardResponse,
    BookingUpdate,
    PaginatedResponse, MessageResponse
)
import repositories as repo

router = APIRouter(prefix="/api/admin", tags=["管理后台"])
security = HTTPBearer()


# ========== 认证 ==========

def createToken(username: str) -> str:
    """生成 JWT Token"""
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def getCurrentAdmin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: aiosqlite.Connection = Depends(getDb)
) -> dict:
    """
    JWT 认证依赖
    验证 Token 有效性并返回管理员信息
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
    except JWTError:
        raise HTTPException(status_code=401, detail="认证令牌已过期或无效")

    admin = await repo.getAdminByUsername(db, username)
    if not admin:
        raise HTTPException(status_code=401, detail="管理员不存在")
    return admin


@router.post("/login", response_model=AdminToken)
async def adminLogin(data: AdminLogin, db: aiosqlite.Connection = Depends(getDb)):
    """管理员登录"""
    admin = await repo.getAdminByUsername(db, data.username)
    if not admin:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not bcrypt.checkpw(data.password.encode(), admin["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = createToken(admin["username"])
    return {"accessToken": token, "tokenType": "bearer"}


# ========== 仪表盘 ==========

@router.get("/dashboard", response_model=DashboardData)
async def getDashboard(
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取仪表盘统计数据"""
    return await repo.getDashboardData(db)


# ========== 商品管理 ==========

@router.get("/products", response_model=list[ProductResponse])
async def listAllProducts(
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取所有商品（含未上架的）"""
    products = await repo.getAllProducts(db)
    return [_formatProduct(p) for p in products]


@router.post("/products", response_model=MessageResponse)
async def createProduct(
    data: ProductCreate,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """创建商品"""
    productId = await repo.createProduct(db, data.model_dump())
    return {"message": f"商品创建成功，ID: {productId}", "success": True}


@router.put("/products/{productId}", response_model=MessageResponse)
async def updateProduct(
    productId: int, data: ProductUpdate,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """更新商品"""
    existing = await repo.getProductById(db, productId)
    if not existing:
        raise HTTPException(status_code=404, detail="商品不存在")

    updateData = data.model_dump(exclude_unset=True)
    if updateData:
        await repo.updateProduct(db, productId, updateData)

    return {"message": "商品更新成功", "success": True}


# ========== 商品类型管理 ==========

@router.get("/product-types")
async def listProductTypes(
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取所有商品类型"""
    types = await repo.getAllProductTypes(db)
    return [
        {
            "id": t["id"],
            "slug": t["slug"],
            "name": t["name"],
            "autoDeliver": bool(t["auto_deliver"]),
            "sortOrder": t["sort_order"],
        }
        for t in types
    ]


@router.post("/product-types", response_model=MessageResponse)
async def createProductType(
    data: dict,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """创建商品类型"""
    if not data.get("slug") or not data.get("name"):
        raise HTTPException(status_code=400, detail="slug 和 name 为必填")

    # 检查 slug 是否已存在
    existing = await repo.getProductTypeBySlug(db, data["slug"])
    if existing:
        raise HTTPException(status_code=400, detail=f"slug '{data['slug']}' 已存在")

    typeId = await repo.createProductType(db, data)
    return {"message": f"商品类型创建成功，ID: {typeId}", "success": True}


@router.put("/product-types/{typeId}", response_model=MessageResponse)
async def updateProductType(
    typeId: int, data: dict,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """更新商品类型"""
    await repo.updateProductType(db, typeId, data)
    return {"message": "商品类型更新成功", "success": True}


@router.delete("/product-types/{typeId}", response_model=MessageResponse)
async def deleteProductType(
    typeId: int,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """删除商品类型"""
    try:
        result = await repo.deleteProductType(db, typeId)
        if not result:
            raise HTTPException(status_code=404, detail="类型不存在")
        return {"message": "商品类型已删除", "success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ========== 库存管理 ==========

@router.post("/cards/import", response_model=MessageResponse)
async def importCards(
    data: CardImport,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """批量导入交付内容（文本类型）"""
    # 验证商品存在
    product = await repo.getProductById(db, data.productId)
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    count = await repo.importCards(db, data.productId, data.cards, "text")

    # 同时释放已过隔离期的卡密
    released = await repo.releaseQuarantinedCards(db)

    return {
        "message": f"成功导入 {count} 条交付内容。另有 {released} 条已过隔离期并上架。",
        "success": True
    }


@router.post("/cards/import-delivery", response_model=MessageResponse)
async def importDeliveryItem(
    data: dict,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """导入单条交付内容（支持文本+文件任意组合）"""
    productId = data.get("productId")
    content = data.get("content", "")
    fileUrl = data.get("fileUrl", "")
    if not productId:
        raise HTTPException(status_code=400, detail="productId 为必填")
    if not content and not fileUrl:
        raise HTTPException(status_code=400, detail="文本内容和文件至少填一个")

    product = await repo.getProductById(db, productId)
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    cardId = await repo.importDeliveryItem(db, productId, content, fileUrl)
    await repo.releaseQuarantinedCards(db)

    return {
        "message": f"交付内容已导入（ID: {cardId}）",
        "success": True
    }


@router.get("/cards")
async def listCards(
    productId: int | None = Query(None, description="按商品筛选"),
    status: str | None = Query(None, description="按状态筛选"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取卡密列表"""
    # 每次查询时自动释放过期隔离
    await repo.releaseQuarantinedCards(db)

    items, total = await repo.getCards(db, productId, status, page, pageSize)
    return {
        "items": [_formatCard(c) for c in items],
        "total": total,
        "page": page,
        "pageSize": pageSize
    }


# ========== 订单管理 ==========

@router.get("/orders")
async def listOrders(
    status: str | None = Query(None, description="按状态筛选"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取订单列表"""
    items, total = await repo.getOrders(db, status, page, pageSize)
    return {
        "items": [_formatOrder(o) for o in items],
        "total": total,
        "page": page,
        "pageSize": pageSize
    }


# ========== 售后管理 ==========

@router.get("/warranty-claims")
async def listWarrantyClaims(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取质保换新记录"""
    items, total = await repo.getWarrantyClaims(db, page, pageSize)
    return {
        "items": [_formatWarrantyClaim(wc) for wc in items],
        "total": total,
        "page": page,
        "pageSize": pageSize
    }


# ========== 预约管理 ==========

@router.get("/bookings")
async def listBookings(
    status: str | None = Query(None, description="按状态筛选"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """获取预约列表"""
    items, total = await repo.getBookings(db, status, page, pageSize)
    return {
        "items": [_formatBooking(b) for b in items],
        "total": total,
        "page": page,
        "pageSize": pageSize
    }


@router.put("/bookings/{bookingId}", response_model=MessageResponse)
async def updateBooking(
    bookingId: int, data: BookingUpdate,
    admin: dict = Depends(getCurrentAdmin),
    db: aiosqlite.Connection = Depends(getDb)
):
    """更新预约状态和备注"""
    existing = await repo.getBookingById(db, bookingId)
    if not existing:
        raise HTTPException(status_code=404, detail="预约不存在")

    updateData = data.model_dump(exclude_unset=True)
    if updateData:
        await repo.updateBooking(db, bookingId, updateData)

    return {"message": "预约更新成功", "success": True}


# ========== 辅助函数 ==========

def _formatProduct(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["name"],
        "description": p["description"],
        "price": p["price"],
        "originalPrice": p.get("original_price"),
        "imageUrl": p.get("image_url", ""),
        "isActive": bool(p.get("is_active", 1)),
        "warrantyDays": p.get("warranty_days", 7),
        "warrantyTimes": p.get("warranty_times", 1),
        "createdAt": p.get("created_at"),
        "stockCount": p.get("stock_count", 0)
    }


def _formatCard(c: dict) -> dict:
    return {
        "id": c["id"],
        "productId": c["product_id"],
        "content": c["content"],
        "contentType": c.get("content_type", "text"),
        "fileUrl": c.get("file_url", ""),
        "status": c["status"],
        "quarantineUntil": c.get("quarantine_until"),
        "createdAt": c.get("created_at"),
        "soldAt": c.get("sold_at")
    }


def _formatOrder(o: dict) -> dict:
    return {
        "id": o["id"],
        "orderNo": o["order_no"],
        "productId": o["product_id"],
        "productName": o.get("product_name", ""),
        "cardId": o.get("card_id"),
        "buyerEmail": o["buyer_email"],
        "amount": o["amount"],
        "status": o["status"],
        "paymentMethod": o.get("payment_method", ""),
        "deliveredAt": o.get("delivered_at"),
        "warrantyExpiresAt": o.get("warranty_expires_at"),
        "warrantyUsed": bool(o.get("warranty_used", 0)),
        "createdAt": o.get("created_at")
    }


def _formatWarrantyClaim(wc: dict) -> dict:
    return {
        "id": wc["id"],
        "orderId": wc["order_id"],
        "orderNo": wc.get("order_no", ""),
        "oldCardId": wc["old_card_id"],
        "newCardId": wc["new_card_id"],
        "newCardContent": wc.get("new_card_content", ""),
        "reason": wc.get("reason", ""),
        "createdAt": wc.get("created_at")
    }


def _formatBooking(b: dict) -> dict:
    """将数据库预约格式转为 API 响应格式"""
    return {
        "id": b["id"],
        "name": b["name"],
        "contact": b["contact"],
        "serviceType": b["service_type"],
        "description": b.get("description", ""),
        "preferredTime": b.get("preferred_time", ""),
        "status": b["status"],
        "adminNote": b.get("admin_note", ""),
        "createdAt": b.get("created_at")
    }
