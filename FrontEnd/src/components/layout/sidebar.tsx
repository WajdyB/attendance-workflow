// components/Sidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Sidebar() {
  const { databaseUser, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  // Get user role from databaseUser (keep original case for display)
  const userRole = databaseUser?.role?.description || "";
  const normalizedRole = userRole.trim().toLowerCase();

  // Don't show sidebar on login page
  if (pathname === "/auth/login") return null;

  // Define menu items based on role
  const getMenuItems = () => {
    // Base items for all authenticated users
    const baseItems = [{ name: t("sidebar.dashboard"), href: "/dashboard", icon: "📊" }];

    // Admin items
    if (normalizedRole.includes("admin")) {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: t("sidebar.employees"), href: "/employees", icon: "👥" },
        { name: t("sidebar.projects"), href: "/projects", icon: "📁" },
        { name: t("sidebar.timesheets"), href: "/timesheets", icon: "⏱️" },
        { name: t("sidebar.rolesDepots"), href: "/roles-depots", icon: "🏢" },
        { name: t("sidebar.requests"), href: "/requests", icon: "📋" },
        { name: t("sidebar.settings"), href: "/profile", icon: "⚙️" },
      ];
    }

    // Collaborator items
    if (normalizedRole.includes("collaborateur") || normalizedRole.includes("collaborator")) {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: t("sidebar.timesheets"), href: "/timesheets", icon: "⏱️" },
        { name: t("sidebar.projects"), href: "/projects", icon: "📁" },
        { name: t("sidebar.requests"), href: "/requests", icon: "📨" },
        { name: t("sidebar.settings"), href: "/profile", icon: "⚙️" },
        { name: t("sidebar.myDossier"), href: "/dossier", icon: "📄" },
      ];
    }

    // Manager items
    if (normalizedRole.includes("manager")) {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: t("sidebar.approvals"), href: "/approvals", icon: "✅" },
        { name: t("sidebar.timesheets"), href: "/timesheets", icon: "⏱️" },
        { name: t("sidebar.projects"), href: "/projects", icon: "📁" },
        { name: t("sidebar.settings"), href: "/profile", icon: "⚙️" },
        { name: t("sidebar.myDossier"), href: "/dossier", icon: "📄" },
        { name: t("sidebar.evaluations"), href: "/evaluations", icon: "⭐" },
      ];
    }

    // Default items (if role not recognized)
    return baseItems;
  };

  const menuItems = getMenuItems();

  // If not authenticated, don't show sidebar
  if (!isAuthenticated) return null;

  // Get user display name
  const displayName = databaseUser
    ? `${databaseUser.firstName} ${databaseUser.lastName}`
    : t("sidebar.user");

  // Get user role display (for UI)
  const roleDisplay =
    normalizedRole.includes("admin")
      ? t("sidebar.administrator")
      : normalizedRole.includes("manager")
        ? t("sidebar.manager")
        : normalizedRole.includes("collaborateur") || normalizedRole.includes("collaborator")
          ? t("sidebar.collaborator")
          : t("sidebar.user");

  return (
    <aside className="w-72 border-r border-orange-100/20 bg-white/70 p-5 flex flex-col h-screen backdrop-blur-md">
      {/* Logo and Title */}
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/logos/mafrah.png"
          alt="RHpro Logo"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <h2 className="text-lg font-semibold text-orange-400">RHpro</h2>
      </div>

      {/* User Info */}
      <div className="mb-4 rounded-xl border border-orange-200/20 bg-orange-50/10 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-400">
          {roleDisplay}
        </p>
        <p className="mt-0.5 text-xs text-stone-300">{displayName}</p>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? "border border-orange-300/30 bg-orange-100/20 font-medium text-orange-300"
                  : "text-stone-300 hover:bg-orange-50/10 hover:text-orange-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{item.icon}</span>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

