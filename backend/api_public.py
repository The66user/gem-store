"""
API 路由 — 公开接口
商品展示、下单、支付回调、订单查询、质保换新
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse, RedirectResponse
import logging
import aiosqlite
from database import getDb
from schemas import (
    OrderCreate, OrderResponse, WarrantyClaimRequest,
    ProductResponse, MessageResponse
)
import repositories as repo
import services
import payment
import schemas
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["公开接口"])


# ========== 商品类型 ==========

@router.get("/product-types")
async def listProductTypes(db: aiosqlite.Connection = Depends(getDb)):
    """获取所有商品类型（公开，前端展示用）"""
    types = await repo.getAllProductTypes(db)
    return [
        {
            "slug": t["slug"],
            "name": t["name"],
            "autoDeliver": bool(t["auto_deliver"]),
        }
        for t in types
    ]


# ========== 商品 ==========

@router.get("/products", response_model=list[ProductResponse])
async def listProducts(db: aiosqlite.Connection = Depends(getDb)):
    """获取所有上架商品"""
    products = await repo.getActiveProducts(db)
    return [_formatProduct(p) for p in products]


@router.get("/products/{productId}", response_model=ProductResponse)
async def getProduct(productId: int, db: aiosqlite.Connection = Depends(getDb)):
    """获取商品详情"""
    product = await repo.getProductById(db, productId)
    if not product or not product["is_active"]:
        raise HTTPException(status_code=404, detail="商品不存在")
    return _formatProduct(product)


# ========== 订单 ==========

@router.post("/orders")
async def createOrder(data: OrderCreate, db: aiosqlite.Connection = Depends(getDb)):
    """
    创建订单并生成支付链接
    - 有虎皮椒配置时：调用虎皮椒 API 返回真实支付链接
    - 未配置时：返回 mock 支付链接（本地测试用）
    """
    try:
        result = await services.createOrder(
            db, data.productId, data.buyerEmail, data.paymentMethod
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 调用虎皮椒创建支付订单
    try:
        payResult = await payment.createPaymentUrl(
            orderNo=result["orderNo"],
            amount=result["amount"],
            title=result["productName"]
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "success": True,
        "orderNo": result["orderNo"],
        "amount": result["amount"],
        "productName": result["productName"],
        "payUrl": payResult["payUrl"],
        "qrcodeUrl": payResult.get("qrcodeUrl", ""),
        "isMock": payResult.get("isMock", False),
        "message": "订单创建成功，请完成支付"
    }


@router.post("/orders/{orderNo}/mock-pay")
async def mockPay(orderNo: str, db: aiosqlite.Connection = Depends(getDb)):
    """
    模拟支付（仅本地测试使用）
    生产环境应使用虎皮椒回调接口
    """
    result = await services.processPayment(db, orderNo, paymentId="MOCK_PAY")
    if not result:
        raise HTTPException(status_code=400, detail="支付处理失败，订单不存在或库存不足")

    # 发送邮件通知
    if "cardContent" in result:
        await services.sendDeliveryEmail(
            result["buyerEmail"], result["orderNo"],
            result["cardContent"], result["productName"]
        )

    return {
        "success": True,
        "message": "支付成功，卡密已发送",
        "orderNo": result.get("orderNo", orderNo)
    }


# ========== 支付回调 ==========

@router.post("/payment/notify")
async def paymentNotify(request: Request, db: aiosqlite.Connection = Depends(getDb)):
    """
    虎皮椒异步回调通知
    虎皮椒在用户支付成功后 POST 此接口
    验签成功后自动发卡
    """
    formData = await request.form()
    params = dict(formData)

    logger.info(f"[支付回调] 收到回调: {params}")

    # 验证签名
    if not payment.verifyCallbackSign(dict(params), settings.XUNHU_APP_SECRET):
        logger.warning("[支付回调] 签名验证失败")
        return PlainTextResponse("FAIL", status_code=400)

    # 检查支付状态（虎皮椒回调中 status=OD 表示支付成功）
    status = params.get("status", "")
    if status != "OD":
        logger.info(f"[支付回调] 订单状态非成功: status={status}")
        return PlainTextResponse("success")

    # 获取订单号（虎皮椒使用 trade_order_id 传回商户订单号）
    orderNo = params.get("trade_order_id", "")
    paymentId = params.get("transaction_id", params.get("open_order_id", ""))

    if not orderNo:
        logger.warning("[支付回调] 缺少 trade_order_id")
        return PlainTextResponse("FAIL", status_code=400)

    # 处理发卡
    result = await services.processPayment(db, orderNo, paymentId=paymentId)
    if result and "cardContent" in result:
        await services.sendDeliveryEmail(
            result["buyerEmail"], result["orderNo"],
            result["cardContent"], result["productName"]
        )
        logger.info(f"[支付回调] 自动发卡成功: orderNo={orderNo}")

    # 虎皮椒要求返回 "success" 表示处理成功
    return PlainTextResponse("success")


@router.get("/payment/return")
async def paymentReturn(order_no: str = ""):
    """
    支付成功后的前端跳转
    虎皮椒会把用户重定向到这个 URL
    我们再重定向到前端的订单结果页面
    """
    # NOTE: 前端部署后的地址，需要根据实际情况调整
    frontendUrl = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:5173"
    return RedirectResponse(
        url=f"{frontendUrl}/order?orderNo={order_no}",
        status_code=302
    )


@router.get("/orders/{orderNo}/payment-status")
async def checkPaymentStatus(orderNo: str, db: aiosqlite.Connection = Depends(getDb)):
    """
    前端轮询接口 — 检查订单支付状态
    用于前端在用户扫码后轮询等待支付完成
    """
    order = await repo.getOrderByNo(db, orderNo)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    return {
        "orderNo": orderNo,
        "status": order["status"],
        "paid": order["status"] != "pending"
    }


# ========== 订单查询 ==========

@router.get("/orders")
async def queryOrdersByEmail(email: str, db: aiosqlite.Connection = Depends(getDb)):
    """
    根据邮箱查询所有关联订单
    前端通过 GET /api/orders?email=xxx 调用
    """
    if not email or '@' not in email:
        raise HTTPException(status_code=400, detail="请输入有效的邮箱地址")

    orders = await repo.getOrdersByEmail(db, email)
    return [_formatOrder(o) for o in orders]


@router.get("/orders/{orderNo}", response_model=OrderResponse)
async def queryOrder(orderNo: str, db: aiosqlite.Connection = Depends(getDb)):
    """根据订单号查询订单"""
    order = await repo.getOrderByNo(db, orderNo)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _formatOrder(order)


# ========== 质保 ==========

@router.post("/warranty/{orderNo}")
async def claimWarranty(orderNo: str, data: WarrantyClaimRequest,
                        db: aiosqlite.Connection = Depends(getDb)):
    """申请质保换新"""
    try:
        result = await services.processWarrantyClaim(db, orderNo, data.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 发送换新通知邮件
    await services.sendDeliveryEmail(
        result["buyerEmail"], result["orderNo"],
        result["newCardContent"], "质保换新"
    )

    return {
        "success": True,
        "message": "换新成功，新卡密已发送至您的邮箱",
        "orderNo": result["orderNo"]
    }


# ========== 服务预约 ==========

@router.post("/bookings")
async def submitBooking(data: schemas.BookingCreate,
                        db: aiosqlite.Connection = Depends(getDb)):
    """提交服务预约"""
    try:
        result = await services.submitBooking(db, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "success": True,
        "bookingId": result["bookingId"],
        "message": result["message"]
    }


# ========== 辅助函数 ==========

def _formatProduct(p: dict) -> dict:
    """将数据库字段格式转为 API 响应格式"""
    return {
        "id": p["id"],
        "name": p["name"],
        "description": p["description"],
        "detailDescription": p.get("detail_description", ""),
        "price": p["price"],
        "originalPrice": p.get("original_price"),
        "imageUrl": p.get("image_url", ""),
        "productType": p.get("product_type", "digital"),
        "isActive": bool(p.get("is_active", 1)),
        "warrantyDays": p.get("warranty_days", 7),
        "warrantyTimes": p.get("warranty_times", 1),
        "createdAt": p.get("created_at"),
        "stockCount": p.get("stock_count", 0)
    }


def _formatOrder(o: dict) -> dict:
    """将数据库订单格式转为 API 响应格式"""
    return {
        "id": o["id"],
        "orderNo": o["order_no"],
        "productId": o["product_id"],
        "productName": o.get("product_name", ""),
        "cardId": o.get("card_id"),
        "cardContent": o.get("card_content"),
        "buyerEmail": o["buyer_email"],
        "amount": o["amount"],
        "status": o["status"],
        "paymentMethod": o.get("payment_method", ""),
        "deliveredAt": o.get("delivered_at"),
        "warrantyExpiresAt": o.get("warranty_expires_at"),
        "warrantyUsed": bool(o.get("warranty_used", 0)),
        "createdAt": o.get("created_at")
    }
