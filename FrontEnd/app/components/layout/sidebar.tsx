// components/Sidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { databaseUser, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  // Get user role from databaseUser (keep original case for display)
  const userRole = databaseUser?.role?.description || "";

  // Don't show sidebar on login page
  if (pathname === "/auth/login") return null;

  // Define menu items based on role
  const getMenuItems = () => {
    // Base items for all authenticated users
    const baseItems = [{ name: "Dashboard", href: "/dashboard", icon: "📊" }];

    // Admin items
    if (userRole === "Admin") {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: "Employees", href: "/employees", icon: "👥" },
        { name: "Projects", href: "/projects", icon: "📁" },
        { name: "Roles & Depots", href: "/roles-depots", icon: "🏢" },
        { name: "Requests", href: "/requests", icon: "📋" },
        { name: "Settings", href: "/profile", icon: "⚙️" },
      ];
    }

    // Collaborator items
    if (userRole === "Collaborateur") {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: "Timesheets", href: "/timesheets", icon: "⏱️" },
        { name: "Projects", href: "/projects", icon: "📁" },
        { name: "Requests", href: "/requests", icon: "📨" },
        { name: "Settings", href: "/profile", icon: "⚙️" },
        { name: "My Dossier", href: "/dossier", icon: "📄" },
      ];
    }

    // Manager items
    if (userRole === "Manager") {
      // Match exactly what's in DB
      return [
        ...baseItems,
        { name: "Approvals", href: "/approvals", icon: "✅" },
        { name: "Timesheets", href: "/timesheets", icon: "⏱️" },
        { name: "Projects", href: "/projects", icon: "📁" },
        { name: "Settings", href: "/profile", icon: "⚙️" },
        { name: "My Dossier", href: "/dossier", icon: "📄" },
        { name: "Evaluations", href: "/evaluations", icon: "⭐" },
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
    : "User";

  // Get user role display (for UI)
  const roleDisplay =
    userRole === "Admin"
      ? "Administrator"
      : userRole === "Manager"
        ? "Manager"
        : userRole === "Collaborateur"
          ? "Collaborator" // Keep French in check, show English in UI
          : "User";

  return (
    <aside className="w-72 border-r border-orange-100 bg-white/95 p-5 flex flex-col h-screen">
      {/* Logo and Title */}
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-orange-100 p-2">
          <Image src="/logos/logo.svg" alt="Logo" width={40} height={40} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">RHpro</h2>
          <p className="text-xs text-stone-500">Attendance Workflow</p>
        </div>
      </div>

      {/* User Info */}
      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
          {roleDisplay}
        </p>
        <p className="mt-0.5 text-xs text-stone-600">{displayName}</p>
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
                  ? "border border-orange-200 bg-orange-100 font-medium text-orange-800"
                  : "text-stone-700 hover:bg-orange-50 hover:text-orange-700"
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
