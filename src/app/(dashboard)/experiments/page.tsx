import { navItems } from "@/lib/nav";
import { ModulePlaceholder } from "@/components/module-placeholder";

const item = navItems.find((n) => n.href === "/experiments")!;

export default function ExperimentsPage() {
  return (
    <ModulePlaceholder
      title={item.label}
      description={item.description}
      icon={item.icon}
    />
  );
}
