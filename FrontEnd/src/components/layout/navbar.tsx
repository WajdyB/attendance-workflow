"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LogOut,
  Bell,
  X,
  CalendarOff,
  Clock,
  FolderKanban,
  Star,
  Info,
  CheckCheck,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import apiConfig from "@/utils/api-config";
import { apiClient } from "@/utils/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  status: "SEEN" | "UNSEEN";
  createdAt: string;
}

type NotifType = "LEAVE_REQUEST" | "TIMESHEET" | "PROJECT" | "EVALUATION" | "SYSTEM";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseType(title: string | null | undefined): NotifType {
  if (!title) return "SYSTEM";
  const match = title.match(/^\[([A-Z_]+)\]/);
  if (!match) return "SYSTEM";
  const t = match[1] as NotifType;
  return (["LEAVE_REQUEST", "TIMESHEET", "PROJECT", "EVALUATION", "SYSTEM"].includes(t) ? t : "SYSTEM");
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

// ─── Type icon map ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  LEAVE_REQUEST: { icon: CalendarOff, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  TIMESHEET:     { icon: Clock,       color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  PROJECT:       { icon: FolderKanban, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  EVALUATION:    { icon: Star,        color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  SYSTEM:        { icon: Info,        color: "var(--text-3)", bg: "var(--surface-raised)" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, databaseUser, logout } = useAuth();
  const { t } = useLanguage();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
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

  // ─── Fetch notifications ───────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiClient.get<ApiNotification[]>(
        apiConfig.endpoints.notifications.byUser(userId),
        { silent: true }
      );
      setNotifications(data ?? []);
    } catch {
      // silently fail — notifications are non-critical
    }
  }, [userId]);

  // Initial load + polling every 60 s
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId, fetchNotifications]);

  // Reload when panel opens
  useEffect(() => {
    if (notificationsOpen && userId) {
      fetchNotifications();
    }
  }, [notificationsOpen, userId, fetchNotifications]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const markSeen = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "SEEN" } : n))
    );
    try {
      await apiClient.patch(apiConfig.endpoints.notifications.markSeen(id), {}, { silent: true });
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "SEEN" as const })));
    try {
      await apiClient.patch(
        apiConfig.endpoints.notifications.markAllSeen(userId),
        {},
        { silent: true }
      );
    } catch { /* silent */ }
  };

  // ─── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <header
      className="flex items-center justify-end px-6 py-3 flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Role badge */}
        {roleLabel && (
          <span className="badge badge-orange hidden sm:inline-flex">
            {roleLabel}
          </span>
        )}

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setNotificationsOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl transition"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
            }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--danger)" }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {/* ── Panel ── */}
          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-84 rounded-2xl overflow-hidden z-50"
              style={{
                width: 340,
                background: "var(--surface-overlay)",
                border: "1px solid var(--border-strong)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                    Notifications
                  </span>
                  {unread > 0 && (
                    <span
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                      style={{ background: "var(--danger)" }}
                    >
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unread > 0 && (
                    <button
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
                    onClick={() => setNotificationsOpen(false)}
                    style={{ color: "var(--text-3)" }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
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
                        onClick={() => isUnread && markSeen(n.id)}
                        className="flex items-start gap-3 px-4 py-3 transition cursor-pointer"
                        style={{
                          background: isUnread ? "rgba(249,115,22,0.04)" : "transparent",
                          borderBottom: "1px solid var(--border)",
                          cursor: isUnread ? "pointer" : "default",
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
                        {/* Icon */}
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
                          style={{ background: cfg.bg }}
                        >
                          <Icon size={15} style={{ color: cfg.color }} />
                        </div>

                        {/* Content */}
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
                          <p
                            className="text-[11px] mt-0.5 leading-snug"
                            style={{ color: "var(--text-3)" }}
                          >
                            {n.message}
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                            {relativeTime(n.createdAt)}
                          </p>
                        </div>

                        {/* Unread dot */}
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
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5">
          {databaseUser?.avatarUrl ? (
            <Image
              src={databaseUser.avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full object-cover w-8 h-8"
              style={{ border: "2px solid var(--border-strong)" }}
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {initials}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
              {displayName}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {databaseUser?.jobTitle ?? roleLabel}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Déconnexion"
          className="flex h-9 w-9 items-center justify-center rounded-xl transition"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
            (e.currentTarget as HTMLElement).style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
          }}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
