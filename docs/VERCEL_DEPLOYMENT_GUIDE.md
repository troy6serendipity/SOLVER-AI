# Vercel 部署环境变量清单
本文档列出了部署 SOLVER AI 到 Vercel 所需的所有环境变量。

## 📋 必填环境变量
| 变量名 | 用途 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串，推荐使用 Supabase/Neon 等托管服务 | `postgresql://user:password@host:5432/dbname?schema=public` |
| `NEXTAUTH_URL` | 应用的完整访问 URL | `https://your-app-name.vercel.app` |
| `NEXTAUTH_SECRET` | Auth.js 加密密钥，使用 `openssl rand -hex 32` 生成 | `d41d8cd98f00b204e9800998ecf8427e` |
| `STORAGE_SIGNATURE_SECRET` | 文件签名密钥，使用 `openssl rand -hex 32` 生成 | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6` |

## 🔧 可选环境变量
| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production`（自动设置） |
| `STORAGE_ROOT` | 文件存储根目录（Vercel Serverless 环境下仅支持临时存储） | `/tmp/storage` |
| `STORAGE_URL_PREFIX` | 文件访问URL前缀 | `/api/storage` |
| `STORAGE_SIGNED_URL_EXPIRY` | 签名URL有效期（秒） | `3600` |
| `OPENAI_API_KEY` | OpenAI API 密钥，用于AI功能 | 无 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥，用于AI功能 | 无 |
| `AI_RATE_LIMIT_REQUESTS_PER_MINUTE` | 每分钟AI请求限制 | `30` |
| `AI_DAILY_QUOTA_TOKENS` | 每日AI Token配额 | `100000` |
| `DEMO_MODE_ENABLED` | 是否启用演示模式 | `true` |
| `NEXT_PUBLIC_APP_URL` | 前端公开访问地址 | 和 `NEXTAUTH_URL` 一致 |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | `SOLVER AI` |

## ⚠️ Vercel 部署注意事项
1. **数据库选择**：Vercel 没有内置数据库服务，需要使用外部托管的 PostgreSQL 服务，推荐：
   - Supabase：https://supabase.com
   - Neon：https://neon.tech
   - AWS RDS / 阿里云 RDS 等云厂商数据库服务

2. **文件存储限制**：Vercel Serverless 环境的文件系统是临时的，重启或重新部署后会清空，不适合长期存储用户文件。如需持久化文件存储，推荐：
   - AWS S3 / 阿里云 OSS 等对象存储服务
   - Supabase Storage
   - Cloudflare R2

3. **构建配置**：
   - 构建命令：`npm run build`（已包含 `prisma generate`）
   - 输出目录：`.next`
   - 安装命令：`npm ci`
   - Node.js 版本：20.x

4. **数据库迁移**：生产环境数据库迁移需要手动执行，不要在构建过程中自动运行：
   ```bash
   npx vercel env pull
   npx prisma migrate deploy
   ```

5. **演示模式**：演示用户的数据会存储在数据库中，部署完成后首次访问 `/api/auth/demo-login` 会自动初始化演示数据。

6. **环境变量加密**：所有环境变量在 Vercel 中都是加密存储的，敏感信息不会泄露。

## 🚀 一键部署
你可以直接点击下方按钮一键部署到 Vercel，部署过程中会提示填写上述环境变量：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/troy6serendipity/SOLVER-AI)
