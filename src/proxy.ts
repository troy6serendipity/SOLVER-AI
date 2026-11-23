import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 起使用 proxy 约定（原 middleware）。
// 使用轻量 authConfig（不依赖 Prisma/bcrypt），未登录访问受保护路由时自动跳转到 /login。
export default NextAuth(authConfig).auth;

export const config = {
  // 匹配所有路由，但排除：/api、静态资源、登录/注册页
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};
