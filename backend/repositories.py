"""
数据访问层（Repository）
封装所有数据库操作，业务逻辑层不直接操作数据库
"""
import aiosqlite
from datetime import datetime, timedelta
from config import settings


# ========== 商品 Repository ==========

async def getActiveProducts(db: aiosqlite.Connection) -> list[dict]:
    """获取所有上架商品（含可用库存数量）"""
    cursor = await db.execute("""
        SELECT p.*,
            (SELECT COUNT(*) FROM cards c
             WHERE c.product_id = p.id AND c.status = 'available') as stock_count
        FROM products p
        WHERE p.is_active = 1
        ORDER BY p.created_at DESC
    """)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def getAllProducts(db: aiosqlite.Connection) -> list[dict]:
    """获取所有商品（管理端用，含库存统计）"""
    cursor = await db.execute("""
        SELECT p.*,
            (SELECT COUNT(*) FROM cards c
             WHERE c.product_id = p.id AND c.status = 'available') as stock_count
        FROM products p
        ORDER BY p.created_at DESC
    """)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def getProductById(db: aiosqlite.Connection, productId: int) -> dict | None:
    """根据 ID 获取商品"""
    cursor = await db.execute("""
        SELECT p.*,
            (SELECT COUNT(*) FROM cards c
             WHERE c.product_id = p.id AND c.status = 'available') as stock_count
        FROM products p WHERE p.id = ?
    """, (productId,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def createProduct(db: aiosqlite.Connection, data: dict) -> int:
    """创建商品，返回新商品 ID"""
    cursor = await db.execute(
        """INSERT INTO products (name, description, detail_description, price, original_price,
            image_url, product_type, warranty_days, warranty_times)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data["name"], data["description"], data.get("detailDescription", ""),
         data["price"], data.get("originalPrice"), data.get("imageUrl", ""),
         data.get("productType", "digital"),
         data.get("warrantyDays", 7), data.get("warrantyTimes", 1))
    )
    await db.commit()
    return cursor.lastrowid


async def updateProduct(db: aiosqlite.Connection, productId: int, data: dict) -> bool:
    """更新商品字段"""
    # 动态构建 SQL，仅更新非 None 字段
    fieldMap = {
        "name": "name", "description": "description",
        "detailDescription": "detail_description",
        "price": "price", "originalPrice": "original_price",
        "imageUrl": "image_url", "productType": "product_type",
        "isActive": "is_active", "warrantyDays": "warranty_days",
        "warrantyTimes": "warranty_times"
    }
    setClauses = []
    values = []
    for key, col in fieldMap.items():
        if key in data and data[key] is not None:
            val = data[key]
            if isinstance(val, bool):
                val = 1 if val else 0
            setClauses.append(f"{col} = ?")
            values.append(val)

    if not setClauses:
        return False

    values.append(productId)
    sql = f"UPDATE products SET {', '.join(setClauses)} WHERE id = ?"
    await db.execute(sql, values)
    await db.commit()
    return True


# ========== 商品类型 Repository ==========

async def getAllProductTypes(db: aiosqlite.Connection) -> list[dict]:
    """获取所有商品类型（按 sort_order 排序）"""
    cursor = await db.execute(
        "SELECT * FROM product_types ORDER BY sort_order ASC, id ASC"
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def getProductTypeBySlug(db: aiosqlite.Connection, slug: str) -> dict | None:
    """根据 slug 获取商品类型"""
    cursor = await db.execute(
        "SELECT * FROM product_types WHERE slug = ?", (slug,)
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def createProductType(db: aiosqlite.Connection, data: dict) -> int:
    """创建商品类型，返回新记录 ID"""
    cursor = await db.execute(
        """INSERT INTO product_types (slug, name, auto_deliver, sort_order)
        VALUES (?, ?, ?, ?)""",
        (data["slug"], data["name"],
         1 if data.get("autoDeliver", False) else 0,
         data.get("sortOrder", 0))
    )
    await db.commit()
    return cursor.lastrowid


async def updateProductType(db: aiosqlite.Connection, typeId: int, data: dict) -> bool:
    """更新商品类型"""
    fieldMap = {
        "slug": "slug", "name": "name",
        "autoDeliver": "auto_deliver", "sortOrder": "sort_order"
    }
    setClauses = []
    values = []
    for key, col in fieldMap.items():
        if key in data and data[key] is not None:
            val = data[key]
            if isinstance(val, bool):
                val = 1 if val else 0
            setClauses.append(f"{col} = ?")
            values.append(val)

    if not setClauses:
        return False

    values.append(typeId)
    sql = f"UPDATE product_types SET {', '.join(setClauses)} WHERE id = ?"
    await db.execute(sql, values)
    await db.commit()
    return True


async def deleteProductType(db: aiosqlite.Connection, typeId: int) -> bool:
    """删除商品类型（如果有商品使用则不允许删除）"""
    # 查出该类型的 slug，检查是否有商品在使用
    cursor = await db.execute("SELECT slug FROM product_types WHERE id = ?", (typeId,))
    row = await cursor.fetchone()
    if not row:
        return False

    usageCursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM products WHERE product_type = ?", (row["slug"],)
    )
    usage = await usageCursor.fetchone()
    if usage["cnt"] > 0:
        raise ValueError(f"该类型下有 {usage['cnt']} 个商品，无法删除")

    await db.execute("DELETE FROM product_types WHERE id = ?", (typeId,))
    await db.commit()
    return True


# ========== 卡密 Repository ==========

async def importCards(db: aiosqlite.Connection, productId: int,
                      cards: list[str], contentType: str = "text") -> int:
    """
    批量导入交付内容，自动设置隔离期
    contentType: 'text' 或 'file'
    返回成功导入数量
    """
    quarantineUntil = datetime.utcnow() + timedelta(hours=settings.QUARANTINE_HOURS)
    count = 0
    for content in cards:
        content = content.strip()
        if not content:
            continue
        await db.execute(
            """INSERT INTO cards (product_id, content, content_type, status, quarantine_until)
            VALUES (?, ?, ?, 'quarantine', ?)""",
            (productId, content, contentType, quarantineUntil.isoformat())
        )
        count += 1
    await db.commit()
    return count


async def importFileCard(db: aiosqlite.Connection, productId: int,
                         fileUrl: str) -> int:
    """
    导入单条文件类型交付内容
    content 存储文件 URL，content_type = 'file'
    """
    quarantineUntil = datetime.utcnow() + timedelta(hours=settings.QUARANTINE_HOURS)
    cursor = await db.execute(
        """INSERT INTO cards (product_id, content, content_type, status, quarantine_until)
        VALUES (?, ?, 'file', 'quarantine', ?)""",
        (productId, fileUrl, quarantineUntil.isoformat())
    )
    await db.commit()
    return cursor.lastrowid


async def getAvailableCard(db: aiosqlite.Connection, productId: int) -> dict | None:
    """获取一张可用卡密（优先取最早入库的）"""
    cursor = await db.execute(
        """SELECT * FROM cards
        WHERE product_id = ? AND status = 'available'
        ORDER BY created_at ASC LIMIT 1""",
        (productId,)
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def markCardSold(db: aiosqlite.Connection, cardId: int):
    """将卡密标记为已售"""
    await db.execute(
        "UPDATE cards SET status = 'sold', sold_at = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), cardId)
    )
    await db.commit()


async def markCardReplaced(db: aiosqlite.Connection, cardId: int):
    """将卡密标记为已换新"""
    await db.execute(
        "UPDATE cards SET status = 'replaced' WHERE id = ?",
        (cardId,)
    )
    await db.commit()


async def releaseQuarantinedCards(db: aiosqlite.Connection) -> int:
    """释放所有已过隔离期的卡密，返回释放数量"""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        """UPDATE cards SET status = 'available'
        WHERE status = 'quarantine' AND quarantine_until <= ?""",
        (now,)
    )
    await db.commit()
    return cursor.rowcount


async def getCards(db: aiosqlite.Connection, productId: int | None = None,
                   status: str | None = None, page: int = 1, pageSize: int = 20) -> tuple[list[dict], int]:
    """获取卡密列表（分页、可筛选）"""
    conditions = []
    values = []

    if productId is not None:
        conditions.append("c.product_id = ?")
        values.append(productId)
    if status:
        conditions.append("c.status = ?")
        values.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # 总数
    cursor = await db.execute(f"SELECT COUNT(*) as cnt FROM cards c {where}", values)
    total = (await cursor.fetchone())["cnt"]

    # 分页数据
    offset = (page - 1) * pageSize
    cursor = await db.execute(
        f"SELECT c.* FROM cards c {where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?",
        values + [pageSize, offset]
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows], total


# ========== 订单 Repository ==========

async def createOrder(db: aiosqlite.Connection, data: dict) -> int:
    """创建订单，返回新订单 ID"""
    cursor = await db.execute(
        """INSERT INTO orders (order_no, product_id, buyer_email, amount, status, payment_method)
        VALUES (?, ?, ?, ?, 'pending', ?)""",
        (data["orderNo"], data["productId"], data["buyerEmail"],
         data["amount"], data.get("paymentMethod", "alipay"))
    )
    await db.commit()
    return cursor.lastrowid


async def getOrderByNo(db: aiosqlite.Connection, orderNo: str) -> dict | None:
    """根据订单号获取订单（含商品名和卡密内容）"""
    cursor = await db.execute("""
        SELECT o.*, p.name as product_name,
               CASE WHEN o.status IN ('delivered', 'warranty_claimed', 'completed')
                    THEN c.content ELSE NULL END as card_content,
               c.content_type as card_content_type
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN cards c ON o.card_id = c.id
        WHERE o.order_no = ?
    """, (orderNo,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def updateOrderPaid(db: aiosqlite.Connection, orderNo: str,
                          paymentId: str, cardId: int, warrantyDays: int):
    """更新订单为已支付并发货"""
    now = datetime.utcnow()
    warrantyExpiry = now + timedelta(days=warrantyDays)
    await db.execute(
        """UPDATE orders SET status = 'delivered', payment_id = ?,
           card_id = ?, delivered_at = ?, warranty_expires_at = ?
        WHERE order_no = ? AND status = 'pending'""",
        (paymentId, cardId, now.isoformat(), warrantyExpiry.isoformat(), orderNo)
    )
    await db.commit()


async def updateOrderWarranty(db: aiosqlite.Connection, orderNo: str,
                              newCardId: int):
    """更新订单质保换新"""
    await db.execute(
        """UPDATE orders SET card_id = ?, warranty_used = 1, status = 'warranty_claimed'
        WHERE order_no = ?""",
        (newCardId, orderNo)
    )
    await db.commit()


async def getOrders(db: aiosqlite.Connection, status: str | None = None,
                    page: int = 1, pageSize: int = 20) -> tuple[list[dict], int]:
    """获取订单列表（分页、可筛选）"""
    conditions = []
    values = []

    if status:
        conditions.append("o.status = ?")
        values.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    cursor = await db.execute(f"SELECT COUNT(*) as cnt FROM orders o {where}", values)
    total = (await cursor.fetchone())["cnt"]

    offset = (page - 1) * pageSize
    cursor = await db.execute(
        f"""SELECT o.*, p.name as product_name
        FROM orders o LEFT JOIN products p ON o.product_id = p.id
        {where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?""",
        values + [pageSize, offset]
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows], total


async def getOrdersByEmail(db: aiosqlite.Connection, email: str) -> list[dict]:
    """根据买家邮箱查询所有订单（按时间倒序）"""
    cursor = await db.execute("""
        SELECT o.*, p.name as product_name,
               CASE WHEN o.status IN ('delivered', 'warranty_claimed', 'completed')
                    THEN c.content ELSE NULL END as card_content,
               c.content_type as card_content_type
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN cards c ON o.card_id = c.id
        WHERE o.buyer_email = ?
        ORDER BY o.created_at DESC
        LIMIT 50
    """, (email,))
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def cancelExpiredOrders(db: aiosqlite.Connection, timeoutMinutes: int = 30) -> int:
    """
    取消超时未支付的订单
    超过 timeoutMinutes 分钟仍为 pending 状态的订单自动标记为 cancelled
    """
    cutoff = (datetime.utcnow() - timedelta(minutes=timeoutMinutes)).isoformat()
    cursor = await db.execute(
        """UPDATE orders SET status = 'cancelled'
        WHERE status = 'pending' AND created_at <= ?""",
        (cutoff,)
    )
    await db.commit()
    return cursor.rowcount


# ========== 质保 Repository ==========

async def createWarrantyClaim(db: aiosqlite.Connection, data: dict) -> int:
    """创建质保换新记录"""
    cursor = await db.execute(
        """INSERT INTO warranty_claims (order_id, old_card_id, new_card_id, reason)
        VALUES (?, ?, ?, ?)""",
        (data["orderId"], data["oldCardId"], data["newCardId"], data.get("reason", ""))
    )
    await db.commit()
    return cursor.lastrowid


async def getWarrantyClaims(db: aiosqlite.Connection, page: int = 1,
                            pageSize: int = 20) -> tuple[list[dict], int]:
    """获取质保记录列表"""
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM warranty_claims")
    total = (await cursor.fetchone())["cnt"]

    offset = (page - 1) * pageSize
    cursor = await db.execute(
        """SELECT wc.*, o.order_no, c.content as new_card_content
        FROM warranty_claims wc
        LEFT JOIN orders o ON wc.order_id = o.id
        LEFT JOIN cards c ON wc.new_card_id = c.id
        ORDER BY wc.created_at DESC LIMIT ? OFFSET ?""",
        (pageSize, offset)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows], total


# ========== 预约 Repository ==========

async def createBooking(db: aiosqlite.Connection, data: dict) -> int:
    """创建服务预约，返回新预约 ID"""
    cursor = await db.execute(
        """INSERT INTO bookings (name, contact, service_type, description, preferred_time)
        VALUES (?, ?, ?, ?, ?)""",
        (data["name"], data["contact"], data["serviceType"],
         data.get("description", ""), data.get("preferredTime", ""))
    )
    await db.commit()
    return cursor.lastrowid


async def getBookingById(db: aiosqlite.Connection, bookingId: int) -> dict | None:
    """根据 ID 获取预约"""
    cursor = await db.execute("SELECT * FROM bookings WHERE id = ?", (bookingId,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def getBookings(db: aiosqlite.Connection, status: str | None = None,
                      page: int = 1, pageSize: int = 20) -> tuple[list[dict], int]:
    """获取预约列表（分页、可筛选）"""
    conditions = []
    values = []

    if status:
        conditions.append("b.status = ?")
        values.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    cursor = await db.execute(f"SELECT COUNT(*) as cnt FROM bookings b {where}", values)
    total = (await cursor.fetchone())["cnt"]

    offset = (page - 1) * pageSize
    cursor = await db.execute(
        f"SELECT b.* FROM bookings b {where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?",
        values + [pageSize, offset]
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows], total


async def updateBooking(db: aiosqlite.Connection, bookingId: int, data: dict) -> bool:
    """更新预约状态和备注"""
    setClauses = []
    values = []

    if "status" in data and data["status"] is not None:
        setClauses.append("status = ?")
        values.append(data["status"])
    if "adminNote" in data and data["adminNote"] is not None:
        setClauses.append("admin_note = ?")
        values.append(data["adminNote"])

    if not setClauses:
        return False

    values.append(bookingId)
    sql = f"UPDATE bookings SET {', '.join(setClauses)} WHERE id = ?"
    await db.execute(sql, values)
    await db.commit()
    return True


# ========== 管理员 Repository ==========

async def getAdminByUsername(db: aiosqlite.Connection, username: str) -> dict | None:
    """根据用户名获取管理员"""
    cursor = await db.execute(
        "SELECT * FROM admins WHERE username = ?", (username,)
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


# ========== 仪表盘 Repository ==========

async def getDashboardData(db: aiosqlite.Connection) -> dict:
    """获取仪表盘统计数据"""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # 总收入 & 今日收入
    cursor = await db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status != 'pending'"
    )
    totalRevenue = (await cursor.fetchone())["total"]

    cursor = await db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status != 'pending' AND DATE(created_at) = ?",
        (today,)
    )
    todayRevenue = (await cursor.fetchone())["total"]

    # 订单统计
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM orders WHERE status != 'pending'")
    totalOrders = (await cursor.fetchone())["cnt"]

    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM orders WHERE status != 'pending' AND DATE(created_at) = ?",
        (today,)
    )
    todayOrders = (await cursor.fetchone())["cnt"]

    # 卡密统计
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM cards")
    totalCards = (await cursor.fetchone())["cnt"]

    cursor = await db.execute("SELECT COUNT(*) as cnt FROM cards WHERE status = 'available'")
    availableCards = (await cursor.fetchone())["cnt"]

    cursor = await db.execute("SELECT COUNT(*) as cnt FROM cards WHERE status = 'quarantine'")
    quarantineCards = (await cursor.fetchone())["cnt"]

    cursor = await db.execute("SELECT COUNT(*) as cnt FROM cards WHERE status = 'sold'")
    soldCards = (await cursor.fetchone())["cnt"]

    # 质保统计
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM warranty_claims")
    warrantyClaims = (await cursor.fetchone())["cnt"]

    return {
        "totalRevenue": totalRevenue,
        "todayRevenue": todayRevenue,
        "totalOrders": totalOrders,
        "todayOrders": todayOrders,
        "totalCards": totalCards,
        "availableCards": availableCards,
        "quarantineCards": quarantineCards,
        "soldCards": soldCards,
        "warrantyClaimsCount": warrantyClaims
    }
