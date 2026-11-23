import { redirect } from "next/navigation";

// 文献助手已迁移到 /literature，保留旧路径做兼容跳转。
export default function PapersLegacyPage() {
  redirect("/literature");
}
