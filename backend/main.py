"""
The66Shop 后端主入口
数字服务商店 - FastAPI 应用
"""
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import settings
from database import initDb, getDb, DATABASE_PATH
from api_public import router as publicRouter
from api_admin import router as adminRouter
from upload import router as uploadRouter
import repositories as repo
import aiosqlite

# NOTE: 订单超时时间（分钟），与前端倒计时保持一致
ORDER_TIMEOUT_MINUTES = 30
# NOTE: 定时清理间隔（秒）
CLEANUP_INTERVAL_SECONDS = 5 * 60


async def _cleanupLoop():
    """后台定时任务：每隔 5 分钟清理超时未支付的订单"""
    while True:
        try:
            db = await aiosqlite.connect("./gemstore.db")
            db.row_factory = aiosqlite.Row
            try:
                cancelled = await repo.cancelExpiredOrders(db, timeoutMinutes=ORDER_TIMEOUT_MINUTES)
                if cancelled > 0:
                    print(f"[定时清理] 已取消 {cancelled} 个超时未付订单")
            finally:
                await db.close()
        except Exception as e:
            print(f"[定时清理] 出错: {e}")
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库，启动后台清理任务"""
    await initDb()

    # 启动时先清理一次
    db = await aiosqlite.connect("./gemstore.db")
    db.row_factory = aiosqlite.Row
    try:
        cancelled = await repo.cancelExpiredOrders(db, timeoutMinutes=ORDER_TIMEOUT_MINUTES)
        if cancelled > 0:
            print(f"[启动清理] 已取消 {cancelled} 个超时未付订单")
    finally:
        await db.close()

    # 启动后台定时清理任务
    cleanupTask = asyncio.create_task(_cleanupLoop())

    print(f"\n🚀 {settings.APP_NAME} v{settings.APP_VERSION} 已启动")
    print(f"📋 API 文档: http://localhost:8001/docs\n")
    yield
    # 关闭时取消后台任务
    cleanupTask.cancel()
    print(f"\n👋 {settings.APP_NAME} 已关闭")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="自动发卡平台 API",
    lifespan=lifespan
)

# CORS 配置，仅允许白名单域名跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(publicRouter)
app.include_router(adminRouter)
app.include_router(uploadRouter)

# 挂载上传文件静态目录
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/", tags=["健康检查"])
async def root():
    """根路径健康检查"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
