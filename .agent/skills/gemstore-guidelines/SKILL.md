---
name: gemstore-工作规范
description: gem-store 项目的代码规范和开发指南，包含项目架构、代码风格、禁止事项、配置管理等规则。在修改项目代码时参考此文档。
trigger: auto
allowed-tools:
  - view_file
  - grep_search
---

# gem-store 工作规范

> **修改代码前建议通读此文档。**

---

## 🌐 语言要求

- **全程使用中文**：所有对话、文档、代码注释一律使用中文
- **专有名词保留英文**：变量名、函数名、类名、技术术语保持英文
- **注释格式**：Python 用 docstring `"""`，TypeScript 用 JSDoc `/** */`，行内用 `//`

---

## 🏗️ 项目架构

```
gem-store/
├── backend/                # FastAPI 后端
│   ├── main.py             # 应用入口 + 生命周期管理
│   ├── config.py           # 配置管理（环境变量）
│   ├── database.py         # 数据库初始化 + Schema 定义
│   ├── repositories.py     # 数据访问层（SQL 操作）
│   ├── services.py         # 业务逻辑层
│   ├── api_public.py       # 公开 API（商品/支付/订单/预约）
│   ├── api_admin.py        # 管理 API（后台管理）
│   ├── payment.py          # 虎皮椒支付集成
│   ├── schemas.py          # Pydantic 数据模型
│   └── .env                # ⚠️ 环境变量（不入 Git）
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   │   ├── HomePage.tsx
│   │   │   ├── BookingPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── OrderQueryPage.tsx
│   │   │   └── admin/      # 管理后台页面
│   │   ├── services/api.ts # API 封装
│   │   ├── types/index.ts  # TypeScript 类型
│   │   ├── App.tsx         # 路由配置
│   │   └── index.css       # 全局样式（设计系统）
│   └── public/             # 静态资源（logo、头像）
│
├── .agent/                 # AI 技能和规范
│   └── skills/
└── README.md
```

---

## 📐 分层架构（后端必须遵守）

```
请求 → api_public.py / api_admin.py  →  services.py  →  repositories.py  →  database
         ↑ 请求解析 + 响应封装           ↑ 业务逻辑        ↑ SQL 操作            ↑ aiosqlite
```

| 层级 | 职责 | 禁止事项 |
|------|------|---------|
| **API 层** | 路由定义、参数校验、响应格式化 | 禁止直接写 SQL |
| **Service 层** | 业务逻辑、规则校验 | 禁止直接操作数据库 |
| **Repository 层** | 数据增删改查 | 禁止包含业务判断 |
| **Schema 层** | Pydantic 请求/响应模型 | 禁止包含逻辑 |

---

## ✍️ 代码风格

### Python（backend/）

| 规则 | 说明 |
|------|------|
| **命名** | 变量/函数：`camelCase`；类：`PascalCase`；常量：`UPPER_SNAKE_CASE` |
| **类型标注** | 所有函数必须标注参数和返回值类型 |
| **异步** | 数据库操作使用 `async/await`（aiosqlite） |
| **错误处理** | 禁止裸 `except`，禁止 `print` 代替日志 |
| **日志** | 使用 `logging` 模块，按级别区分 |

### TypeScript/React（frontend/）

| 规则 | 说明 |
|------|------|
| **组件** | 函数组件 + TypeScript，不使用类组件 |
| **命名** | 组件 `PascalCase`，Hook 以 `use` 开头，文件名与组件名一致 |
| **Props** | 必须定义 TypeScript 接口，使用解构接收 |
| **样式** | 使用 `index.css` 中的 CSS 变量和预定义类名 |
| **API 调用** | 统一通过 `services/api.ts` 封装，不直接 `fetch` |

---

## 🎨 设计系统（前端）

全局样式定义在 `index.css`，使用 CSS 变量：

- **颜色**：`--color-accent`、`--color-bg`、`--color-text-*` 等
- **间距**：`--space-xs` 到 `--space-3xl`
- **字号**：`--font-size-xs` 到 `--font-size-2xl`
- **预定义类**：`.card`、`.btn`、`.badge`、`.input`、`.modal` 等

> [!IMPORTANT]
> 新增页面时优先使用已有的 CSS 类和变量，保持视觉一致性。不要引入额外的 CSS 框架。

---

## 🚫 绝对禁止

> [!CAUTION]
> 以下行为会造成严重后果，必须绝对避免。

| # | 禁止事项 | 原因 |
|:-:|---------|------|
| 1 | **删除或覆盖生产 `gemstore.db`** | 包含真实订单和用户数据 |
| 2 | **硬编码密钥**（支付密钥、SECRET_KEY） | 安全风险，必须走 `.env` |
| 3 | **在 API 层直接写 SQL** | 违反分层架构 |
| 4 | **使用 `dangerouslySetInnerHTML`** | XSS 风险 |
| 5 | **上传 `.env` 到 Git 或服务器** | 泄露敏感配置 |
| 6 | **修改生产服务器 `.env` 变量名** | 只能新增变量 |

---

## 📋 每次改动的工作清单

```
1. 📂 阅读相关代码 → 理解现有实现
2. ✏️ 编写代码 → 遵循分层架构和代码风格
3. 🔨 语法检查 → Python: python -c "import ast; ..." / TS: npx tsc --noEmit
4. 🧪 本地验证 → 启动前后端，浏览器测试
5. 🚀 部署 → 使用 /deploy Skill
6. ✅ 线上验证 → 浏览器访问 the66key.com 确认
```

---

## 🔧 环境配置

### 不可硬编码的值

| 类别 | 正确做法 | 错误做法 |
|------|---------|---------| 
| 支付密钥 | `os.getenv("XUNHU_APP_SECRET")` | 直接写密钥字符串 |
| JWT 密钥 | `os.getenv("SECRET_KEY")` | `'my-secret'` |
| 数据库路径 | `config.py` 中配置 | 硬编码绝对路径 |
| API 基地址 | 前端相对路径 `/api/` | `'http://localhost:8001'` |

### 新增配置项流程

1. 在 `.env.example` 中添加变量和说明
2. 在 `config.py` 中的 `Settings` 类读取并设默认值
3. 在使用处通过 `settings` 实例获取

---

## 🚀 部署

使用 `/deploy` Skill 部署。详见 `.agent/skills/deploy/SKILL.md`。

---

## 💡 其他约定

- **提交信息**：`type: 描述`（如 `feat: 新增服务预约功能`、`fix: 修复支付回调`）
- **临时调试代码**：用完必须删除
- **新增页面**：必须在 `App.tsx` 注册路由
- **新增管理页面**：必须在 `AdminLayout.tsx` 添加侧边栏导航
- **新增 API**：公开接口放 `api_public.py`，管理接口放 `api_admin.py`
