---
name: deploy
description: 部署 gem-store 到服务器（前端构建 + SCP 上传 + 后端重启）。当需要将代码部署到生产服务器时使用。
trigger: command
allowed-tools:
  - run_command
---

# 部署 gem-store

## 前提条件

- Windows SSH 密钥 `~/.ssh/gemstore_hk` 已配置到 `root@8.217.172.245`
- 本地代码已保存且通过基本验证

## 部署步骤

以下步骤依次执行，每步成功后自动进入下一步。

### 1. 前端编译

```bash
npm run build
```
工作目录：`d:\WorkSpace\gem-store\frontend`

### 2. 上传后端文件

将修改过的后端 Python 文件上传到服务器：

```bash
scp -i $env:USERPROFILE\.ssh\gemstore_hk <修改的文件> root@8.217.172.245:/opt/gemstore/backend/
```

> [!NOTE]
> 只上传本次修改过的 `.py` 文件，不要全量覆盖。如果不确定修改了哪些文件，用 `git diff --name-only` 查看。

**后端核心文件列表**：
- `main.py` — 应用入口
- `config.py` — 配置管理
- `database.py` — 数据库 Schema
- `repositories.py` — 数据访问层
- `services.py` — 业务逻辑层
- `api_public.py` — 公开 API
- `api_admin.py` — 管理 API
- `payment.py` — 支付集成
- `schemas.py` — Pydantic 模型

### 3. 上传前端编译产物

```bash
scp -i $env:USERPROFILE\.ssh\gemstore_hk -r d:\WorkSpace\gem-store\frontend\dist\* root@8.217.172.245:/opt/gemstore/frontend-dist/
```

### 4. 重启后端服务

```bash
ssh -i $env:USERPROFILE\.ssh\gemstore_hk root@8.217.172.245 "systemctl restart gemstore"
```

### 5. 验证服务状态

```bash
ssh -i $env:USERPROFILE\.ssh\gemstore_hk root@8.217.172.245 "sleep 3 && systemctl is-active gemstore"
```

如果返回 `active` 即部署成功。

## 安全警告

> [!CAUTION]
> **绝对禁止**覆盖服务器上的 `gemstore.db` 数据库文件！该文件包含生产订单和用户数据。
> **绝对禁止**上传 `.env` 文件！服务器有独立的环境变量配置。

## 服务器信息

| 项目 | 值 |
|------|------|
| 服务器 IP | `8.217.172.245`（香港） |
| 域名 | `the66key.com` |
| SSH 密钥 | `~/.ssh/gemstore_hk` |
| 项目目录 | `/opt/gemstore/` |
| 后端目录 | `/opt/gemstore/backend/` |
| 前端目录 | `/opt/gemstore/frontend-dist/` |
| systemd 服务 | `gemstore`（uvicorn 监听 8001） |
| Nginx 配置 | `/etc/nginx/sites-enabled/gemstore` |
| HTTPS | Certbot 自动管理 |

## 查看服务器日志

```bash
# 查看后端日志
ssh -i $env:USERPROFILE\.ssh\gemstore_hk root@8.217.172.245 "journalctl -u gemstore -n 50 --no-pager"

# 查看 Nginx 访问日志
ssh -i $env:USERPROFILE\.ssh\gemstore_hk root@8.217.172.245 "tail -20 /var/log/nginx/access.log"
```
