import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// 边缘安全（Edge-safe）的最小认证配置，专供 middleware 使用。
// 不导入 Prisma / bcrypt 等 Node 专属依赖，避免中间件在 Edge Runtime 报错。
// 真实的账号密码校验逻辑在 src/lib/auth.ts 中实现。
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // middleware 仅校验会话 Cookie，不会调用此函数
      async authorize() {
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
