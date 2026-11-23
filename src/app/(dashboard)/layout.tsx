import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";

// 读取 session（cookie / crypto）必须在请求时进行，禁止静态预渲染。
// 该配置对 (dashboard) 下所有子路由生效。
export const dynamic = "force-dynamic";

// 受保护的主布局：左侧固定导航 + 顶部栏，包裹所有已登录页面
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppSidebar />
      <div className="pl-60">
        <Topbar
          user={{ name: session.user.name, email: session.user.email }}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
