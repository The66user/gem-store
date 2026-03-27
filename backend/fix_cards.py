"""一次性脚本：将所有隔离中的卡密改为可售状态"""
import sqlite3

conn = sqlite3.connect("gemstore.db")
conn.execute("UPDATE cards SET status='available', quarantine_until=NULL WHERE status='quarantine'")
conn.commit()
print(f"已更新 {conn.total_changes} 条卡密为可售状态")
conn.close()
