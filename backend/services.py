"""
业务逻辑层（Service）
处理核心业务规则：自动发卡、质保换新、支付验签等
"""
import uuid
import hashlib
import aiosqlite
from datetime import datetime
from config import settings
import repositories as repo


def generateOrderNo() -> str:
    """
    生成唯一订单号
    格式：GS + 时间戳后8位 + 随机4位，共14位
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    randomPart = uuid.uuid4().hex[:6].upper()
    return f"GS{timestamp}{randomPart}"


async def createOrder(db: aiosqlite.Connection, productId: int,
                      buyerEmail: str, paymentMethod: str) -> dict:
    """
    创建订单的完整业务流程：
    1. 验证商品是否存在且上架
    2. 检查库存是否充足
    3. 生成唯一订单号
    4. 创建订单记录
    """
    product = await repo.getProductById(db, productId)
    if not product:
        raise ValueError("商品不存在")
    if not product["is_active"]:
        raise ValueError("商品已下架")

    # 检查可用库存
    availableCard = await repo.getAvailableCard(db, productId)
    if not availableCard:
        raise ValueError("该商品暂时缺货，请稍后再试")

    orderNo = generateOrderNo()
    orderData = {
        "orderNo": orderNo,
        "productId": productId,
        "buyerEmail": buyerEmail,
        "amount": product["price"],
        "paymentMethod": paymentMethod
    }
    orderId = await repo.createOrder(db, orderData)

    return {
        "orderId": orderId,
        "orderNo": orderNo,
        "amount": product["price"],
        "productName": product["name"]
    }


async def processPayment(db: aiosqlite.Connection, orderNo: str,
                          paymentId: str = "") -> dict | None:
    """
    支付成功后的发卡流程：
    1. 查找订单
    2. 获取可用卡密
    3. 标记卡密为已售
    4. 更新订单状态为已发货
    5. 返回卡密内容用于通知买家
    """
    order = await repo.getOrderByNo(db, orderNo)
    if not order:
        return None
    if order["status"] != "pending":
        # 避免重复处理，返回已有信息
        return order

    product = await repo.getProductById(db, order["product_id"])
    if not product:
        return None

    # 分配卡密
    card = await repo.getAvailableCard(db, order["product_id"])
    if not card:
        # NOTE: 理论上下单时已检查库存，此处属于极端并发场景
        return None

    # 标记卡密为已售
    await repo.markCardSold(db, card["id"])

    # 更新订单
    await repo.updateOrderPaid(
        db, orderNo, paymentId, card["id"], product["warranty_days"]
    )

    # 返回发卡信息
    return {
        "orderNo": orderNo,
        "cardContent": card["content"],
        "buyerEmail": order["buyer_email"],
        "productName": product["name"],
        "warrantyDays": product["warranty_days"]
    }


async def processWarrantyClaim(db: aiosqlite.Connection, orderNo: str,
                                reason: str) -> dict:
    """
    质保换新的完整业务流程：
    1. 验证订单存在且已发货
    2. 检查是否在质保期内
    3. 检查是否已用过换新机会
    4. 获取新的可用卡密
    5. 将旧卡密标记为已换新
    6. 分配新卡密
    7. 创建换新记录
    """
    order = await repo.getOrderByNo(db, orderNo)
    if not order:
        raise ValueError("订单不存在")

    if order["status"] not in ("delivered", "warranty_claimed"):
        raise ValueError("该订单状态不支持质保换新")

    if order["warranty_used"]:
        raise ValueError("该订单已使用过换新机会（每单限一次）")

    # 检查质保是否过期
    if order["warranty_expires_at"]:
        expiryTime = datetime.fromisoformat(order["warranty_expires_at"])
        if datetime.utcnow() > expiryTime:
            raise ValueError("质保期已过，无法换新")

    # 获取新的可用卡密
    newCard = await repo.getAvailableCard(db, order["product_id"])
    if not newCard:
        raise ValueError("暂无可用库存进行换新，请联系客服")

    oldCardId = order["card_id"]

    # 将旧卡密标记为已换新
    await repo.markCardReplaced(db, oldCardId)

    # 标记新卡密为已售
    await repo.markCardSold(db, newCard["id"])

    # 更新订单
    await repo.updateOrderWarranty(db, orderNo, newCard["id"])

    # 创建换新记录
    await repo.createWarrantyClaim(db, {
        "orderId": order["id"],
        "oldCardId": oldCardId,
        "newCardId": newCard["id"],
        "reason": reason
    })

    return {
        "orderNo": orderNo,
        "newCardContent": newCard["content"],
        "buyerEmail": order["buyer_email"]
    }


# NOTE: 验签逻辑已迁移到 payment.py 模块


async def sendDeliveryEmail(buyerEmail: str, orderNo: str,
                            cardContent: str, productName: str):
    """
    发送自动发卡通知邮件
    如果 SMTP 未配置，则在控制台打印代替
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"\n{'='*50}")
        print(f"[发卡通知] 订单号: {orderNo}")
        print(f"[发卡通知] 买家邮箱: {buyerEmail}")
        print(f"[发卡通知] 商品: {productName}")
        print(f"[发卡通知] 卡密内容: {cardContent}")
        print(f"{'='*50}\n")
        return

    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = buyerEmail
        msg["Subject"] = f"您的订单 {orderNo} 已发货 - {settings.APP_NAME}"

        htmlContent = f"""
        <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',sans-serif;background:#ffffff;color:#333;padding:30px;border-radius:12px;border:1px solid #eee;">
            <h1 style="color:#6c5ce7;text-align:center;font-size:22px;">🎉 订单发货成功</h1>
            <hr style="border-color:#eee;">
            <p><strong>订单号：</strong>{orderNo}</p>
            <p><strong>商品：</strong>{productName}</p>
            <div style="background:#f8f7ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #6c5ce7;">
                <p style="margin:0;font-size:14px;color:#888;">您的账号信息：</p>
                <p style="margin:10px 0;font-size:16px;color:#6c5ce7;word-break:break-all;"><code>{cardContent}</code></p>
            </div>
            <p>⚠️ 请及时修改密码并妥善保管账号信息。</p>
            <p>📋 本订单享有 <strong>7 天质保</strong>，期间如遇权益被撤销可免费换新一次。</p>
            <hr style="border-color:#eee;">
            <p style="color:#999;font-size:12px;text-align:center;">此邮件由 {settings.APP_NAME} 系统自动发送</p>
        </div>
        """
        msg.attach(MIMEText(htmlContent, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True
        )
        print(f"[邮件] 发卡通知已发送至 {buyerEmail}")
    except Exception as e:
        print(f"[邮件错误] 发送失败: {e}")
        # 邮件发送失败不应阻断发卡流程


async def submitBooking(db: aiosqlite.Connection, data: dict) -> dict:
    """
    创建服务预约的业务逻辑
    校验数据后创建预约记录
    """
    # 校验服务类型是否在支持列表中
    validServiceTypes = [
        "AI 工具咨询", "PPT 定制", "代码开发", "技术支持",
        "数字会员服务", "其他服务"
    ]
    if data.get("serviceType") not in validServiceTypes:
        raise ValueError(f"不支持的服务类型，请选择：{', '.join(validServiceTypes)}")

    bookingId = await repo.createBooking(db, data)
    return {
        "bookingId": bookingId,
        "message": "预约提交成功，我们会尽快与您联系"
    }

