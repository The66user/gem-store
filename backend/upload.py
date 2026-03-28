"""
图片上传模块
提供管理后台图片上传 API
"""
import os
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from database import getDb

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["管理-上传"])

# 上传目录（生产环境为 /opt/gemstore/uploads）
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
# 允许的文件类型
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
# 最大文件大小（5MB）
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload")
async def uploadImage(file: UploadFile = File(...)):
    """
    上传图片文件
    返回可访问的图片 URL
    """
    # 校验文件类型
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，允许: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 读取文件内容并校验大小
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大允许 {MAX_FILE_SIZE // 1024 // 1024}MB"
        )

    # 确保上传目录存在
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 生成唯一文件名
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # 写入磁盘
    with open(filepath, "wb") as f:
        f.write(content)

    logger.info(f"图片上传成功: {filename} ({len(content)} bytes)")

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "size": len(content),
    }
