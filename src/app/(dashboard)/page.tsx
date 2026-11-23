import Link from "next/link";
import {
  BookOpen,
  FileText,
  FlaskConical,
  Briefcase,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { navItems } from "@/lib/nav";
import { Card, CardContent } from "@/components/ui/card";
import { QuickSearch } from "@/components/quick-search";

// 今日统计卡片配置
interface StatConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  unit: string;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    key: "wrong",
    label: "今日错题",
    icon: BookOpen,
    iconClass: "bg-indigo-50 text-indigo-600",
    unit: "道",
  },
  {
    key: "paper",
    label: "今日文献",
    icon: FileText,
    iconClass: "bg-emerald-50 text-emerald-600",
    unit: "篇",
  },
  {
    key: "experiment",
    label: "今日实验",
    icon: FlaskConical,
    iconClass: "bg-amber-50 text-amber-600",
    unit: "次",
  },
  {
    key: "job",
    label: "今日投递",
    icon: Briefcase,
    iconClass: "bg-rose-50 text-rose-600",
    unit: "份",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const userName = session?.user?.name || "同学";

  // 今日零点（本地时间）
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 并行查询四张业务表的「今日新增」与「累计」数量。
  // 显式调用各 Prisma 委托，避免联合类型动态索引导致的不可调用问题。
  const [
    wrongToday,
    wrongTotal,
    paperToday,
    paperTotal,
    experimentToday,
    experimentTotal,
    jobToday,
    jobTotal,
  ] = await Promise.all([
    prisma.wrongQuestion.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    prisma.wrongQuestion.count({ where: { userId } }),
    prisma.paper.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    prisma.paper.count({ where: { userId } }),
    prisma.experimentLog.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    prisma.experimentLog.count({ where: { userId } }),
    prisma.jobApplication.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    prisma.jobApplication.count({ where: { userId } }),
  ]);

  const countPairs = [
    { today: wrongToday, total: wrongTotal },
    { today: paperToday, total: paperTotal },
    { today: experimentToday, total: experimentTotal },
    { today: jobToday, total: jobTotal },
  ];

  const stats = STAT_CONFIGS.map((config, index) => ({
    ...config,
    today: countPairs[index].today,
    total: countPairs[index].total,
  }));

  const modules = navItems.filter((item) => item.href !== "/");

  return (
    <div className="space-y-8">
      {/* 欢迎区 + 快捷搜索 */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            你好，{userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            欢迎使用融研AI，搜索功能或点击下方卡片，开启今天的学研任务。
          </p>
        </div>
        <QuickSearch />
      </div>

      {/* 今日学习 / 科研统计 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          今日学习 / 科研统计
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.key}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold leading-none">
                      {stat.today}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {stat.unit}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      累计 {stat.total}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 六大场景入口 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          学研场景
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.label}</h3>
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
