import {
  Home,
  BookOpen,
  FileText,
  BarChart3,
  FlaskConical,
  Atom,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  // 首页快捷搜索的匹配关键词（不影响侧边栏渲染）
  keywords?: string[];
}

// 全局导航：首页工作台 + 六大模块
export const navItems: NavItem[] = [
  { href: "/", label: "首页工作台", icon: Home },
  {
    href: "/review",
    label: "复习助手",
    icon: BookOpen,
    description: "追问式解题思路 + 错题本",
    keywords: ["复习", "错题", "解题", "考试", "刷题", "知识点", "追问"],
  },
  {
    href: "/literature",
    label: "文献助手",
    icon: FileText,
    description: "PDF 速读 + 溯源问答 + 文献库",
    keywords: ["文献", "论文", "pdf", "速读", "摘要", "溯源", "科研"],
  },
  {
    href: "/data",
    label: "数据洞察",
    icon: BarChart3,
    description: "上传数据，AI 自动出图与解读",
    keywords: ["数据", "图表", "可视化", "统计", "分析", "csv", "excel"],
  },
  {
    href: "/experiments",
    label: "实验台账",
    icon: FlaskConical,
    description: "结构化记录 + AI 归纳 + 周报",
    keywords: ["实验", "台账", "记录", "周报", "现象", "结论"],
  },
  {
    href: "/lab",
    label: "原理实验室",
    icon: Atom,
    description: "参数可调交互仿真 + AI 解读",
    keywords: ["仿真", "原理", "公式", "实验室", "模拟", "参数", "物理", "化学"],
  },
  {
    href: "/jobs",
    label: "求职助手",
    icon: Briefcase,
    description: "简历优化 + 模拟面试 + 进度看板",
    keywords: ["求职", "简历", "面试", "offer", "投递", "招聘", "岗位"],
  },
];
