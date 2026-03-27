# The66Shop — 一站式数字服务平台

> 🌐 在线体验：[the66key.com](https://the66key.com)

The66Shop 是一个个人数字服务平台，集**数字商品售卖**、**服务预约**和**个人展示**于一体。

---

## ✨ 功能特性

### 🛒 数字商品交易
- 商品展示与分类浏览
- 微信扫码支付（虎皮椒接口）
- 自动发卡 + 邮件通知
- 订单查询与售后换新

### 📋 服务预约
- 在线提交预约申请（AI 工具咨询、PPT 定制、代码开发等）
- 管理后台查看与处理预约

### 👤 个人展示
- 「关于我」个人简介 + 技能标签
- 「联系方式」多渠道联系入口

### 🔧 管理后台
- 仪表盘（收入、订单、库存统计）
- 商品管理 / 交付管理（卡密）
- 订单管理 / 预约管理

---

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Vite |
| **后端** | Python 3.10+ + FastAPI + aiosqlite |
| **数据库** | SQLite |
| **支付** | 虎皮椒微信支付 |
| **部署** | Ubuntu + Nginx + systemd + HTTPS (Certbot) |

---

## 📁 项目结构

```
gem-store/
├── backend/                # 后端 FastAPI 服务
│   ├── main.py             # 应用入口
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库初始化与 Schema
│   ├── repositories.py     # 数据访问层
│   ├── services.py         # 业务逻辑层
│   ├── api_public.py       # 公开 API（商品/支付/预约）
│   ├── api_admin.py        # 管理 API（后台管理）
│   ├── payment.py          # 支付集成
│   ├── schemas.py          # Pydantic 数据模型
│   └── .env.example        # 环境变量示例
│
├── frontend/               # 前端 React 应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 封装
│   │   ├── types/          # TypeScript 类型
│   │   ├── App.tsx         # 路由配置
│   │   └── index.css       # 全局样式
│   └── public/             # 静态资源
│
└── README.md
```

---

## 🚀 快速开始

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置

# 启动
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev     # 开发模式
npm run build   # 生产构建
```

---

## 📄 License

MIT License

---

Made with ❤️ by [一个66用户](https://the66key.com)
