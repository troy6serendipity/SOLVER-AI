"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { UserNav } from "@/components/user-nav";

interface TopbarProps {
  user: { name?: string | null; email?: string | null };
}

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const current = navItems.find(
    (item) =>
      item.href === pathname ||
      (item.href !== "/" && pathname.startsWith(item.href + "/"))
  );
  const title = current?.label ?? "工作台";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <UserNav name={user.name} email={user.email} />
    </header>
  );
}
