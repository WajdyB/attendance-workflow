"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  FolderKanban,
  Clock,
  Bell,
  X,
  LogOut,
  CalendarOff,
  Info,
  CheckCheck,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import apiConfig from "@/utils/api-config";
import { apiClient } from "@/utils/api-client";

// ─── Notifications (types / helpers) ─────────────────────────────────────────

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
  const tt = match[1] as NotifType;
  return ["LEAVE_REQUEST", "TIMESHEET", "PROJECT", "EVALUATION", "SYSTEM"].includes(tt)
    ? tt
    : "SYSTEM";
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

const iconShellClass =
  "relative flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border transition outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40";

const iconShellStyle: CSSProperties = {
  color: "var(--text-2)",
  background: "var(--surface-raised)",
  borderColor: "var(--border)",
};

// ─── Header (matches page body `--bg`, not sidebar `--surface`) ───────────────

export default function DashboardHeader() {
  const { user, databaseUser, isAuthenticated, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const headerRef = useRef<HTMLElement | null>(null);
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

  const profilePhotoSrc =
    databaseUser?.pictureUrl?.trim() || databaseUser?.avatarUrl?.trim() || null;

  /** Load `pictureUrl` from API — persisted auth JSON from login often omits it until synced */
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await apiClient.get<{ pictureUrl?: string | null }>(
          apiConfig.endpoints.users.byId(userId),
          { silent: true },
        );
        if (cancelled || u == null) return;
        updateUser({ pictureUrl: u.pictureUrl ?? null });
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once per user id; updateUser is not stable
  }, [userId]);

  const roleDesc = databaseUser?.role?.description?.toLowerCase() ?? "";
  const roleDisplay = roleDesc.includes("admin")
    ? t("sidebar.administrator")
    : roleDesc.includes("manager")
      ? t("sidebar.manager")
      : roleDesc.includes("collaborat")
        ? t("sidebar.collaborator")
        : t("sidebar.user");

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
      const target = e.target as Node;
      if (headerRef.current?.contains(target)) return;
      setNotificationsOpen(false);
      setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (pathname === "/auth/login" || !isAuthenticated) return null;

  const openUserMenu = () => {
    setUserMenuOpen((v) => !v);
    setNotificationsOpen(false);
  };

  const openNotifications = () => {
    setNotificationsOpen((v) => !v);
    setUserMenuOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className="flex h-16 flex-shrink-0 items-center justify-end gap-2 border-b px-6 md:px-8"
      style={{
        background: "var(--bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        {/* Notifications: icon only */}
        <div className="relative">
          <button
            type="button"
            onClick={openNotifications}
            className={iconShellClass}
            style={iconShellStyle}
            aria-expanded={notificationsOpen}
            aria-haspopup="listbox"
            aria-label={t("sidebar.notifications")}
            title={t("sidebar.notifications")}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            <Bell size={18} strokeWidth={1.9} />
            {unread > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                style={{ background: "var(--danger)" }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(340px,calc(100vw-2rem))] max-h-[min(420px,70vh)] overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: "var(--surface-overlay)",
                border: "1px solid var(--border-strong)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              }}
            >
              <div
                className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Bell size={16} style={{ color: "var(--accent)" }} aria-hidden />
                  {unread > 0 && (
                    <span
                      className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                      style={{ background: "var(--danger)" }}
                    >
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-80"
                      style={{ color: "var(--accent)" }}
                      title="Tout marquer comme lu"
                      aria-label="Tout marquer comme lu"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    style={{ color: "var(--text-3)" }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:opacity-70"
                    aria-label="Fermer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "min(360px, calc(70vh - 52px))" }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
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
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 transition"
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
                          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ background: cfg.bg }}
                        >
                          <Icon size={15} style={{ color: cfg.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs leading-snug"
                            style={{
                              color: isUnread ? "var(--text-1)" : "var(--text-2)",
                              fontWeight: isUnread ? 600 : 400,
                            }}
                          >
                            {parseTitle(n.title)}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-3)" }}>
                            {n.message}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                            {relativeTime(n.createdAt)}
                          </p>
                        </div>
                        {isUnread && (
                          <div
                            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
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
        </div>

        {/* User: orange circle → popover */}
        <div className="relative">
          <button
            type="button"
            onClick={openUserMenu}
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-sm transition outline-none ring-2 ring-transparent hover:brightness-110 focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)]"
            style={{ background: profilePhotoSrc ? "var(--surface-raised)" : "var(--accent)" }}
            aria-expanded={userMenuOpen}
            aria-haspopup="dialog"
            title={displayName}
          >
            {profilePhotoSrc ? (
              <img src={profilePhotoSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(calc(100vw-2rem),17rem)] overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: "var(--surface-overlay)",
                border: "1px solid var(--border-strong)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              }}
              role="dialog"
              aria-label={displayName}
            >
              <div className="flex items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                    {displayName}
                  </p>
                  <span
                    className="mt-2 inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                    }}
                  >
                    {roleDisplay}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex-shrink-0 rounded-lg p-1 transition hover:opacity-70"
                  style={{ color: "var(--text-3)" }}
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-2">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                  style={{ color: "var(--text-1)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <User size={16} style={{ color: "var(--accent)" }} />
                  {t("sidebar.myDossier")}
                </Link>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={logout}
          aria-label={t("dashboard.logout")}
          title="Déconnexion"
          className={iconShellClass}
          style={iconShellStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
            (e.currentTarget as HTMLElement).style.color = "#f87171";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
        >
          <LogOut size={18} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
