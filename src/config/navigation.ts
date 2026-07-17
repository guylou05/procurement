import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  CheckSquare,
  UserCheck,
  HardHat,
  Package,
  Receipt,
  Wrench,
  AlertTriangle,
  Users,
  FileText,
  BarChart3,
  UsersRound,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string; // relative to /[locale]
  labelKey: string; // key under "nav"
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/projects", labelKey: "projects", icon: FolderKanban },
  { href: "/daily-reports", labelKey: "dailyReports", icon: ClipboardList },
  { href: "/tasks", labelKey: "tasks", icon: CheckSquare },
  { href: "/attendance", labelKey: "attendance", icon: UserCheck },
  { href: "/workers", labelKey: "workers", icon: HardHat },
  { href: "/materials", labelKey: "materials", icon: Package },
  { href: "/expenses", labelKey: "expenses", icon: Receipt },
  { href: "/equipment", labelKey: "equipment", icon: Wrench },
  { href: "/issues", labelKey: "issues", icon: AlertTriangle },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/invoices", labelKey: "invoices", icon: FileText },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/team", labelKey: "team", icon: UsersRound },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
