"""
Pydantic 模型定义
用于请求/响应的数据校验和序列化
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ========== 商品 ==========

class ProductBase(BaseModel):
    """商品基础字段"""
    name: str = Field(..., min_length=1, max_length=200, description="商品名称")
    description: str = Field("", description="商品描述（Markdown）")
    price: float = Field(..., gt=0, description="售价（CNY）")
    originalPrice: Optional[float] = Field(None, ge=0, description="原价（划线价）")
    imageUrl: str = Field("", description="商品图片 URL")
    warrantyDays: int = Field(7, ge=0, description="质保天数")
    warrantyTimes: int = Field(1, ge=0, description="最大换新次数")


class ProductCreate(ProductBase):
    """创建商品请求"""
    pass


class ProductUpdate(BaseModel):
    """更新商品请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    originalPrice: Optional[float] = Field(None, ge=0)
    imageUrl: Optional[str] = None
    isActive: Optional[bool] = None
    warrantyDays: Optional[int] = Field(None, ge=0)
    warrantyTimes: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    """商品响应"""
    id: int
    name: str
    description: str
    price: float
    originalPrice: Optional[float] = None
    imageUrl: str = ""
    isActive: bool = True
    warrantyDays: int = 7
    warrantyTimes: int = 1
    createdAt: Optional[str] = None
    # 附加信息
    stockCount: int = 0


# ========== 卡密 ==========

class CardImport(BaseModel):
    """批量导入卡密请求"""
    productId: int = Field(..., description="关联商品 ID")
    cards: list[str] = Field(..., min_length=1, description="卡密内容列表，每项格式为 email:password:recovery")


class CardResponse(BaseModel):
    """卡密响应（管理端）"""
    id: int
    productId: int
    content: str
    status: str
    quarantineUntil: Optional[str] = None
    createdAt: Optional[str] = None
    soldAt: Optional[str] = None


# ========== 订单 ==========

class OrderCreate(BaseModel):
    """创建订单请求"""
    productId: int = Field(..., description="商品 ID")
    buyerEmail: EmailStr = Field(..., description="买家邮箱")
    paymentMethod: str = Field("alipay", description="支付方式：alipay / wechat")


class OrderResponse(BaseModel):
    """订单响应"""
    id: int
    orderNo: str
    productId: int
    productName: str = ""
    cardId: Optional[int] = None
    cardContent: Optional[str] = None
    buyerEmail: str
    amount: float
    status: str
    paymentMethod: str = ""
    deliveredAt: Optional[str] = None
    warrantyExpiresAt: Optional[str] = None
    warrantyUsed: bool = False
    createdAt: Optional[str] = None


class PaymentNotify(BaseModel):
    """支付回调通知（虎皮椒格式）"""
    tradeOrderId: str = Field("", description="支付平台订单号")
    totalFee: str = Field("", description="支付金额")
    tradeNo: str = Field("", description="商户订单号（对应 order_no）")
    status: str = Field("", description="支付状态")
    sign: str = Field("", description="签名")


# ========== 质保 ==========

class WarrantyClaimRequest(BaseModel):
    """质保换新请求"""
    reason: str = Field("", max_length=500, description="换新原因")


class WarrantyClaimResponse(BaseModel):
    """质保换新记录"""
    id: int
    orderId: int
    orderNo: str = ""
    oldCardId: int
    newCardId: int
    newCardContent: str = ""
    reason: str = ""
    createdAt: Optional[str] = None


# ========== 管理员 ==========

class AdminLogin(BaseModel):
    """管理员登录请求"""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminToken(BaseModel):
    """登录成功返回 Token"""
    accessToken: str
    tokenType: str = "bearer"


class DashboardData(BaseModel):
    """仪表盘数据"""
    totalRevenue: float = 0
    todayRevenue: float = 0
    totalOrders: int = 0
    todayOrders: int = 0
    totalCards: int = 0
    availableCards: int = 0
    quarantineCards: int = 0
    soldCards: int = 0
    warrantyClaimsCount: int = 0


# ========== 服务预约 ==========

class BookingCreate(BaseModel):
    """创建服务预约请求"""
    name: str = Field(..., min_length=1, max_length=50, description="预约人姓名")
    contact: str = Field(..., min_length=1, max_length=100, description="联系方式（微信/手机/邮箱）")
    serviceType: str = Field(..., min_length=1, max_length=100, description="服务类型")
    description: str = Field("", max_length=1000, description="需求描述")
    preferredTime: str = Field("", max_length=100, description="期望服务时间")


class BookingResponse(BaseModel):
    """服务预约响应"""
    id: int
    name: str
    contact: str
    serviceType: str
    description: str = ""
    preferredTime: str = ""
    status: str = "pending"
    adminNote: str = ""
    createdAt: Optional[str] = None


class BookingUpdate(BaseModel):
    """管理员更新预约"""
    status: Optional[str] = Field(None, description="pending/confirmed/completed/cancelled")
    adminNote: Optional[str] = Field(None, max_length=500, description="管理员备注")


# ========== 通用 ==========

class PaginatedResponse(BaseModel):
    """分页响应"""
    items: list = []
    total: int = 0
    page: int = 1
    pageSize: int = 20


class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    success: bool = True
