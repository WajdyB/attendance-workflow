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
  Building2,
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
    const base: NavItem[] = [
      { label: t("sidebar.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    ];

    if (isAdmin) {
      return [
        ...base,
        { label: t("sidebar.employees"),   href: "/employees",   icon: Users },
        { label: t("sidebar.projects"),     href: "/projects",    icon: FolderKanban },
        { label: t("sidebar.timesheets"),   href: "/timesheets",  icon: Clock },
        { label: t("sidebar.rolesDepots"),  href: "/roles-depots",icon: Building2 },
        { label: t("sidebar.requests"),     href: "/requests",    icon: FileText },
        { label: t("sidebar.performance"),  href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"),    href: "/profile",     icon: User },
      ];
    }

    if (isManager) {
      return [
        ...base,
        { label: t("sidebar.approvals"),    href: "/approvals",   icon: CheckSquare },
        { label: t("sidebar.timesheets"),   href: "/timesheets",  icon: Clock },
        { label: t("sidebar.projects"),     href: "/projects",    icon: FolderKanban },
        { label: t("sidebar.requests"),     href: "/requests",    icon: FileText },
        { label: t("sidebar.performance"),  href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"),    href: "/profile",     icon: User },
      ];
    }

    if (isCollaborator) {
      return [
        ...base,
        { label: t("sidebar.timesheets"),   href: "/timesheets",  icon: Clock },
        { label: t("sidebar.projects"),     href: "/projects",    icon: FolderKanban },
        { label: t("sidebar.requests"),     href: "/requests",    icon: FileText },
        { label: t("sidebar.performance"),  href: "/performance", icon: Star },
        { label: t("sidebar.myDossier"),    href: "/profile",     icon: User },
      ];
    }

    return base;
  };

  const navItems = getNavItems();
  const displayName = databaseUser
    ? `${databaseUser.firstName} ${databaseUser.lastName}`
    : "";
  const roleLabel = databaseUser?.role?.description ?? "";

  return (
    <aside
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="w-64 flex flex-col h-screen flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b"
           style={{ borderColor: "var(--border)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
             style={{ background: "var(--accent-dim)" }}>
          <Image src="/logos/logo.svg" alt="RHpro" width={18} height={18} />
        </div>
        <span className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
          RHpro
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
              style={
                isActive
                  ? {
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                    }
                  : {
                      color: "var(--text-3)",
                    }
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

      {/* User card */}
      <div className="px-3 pb-4">
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: "var(--surface-raised)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {databaseUser?.firstName?.[0]}{databaseUser?.lastName?.[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
              {displayName}
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
