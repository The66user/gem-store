"""
虎皮椒（xunhupay）支付服务模块
职责：创建支付订单、验证回调签名、查询支付状态
"""
import hashlib
import time
import uuid
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)


def _generateSign(params: dict, appSecret: str) -> str:
    """
    生成虎皮椒签名
    算法：参数按 key 升序排列 → 拼接 key=value → 末尾加 AppSecret → MD5
    """
    # 过滤空值并移除 hash/sign 字段
    filtered = {
        k: v for k, v in params.items()
        if v not in (None, "") and k not in ("hash", "sign")
    }
    sortedItems = sorted(filtered.items())
    signStr = "&".join(f"{k}={v}" for k, v in sortedItems)
    signStr += appSecret
    return hashlib.md5(signStr.encode("utf-8")).hexdigest()


def verifyCallbackSign(params: dict, appSecret: str) -> bool:
    """
    验证虎皮椒回调签名
    回调参数中 hash 字段为签名值
    """
    receivedHash = params.get("hash", "")
    if not receivedHash:
        return False

    expectedHash = _generateSign(params, appSecret)
    return receivedHash == expectedHash


async def createPaymentUrl(
    orderNo: str, amount: float, title: str
) -> dict:
    """
    调用虎皮椒 API 创建支付订单

    返回:
        {
            "payUrl": "收银台跳转链接",
            "qrcodeUrl": "二维码图片链接（PC 端扫码用）"
        }
    """
    if not settings.XUNHU_APP_ID or not settings.XUNHU_APP_SECRET:
        # 未配置支付密钥，返回 mock 支付链接
        logger.warning("虎皮椒未配置，使用 mock 支付模式")
        return {
            "payUrl": f"/api/orders/{orderNo}/mock-pay",
            "qrcodeUrl": "",
            "isMock": True
        }

    # 构建请求参数
    notifyUrl = f"{settings.SITE_URL}/api/payment/notify"
    returnUrl = f"{settings.SITE_URL}/api/payment/return?order_no={orderNo}"

    params = {
        "version": "1.1",
        "appid": settings.XUNHU_APP_ID,
        "trade_order_id": orderNo,
        "total_fee": str(amount),
        "title": title,
        "time": str(int(time.time())),
        "notify_url": notifyUrl,
        "return_url": returnUrl,
        "nonce_str": uuid.uuid4().hex[:16],
        # NOTE: wechat_type 不传则默认 PC 扫码
    }

    # 生成签名
    params["hash"] = _generateSign(params, settings.XUNHU_APP_SECRET)

    logger.info(f"[支付] 创建支付订单: orderNo={orderNo}, amount={amount}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                settings.XUNHU_API_URL, data=params
            )
            result = response.json()

        if result.get("errcode") == 0:
            return {
                "payUrl": result.get("url", ""),
                "qrcodeUrl": result.get("url_qrcode", ""),
                "isMock": False
            }
        else:
            errMsg = result.get("errmsg", "未知错误")
            logger.error(f"[支付] 虎皮椒返回错误: {errMsg}")
            raise ValueError(f"支付创建失败: {errMsg}")

    except httpx.RequestError as e:
        logger.error(f"[支付] 请求虎皮椒 API 失败: {e}")
        raise ValueError(f"支付服务暂时不可用，请稍后重试")


async def queryPaymentStatus(tradeOrderId: str) -> dict | None:
    """
    主动查询虎皮椒订单支付状态

    返回:
        {"status": "OD" | "WP" | ..., ...} 或 None
        OD = 已支付, WP = 待支付
    """
    if not settings.XUNHU_APP_ID or not settings.XUNHU_APP_SECRET:
        return None

    params = {
        "appid": settings.XUNHU_APP_ID,
        "out_trade_order": tradeOrderId,
        "time": str(int(time.time())),
        "nonce_str": uuid.uuid4().hex[:16],
    }
    params["hash"] = _generateSign(params, settings.XUNHU_APP_SECRET)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.XUNHU_QUERY_URL, data=params
            )
            result = response.json()

        if result.get("errcode") == 0:
            return result
        else:
            logger.warning(
                f"[支付查询] 查询失败: {result.get('errmsg', '未知')}"
            )
            return None

    except httpx.RequestError as e:
        logger.error(f"[支付查询] 请求失败: {e}")
        return None
