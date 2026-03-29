"""
数据库连接与初始化模块
使用 aiosqlite 实现异步 SQLite 访问
"""
import aiosqlite
import os
from config import settings

DATABASE_PATH = "./gemstore.db"


async def getDb():
    """
    获取数据库连接的异步生成器
    用于 FastAPI 依赖注入
    """
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def initDb():
    """
    初始化数据库：创建所有表结构
    NOTE: 仅在表不存在时创建，不会覆盖已有数据
    """
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            detail_description TEXT NOT NULL DEFAULT '',
            price REAL NOT NULL,
            original_price REAL,
            image_url TEXT DEFAULT '',
            product_type TEXT NOT NULL DEFAULT 'digital',
            is_active INTEGER NOT NULL DEFAULT 1,
            warranty_days INTEGER NOT NULL DEFAULT 7,
            warranty_times INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'quarantine',
            quarantine_until TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sold_at TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            product_id INTEGER NOT NULL,
            card_id INTEGER,
            buyer_email TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payment_method TEXT DEFAULT '',
            payment_id TEXT DEFAULT '',
            delivered_at TIMESTAMP,
            warranty_expires_at TIMESTAMP,
            warranty_used INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (card_id) REFERENCES cards(id)
        );

        CREATE TABLE IF NOT EXISTS warranty_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            old_card_id INTEGER NOT NULL,
            new_card_id INTEGER NOT NULL,
            reason TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (old_card_id) REFERENCES cards(id),
            FOREIGN KEY (new_card_id) REFERENCES cards(id)
        );

        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact TEXT NOT NULL,
            service_type TEXT NOT NULL,
            description TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            admin_note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
        CREATE INDEX IF NOT EXISTS idx_cards_product_id ON cards(product_id);
        CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

        CREATE TABLE IF NOT EXISTS product_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            auto_deliver INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    await db.commit()

    # 数据库迁移：为已有表添加新字段
    # NOTE: ALTER TABLE 在字段已存在时会报错，用 try/except 忽略
    migrations = [
        "ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'digital'",
        "ALTER TABLE products ADD COLUMN detail_description TEXT NOT NULL DEFAULT ''",
    ]
    for sql in migrations:
        try:
            await db.execute(sql)
        except Exception:
            pass
    await db.commit()

    # 检查是否需要初始化商品类型
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM product_types")
    row = await cursor.fetchone()
    if row["cnt"] == 0:
        await db.executemany(
            "INSERT INTO product_types (slug, name, auto_deliver, sort_order) VALUES (?, ?, ?, ?)",
            [
                ("digital", "数字商品（自动发卡）", 1, 1),
                ("service", "服务商品（人工处理）", 0, 2),
            ]
        )
        await db.commit()
        print("[初始化] 已创建预置商品类型")

    # 检查是否需要创建默认管理员
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM admins")
    row = await cursor.fetchone()
    if row["cnt"] == 0:
        import bcrypt
        passwordHash = bcrypt.hashpw(settings.ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await db.execute(
            "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
            (settings.ADMIN_USERNAME, passwordHash)
        )
        await db.commit()
        print(f"[初始化] 已创建默认管理员: {settings.ADMIN_USERNAME}")

    # 检查是否需要创建示例商品
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM products")
    row = await cursor.fetchone()
    if row["cnt"] == 0:
        await db.execute(
            """INSERT INTO products (name, description, price, original_price, warranty_days, warranty_times)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (
                "支付流程测试",
                "测试勿拍",
                0.01,
                0.01,
                1,
                1
            )
        )
        await db.commit()
        print("[初始化] 已创建示例商品")

    await db.close()
    print("[初始化] 数据库初始化完成")
