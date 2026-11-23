import { LiteratureWorkbench } from "@/components/literature/literature-workbench";

// 文献阅读助手：PDF 上传解析 + 三分钟速读卡 + 溯源问答 + 文献库
// 鉴权与 force-dynamic 由 (dashboard)/layout.tsx 统一保证。
export default function LiteraturePage() {
  return <LiteratureWorkbench />;
}
