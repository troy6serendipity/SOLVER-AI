// Tailwind CSS v4 通过 PostCSS 处理（webpack 模式下使用；turbopack 模式走 next.config 中的 @tailwindcss/turbopack）
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
