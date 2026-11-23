import { DefaultSession } from "next-auth";

// 扩展 Session / JWT 类型，使 session.user.id 可用
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
