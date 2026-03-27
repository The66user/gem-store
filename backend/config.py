"""
应用配置模块
所有敏感信息从环境变量中读取，确保安全性
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """全局配置项，从环境变量或 .env 文件加载"""

    # 应用基础配置
    APP_NAME: str = "The66Shop"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./gemstore.db"

    # JWT 认证配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 小时

    # 默认管理员账号（首次启动自动创建）
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")

    # 虎皮椒支付配置
    XUNHU_APP_ID: str = os.getenv("XUNHU_APP_ID", "")
    XUNHU_APP_SECRET: str = os.getenv("XUNHU_APP_SECRET", "")
    XUNHU_API_URL: str = os.getenv(
        "XUNHU_API_URL", "https://api.xunhupay.com/payment/do.html"
    )
    XUNHU_QUERY_URL: str = os.getenv(
        "XUNHU_QUERY_URL", "https://api.xunhupay.com/payment/query.html"
    )

    # 站点地址（用于拼接回调 URL）
    SITE_URL: str = os.getenv("SITE_URL", "http://localhost:8001")

    # 邮件 SMTP 配置
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = "The66Shop"

    # 库存隔离配置
    QUARANTINE_HOURS: int = 0  # 无隔离期，导入即可售

    # 质保默认配置
    DEFAULT_WARRANTY_DAYS: int = 7
    DEFAULT_WARRANTY_TIMES: int = 1

    # CORS 配置
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://the66key.com",
        "https://www.the66key.com"
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
