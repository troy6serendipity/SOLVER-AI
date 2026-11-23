import { ReviewWorkbench } from "@/components/review/review-workbench";

// 复习助手：题目输入（文字/图片 OCR 预留）+ 追问式流式解题 + 变式题 + 错题本
// 鉴权与 force-dynamic 由 (dashboard)/layout.tsx 统一保证。
export default function ReviewPage() {
  return <ReviewWorkbench />;
}
