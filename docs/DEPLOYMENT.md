# 部署指南 (DEPLOYMENT.md)

本文档介绍 SOLVER AI 的各种部署方式。

## 前置要求
### 环境变量
部署前需要配置以下环境变量，可以参考 `.env.example` 文件：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | 是 |
| `NEXTAUTH_URL` | 应用访问地址，例如 `https://your-domain.com` | 是 |
| `NEXTAUTH_SECRET` | Auth.js 密钥，可以通过 `openssl rand -hex 32` 生成 | 是 |
| `STORAGE_ROOT` | 文件存储根目录，默认 `.storage` | 否 |
| `STORAGE_URL_PREFIX` | 文件访问URL前缀，默认 `/api/storage` | 否 |
| `STORAGE_SIGNATURE_SECRET` | 文件签名密钥，自动生成 | 否 |
| `OPENAI_API_KEY` | OpenAI API 密钥（AI功能需要） | 否 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥（AI功能需要） | 否 |

### 最低配置要求
- CPU: 2核
- 内存: 4GB
- 存储: 20GB 可用空间
- 网络: 公网访问能力

## 一、Vercel 部署（推荐）
Vercel 是 Next.js 官方推荐的部署平台，部署过程最简单，支持自动部署、预览环境等功能。

### 部署步骤
1. 点击下方按钮一键部署：
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/troy6serendipity/SOLVER-AI)

2. 导入 GitHub 仓库后，在 Vercel 控制台配置环境变量。

3. 点击部署，等待部署完成。

4. 数据库准备：
   - 推荐使用 Supabase、Neon 等托管 PostgreSQL 服务
   - 部署完成后，在 Vercel 控制台运行数据库迁移：
     ```bash
     npx prisma migrate deploy
     ```

### 优势
- 零配置部署，自动SSL证书
- 全球CDN，访问速度快
- 自动扩缩容，无需担心服务器负载
- 支持Git提交自动部署

## 二、Docker 部署
使用 Docker 可以快速在任意支持 Docker 的环境部署。

### Dockerfile
项目根目录已经提供了 Dockerfile：
```dockerfile
FROM node:20-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### 部署步骤
1. 构建 Docker 镜像：
   ```bash
   docker build -t solver-ai .
   ```

2. 运行容器：
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e DATABASE_URL="your-database-url" \
     -e NEXTAUTH_URL="https://your-domain.com" \
     -e NEXTAUTH_SECRET="your-secret" \
     -v $(pwd)/.storage:/app/.storage \
     solver-ai
   ```

3. 运行数据库迁移：
   ```bash
   docker exec -it <container-id> npx prisma migrate deploy
   ```

## 三、自建服务器部署
### 系统要求
- Ubuntu 20.04+ / CentOS 8+
- Node.js 20+
- PostgreSQL 14+
- Nginx (反向代理)

### 部署步骤
1. 安装 Node.js：
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. 安装 PostgreSQL：
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres createuser solver
   sudo -u postgres createdb solver_db
   sudo -u postgres psql -c "ALTER USER solver WITH PASSWORD 'your-password';"
   ```

3. 克隆代码：
   ```bash
   git clone https://github.com/troy6serendipity/SOLVER-AI.git
   cd SOLVER-AI
   ```

4. 安装依赖：
   ```bash
   npm ci
   ```

5. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填写配置
   ```

6. 构建应用：
   ```bash
   npm run build
   ```

7. 运行数据库迁移：
   ```bash
   npx prisma migrate deploy
   ```

8. 配置进程管理（PM2）：
   ```bash
   npm install -g pm2
   pm2 start npm --name "solver-ai" -- start
   pm2 startup
   pm2 save
   ```

9. 配置 Nginx 反向代理：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

10. 配置 SSL 证书（Let's Encrypt）：
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

## 四、数据库部署
### 本地数据库
参考[数据库文档](DATABASE.md)进行本地数据库安装和配置。

### 托管数据库推荐
- **Supabase**: PostgreSQL 托管服务，自带认证、存储等功能
- **Neon**: 无服务器 PostgreSQL，支持自动扩缩容
- **AWS RDS**: 亚马逊关系型数据库服务，企业级
- **阿里云 RDS**: 阿里云关系型数据库服务，国内访问速度快

## 五、后续配置
### 演示模式初始化
部署完成后，可以访问 `/api/auth/demo-login` 来初始化演示用户和测试数据。

### 健康检查
部署完成后，访问 `/api/health` 可以检查应用运行状态，返回 `{"status":"ok"}` 表示运行正常。

### 日志查看
- Vercel 部署：在 Vercel 控制台查看日志
- Docker 部署：`docker logs <container-id>`
- PM2 部署：`pm2 logs solver-ai`

## 六、常见问题
### 1. 数据库连接失败
- 检查数据库地址、端口、用户名、密码是否正确
- 检查数据库服务器是否允许外部访问
- 检查防火墙是否开放数据库端口

### 2. AI 功能无法使用
- 检查 API 密钥是否正确配置
- 检查账户余额是否充足
- 检查网络是否可以访问 LLM 服务

### 3. 文件上传失败
- 检查存储目录是否有写入权限
- 检查文件大小是否超过限制
- 检查环境变量中存储路径配置是否正确