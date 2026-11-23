import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";

// 读取 session（cookie / crypto）必须在请求时进行，禁止静态预渲染
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <RegisterForm />
    </div>
  );
}
