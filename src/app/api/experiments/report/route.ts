// 实验台账API，暂未实现
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return Response.json({ error: "该功能暂未实现" }, { status: 501 });
}
