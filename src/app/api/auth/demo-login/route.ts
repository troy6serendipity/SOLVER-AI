import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withErrorHandler } from "@/lib/errors";

// 演示模式登录API
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 演示用户配置
const DEMO_USER_EMAIL = "demo@rongyan.ai";
const DEMO_USER_PASSWORD = "demo123456";
const DEMO_USER_NAME = "演示用户";

/**
 * POST /api/auth/demo-login - 演示模式登录
 */
export const POST = withErrorHandler(async () => {
  // 检查演示用户是否存在，不存在则创建
  let demoUser = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!demoUser) {
    const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    demoUser = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        password: hashedPassword,
        name: DEMO_USER_NAME,
      },
    });

    // 为演示用户预置一些测试数据
    // 预置错题本数据
    await prisma.wrongQuestion.create({
      data: {
        userId: demoUser.id,
        subject: "高等数学",
        question: "求极限 lim(x→0) (sinx - x)/x³",
        answer: "-1/6",
        analysis: "使用泰勒展开，sinx = x - x³/6 + o(x³)，代入后可得结果为 -1/6",
        knowledgePoint: "极限,洛必达法则,泰勒展开",
        formulas: JSON.stringify(["lim f(x)/g(x)", "sinx = x - x³/6 + o(x³)"]),
        mastery: "learning",
      },
    });

    // 预置文献数据
    await prisma.paper.create({
      data: {
        userId: demoUser.id,
        title: "深度学习在计算机视觉中的应用综述",
        authors: JSON.stringify(["张三", "李四"]),
        abstract: "本文综述了深度学习在计算机视觉各个领域的最新应用进展，包括图像分类、目标检测、语义分割等方向，并对未来发展趋势进行了展望。",
        fullText: "深度学习在计算机视觉中的应用综述\n\n1. 引言\n随着计算能力的提升和大数据的涌现，深度学习技术在计算机视觉领域取得了突破性进展...",
        pageCount: 8,
        tags: JSON.stringify(["CV", "深度学习"]),
        favorite: true,
      },
    });

    // 预置数据集
    await prisma.dataSet.create({
      data: {
        userId: demoUser.id,
        name: "学生成绩统计",
        rowCount: 50,
        columnCount: 5,
        columns: JSON.stringify([
          { name: "学号", type: "string", missing: 0 },
          { name: "姓名", type: "string", missing: 0 },
          { name: "数学", type: "number", missing: 0, min: 60, max: 98, mean: 82.5 },
          { name: "英语", type: "number", missing: 0, min: 65, max: 95, mean: 80.3 },
          { name: "专业", type: "string", missing: 0 },
        ]),
        rows: JSON.stringify([
          ["2023001", "张三", 85, 78, "计算机科学与技术"],
          ["2023002", "李四", 92, 88, "计算机科学与技术"],
          ["2023003", "王五", 78, 85, "软件工程"],
        ]),
      },
    });
  }

  // 登录演示用户
  await signIn("credentials", {
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    redirect: false,
  });

  return Response.json({
    success: true,
    user: {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      isDemo: true,
    },
  });
});