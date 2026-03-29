"""
文件上传模块
提供管理后台图片上传和交付文件上传 API
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

# 允许的图片类型
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
# 允许的交付文件类型
FILE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".zip", ".rar", ".7z", ".txt", ".csv", ".md",
    ".mp3", ".mp4", ".wav",
    ".jpg", ".jpeg", ".png", ".webp", ".gif",
}
# 最大图片大小（5MB）
MAX_IMAGE_SIZE = 5 * 1024 * 1024
# 最大交付文件大小（50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024


def _saveUpload(content: bytes, ext: str, subdir: str = "") -> dict:
    """通用文件保存逻辑"""
    targetDir = os.path.join(UPLOAD_DIR, subdir) if subdir else UPLOAD_DIR
    os.makedirs(targetDir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(targetDir, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    urlPath = f"/uploads/{subdir}/{filename}" if subdir else f"/uploads/{filename}"
    return {"url": urlPath, "filename": filename, "size": len(content)}


@router.post("/upload")
async def uploadImage(file: UploadFile = File(...)):
    """
    上传图片文件（商品封面等）
    返回可访问的图片 URL
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，允许: {', '.join(IMAGE_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大允许 {MAX_IMAGE_SIZE // 1024 // 1024}MB"
        )

    result = _saveUpload(content, ext)
    logger.info(f"图片上传成功: {result['filename']} ({result['size']} bytes)")
    return result


@router.post("/upload-file")
async def uploadDeliveryFile(file: UploadFile = File(...)):
    """
    上传交付文件（文档、资料等）
    文件保存到 /uploads/files/ 子目录
    返回文件 URL 和原始文件名
    """
    originalName = file.filename or "unknown"
    ext = os.path.splitext(originalName)[1].lower()
    if ext not in FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，允许: {', '.join(sorted(FILE_EXTENSIONS))}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大允许 {MAX_FILE_SIZE // 1024 // 1024}MB"
        )

    result = _saveUpload(content, ext, subdir="files")
    # 保留原始文件名，前端展示用
    result["originalName"] = originalName
    logger.info(f"交付文件上传成功: {originalName} -> {result['filename']} ({result['size']} bytes)")
    return result
