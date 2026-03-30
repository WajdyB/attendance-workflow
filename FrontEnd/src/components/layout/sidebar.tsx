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
  Bell,
  X,
  LogOut,
  CalendarOff,
  Info,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import apiConfig from "@/utils/api-config";
import { apiClient } from "@/utils/api-client";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// ─── Notifications (shared types / helpers) ─────────────────────────────────

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  status: "SEEN" | "UNSEEN";
  createdAt: string;
}

type NotifType = "LEAVE_REQUEST" | "TIMESHEET" | "PROJECT" | "EVALUATION" | "SYSTEM";

function parseType(title: string | null | undefined): NotifType {
  if (!title) return "SYSTEM";
  const match = title.match(/^\[([A-Z_]+)\]/);
  if (!match) return "SYSTEM";
  const t = match[1] as NotifType;
  return ["LEAVE_REQUEST", "TIMESHEET", "PROJECT", "EVALUATION", "SYSTEM"].includes(t) ? t : "SYSTEM";
}

function parseTitle(title: string | null | undefined): string {
  if (!title) return "Notification";
  return title.replace(/^\[[A-Z_]+\]\s*/, "");
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "À l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const TYPE_CONFIG: Record<NotifType, { icon: LucideIcon; color: string; bg: string }> = {
  LEAVE_REQUEST: { icon: CalendarOff, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  TIMESHEET: { icon: Clock, color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  PROJECT: { icon: FolderKanban, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  EVALUATION: { icon: Star, color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  SYSTEM: { icon: Info, color: "var(--text-3)", bg: "var(--surface-raised)" },
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, databaseUser, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const footerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = databaseUser?.id;
  const unread = notifications.filter((n) => n.status === "UNSEEN").length;

  const displayName =
    databaseUser?.firstName && databaseUser?.lastName
      ? `${databaseUser.firstName} ${databaseUser.lastName}`
      : user?.email?.split("@")[0] ?? "Utilisateur";

  const initials =
    databaseUser?.firstName && databaseUser?.lastName
      ? `${databaseUser.firstName[0]}${databaseUser.lastName[0]}`
      : (user?.email?.[0]?.toUpperCase() ?? "U");

  const roleLabel = databaseUser?.role?.description ?? "";
  const jobLine = databaseUser?.jobTitle ?? roleLabel;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiClient.get<ApiNotification[]>(
        apiConfig.endpoints.notifications.byUser(userId),
        { silent: true },
      );
      setNotifications(data ?? []);
    } catch {
      /* non-critical */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (notificationsOpen && userId) fetchNotifications();
  }, [notificationsOpen, userId, fetchNotifications]);

  const markSeen = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "SEEN" } : n)));
    try {
      await apiClient.patch(apiConfig.endpoints.notifications.markSeen(id), {}, { silent: true });
    } catch {
      /* silent */
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "SEEN" as const })));
    try {
      await apiClient.patch(apiConfig.endpoints.notifications.markAllSeen(userId), {}, { silent: true });
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (footerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        { label: t("sidebar.rolesDepots"), href: "/roles-depots", icon: Building2 },
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
      className="w-64 flex flex-col h-screen flex-shrink-0 relative z-40"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-dim)" }}
        >
          <Image src="/logos/logo.svg" alt="RHpro" width={18} height={18} />
        </div>
        <span className="text-base font-semibold" style={{ color: "var(--text-1)" }}>
          RHpro
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 min-h-0">
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

      {/* Footer: profile, role, notifications, logout */}
      <div
        ref={footerRef}
        className="flex-shrink-0 border-t px-3 pt-3 pb-4 space-y-3"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="flex gap-3 rounded-xl p-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          {databaseUser?.avatarUrl ? (
            <Image
              src={databaseUser.avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="rounded-full object-cover w-10 h-10 flex-shrink-0"
              style={{ border: "2px solid var(--border-strong)" }}
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: "var(--text-1)" }}>
              {displayName}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>
              {jobLine || "—"}
            </p>
            {roleLabel && (
              <span
                className="inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                }}
              >
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setNotificationsOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              style={{
                color: "var(--text-2)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
              }}
            >
              <Bell size={17} />
              <span>{t("sidebar.notifications")}</span>
              {unread > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ background: "var(--danger)" }}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Déconnexion"
            className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl transition"
            style={{
              color: "var(--text-3)",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Notifications panel — opens to the right of the sidebar */}
      {notificationsOpen && (
        <div
          ref={panelRef}
          className="fixed z-[100] w-[min(340px,calc(100vw-5rem))] max-h-[min(420px,70vh)] overflow-hidden rounded-2xl shadow-2xl"
          style={{
            left: "calc(16rem + 0.75rem)",
            bottom: "1rem",
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {t("sidebar.notifications")}
              </span>
              {unread > 0 && (
                <span
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: "var(--danger)" }}
                >
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={13} />
                  Tout lire
                </button>
              )}
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                style={{ color: "var(--text-3)" }}
                className="p-1 rounded-lg hover:opacity-70"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "min(360px, calc(70vh - 52px))" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={28} style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>
                  Aucune notification
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const type = parseType(n.title);
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                const isUnread = n.status === "UNSEEN";
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => isUnread && markSeen(n.id)}
                    onKeyDown={(e) => e.key === "Enter" && isUnread && markSeen(n.id)}
                    className="flex items-start gap-3 px-4 py-3 transition cursor-pointer"
                    style={{
                      background: isUnread ? "rgba(249,115,22,0.04)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isUnread
                        ? "rgba(249,115,22,0.04)"
                        : "transparent";
                    }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs leading-snug"
                        style={{
                          color: isUnread ? "var(--text-1)" : "var(--text-2)",
                          fontWeight: isUnread ? 600 : 400,
                        }}
                      >
                        {parseTitle(n.title)}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--text-3)" }}>
                        {n.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    {isUnread && (
                      <div
                        className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
