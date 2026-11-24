import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone：产出 .next/standalone（含 server.js 与所需 node_modules），
  // 便于独立 Node.js 环境/容器部署，Vercel 上同样兼容。
  output: "standalone",
  // 不启用 Next 16 的 Cache Components（静态外壳 + use cache 模型）。
  // 本项目为按用户动态查库的学研助手，保持经典 App Router 渲染模型更简单稳健，
  // 受保护路由用 `export const dynamic = "force-dynamic"` 标记为请求时渲染。
  //
  // 不设置 serverExternalPackages: ["@prisma/client"]：
  // 实测 webpack 默认外部化处理下，Prisma 读写与 next-auth 会话在 dev / build / start
  // 均正常；显式声明反而会在 Windows 上触发构建期清理 .next/node_modules 时的
  // EPERM（query engine 二进制被瞬态锁）。保持默认即可。
  webpack(config, { isServer }) {
    if (isServer) {
      // pdf-parse(v2) 是 vite 预打包的 CJS，内部以相对路径 ./pdf.worker.mjs 加载 worker，
      // 被 webpack 收编后相对路径会指向 .next/server/chunks 导致 worker 找不到。
      // 将 pdf-parse 整体外部化，运行时从真实 node_modules 解析，worker 相对路径即与其同目录。
      // 同时外部化其可选原生画布依赖（仅图片/截图渲染需要，纯文本提取不加载）。
      // 使用 webpack externals 而非 serverExternalPackages，避免 .next/node_modules 复制期的 EPERM。
      config.externals = config.externals ?? [];
      config.externals.push("pdf-parse", "@napi-rs/canvas");
    }
    return config;
  },
  // standalone 产物只包含被追踪到的文件，Prisma 引擎与 pdf-parse 必须显式带上，
  // 否则运行时会因找不到 query engine / pdf.worker 而启动失败。
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
      "./node_modules/pdf-parse/**",
    ],
  },
};

export default nextConfig;
