"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  FileText,
  Star,
  User,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function Sidebar() {
  const { databaseUser, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  if (pathname === "/auth/login" || !isAuthenticated) return null;

  const role = databaseUser?.role?.description?.toLowerCase() ?? "";
  const isAdmin = role.includes("admin");
  const isManager = role.includes("manager");
  const isCollaborator = role.includes("collaborat");

  const getNavItems = (): NavItem[] => {
    const base: NavItem[] = [{ label: t("sidebar.dashboard"), href: "/dashboard", icon: LayoutDashboard }];

    if (isAdmin) {
      return [
        ...base,
        { label: t("sidebar.employees"), href: "/employees", icon: Users },
        { label: t("sidebar.projects"), href: "/projects", icon: FolderKanban },
        { label: t("sidebar.timesheets"), href: "/timesheets", icon: Clock },
        { label: t("sidebar.requests"), href: "/requests", icon: FileText },
        { label: t("sidebar.performance"), href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"), href: "/profile", icon: User },
      ];
    }

    if (isManager) {
      return [
        ...base,
        { label: t("sidebar.approvals"), href: "/approvals", icon: CheckSquare },
        { label: t("sidebar.timesheets"), href: "/timesheets", icon: Clock },
        { label: t("sidebar.projects"), href: "/projects", icon: FolderKanban },
        { label: t("sidebar.requests"), href: "/requests", icon: FileText },
        { label: t("sidebar.performance"), href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"), href: "/profile", icon: User },
      ];
    }

    if (isCollaborator) {
      return [
        ...base,
        { label: t("sidebar.timesheets"), href: "/timesheets", icon: Clock },
        { label: t("sidebar.projects"), href: "/projects", icon: FolderKanban },
        { label: t("sidebar.requests"), href: "/requests", icon: FileText },
        { label: t("sidebar.performance"), href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"), href: "/profile", icon: User },
      ];
    }

    return base;
  };

  const navItems = getNavItems();

  return (
    <aside
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="relative z-40 flex h-screen w-64 flex-shrink-0 flex-col"
    >
      {/* h-16 matches DashboardHeader — one continuous top bar; logo + wordmark fill the row */}
      <Link
        href="/dashboard"
        className="flex h-16 w-full shrink-0 items-center gap-3 border-b px-4 md:px-5"
        style={{ borderColor: "var(--border)" }}
      >
        <Image
          src="/logos/logo.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-contain"
          priority
        />
        <span
          className="min-w-0 flex-1 text-3xl font-semibold leading-none tracking-tight"
          style={{ color: "var(--text-1)" }}
        >
          RHpro
        </span>
      </Link>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
              style={
                isActive
                  ? { background: "var(--accent-dim)", color: "var(--accent)" }
                  : { color: "var(--text-3)" }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
                }
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
