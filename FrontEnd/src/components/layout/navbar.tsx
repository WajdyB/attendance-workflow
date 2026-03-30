"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { usePathname } from "next/navigation";
import { LogOut, Bell, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/employees":    "Employés",
  "/projects":     "Projets",
  "/timesheets":   "Feuilles de temps",
  "/roles-depots": "Rôles & Départements",
  "/requests":     "Congés & Absences",
  "/approvals":    "Approbations",
  "/performance":  "Performance",
  "/profile":      "Mon dossier",
};

interface Notification {
  id: number;
  message: string;
  read: boolean;
  time: string;
  type: "approval" | "deadline" | "request" | "meeting";
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, message: "Nouvelle feuille de temps à approuver", read: false, time: "5 min", type: "approval" },
  { id: 2, message: "Échéance projet demain", read: false, time: "1h", type: "deadline" },
  { id: 3, message: "Demande de congé en attente", read: true, time: "2h", type: "request" },
  { id: 4, message: "Réunion d'équipe à 15h", read: false, time: "30 min", type: "meeting" },
];

export default function Navbar() {
  const { user, databaseUser, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  const pageTitle =
    ROUTE_TITLES[pathname] ??
    Object.entries(ROUTE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ??
    "Dashboard";

  const displayName =
    databaseUser?.firstName && databaseUser?.lastName
      ? `${databaseUser.firstName} ${databaseUser.lastName}`
      : user?.email?.split("@")[0] ?? "Utilisateur";

  const initials =
    databaseUser?.firstName && databaseUser?.lastName
      ? `${databaseUser.firstName[0]}${databaseUser.lastName[0]}`
      : (user?.email?.[0]?.toUpperCase() ?? "U");

  const roleLabel = databaseUser?.role?.description ?? "";

  const markAsRead = (id: number) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-6 py-3 flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Page title */}
      <h1 className="page-title">{pageTitle}</h1>

      <div className="flex items-center gap-3">
        {/* Role badge */}
        {roleLabel && (
          <span
            className="badge badge-orange hidden sm:inline-flex"
          >
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
                className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--danger)" }}
              >
                {unread}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
              style={{
                background: "var(--surface-overlay)",
                border: "1px solid var(--border-strong)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  Notifications
                </span>
                <div className="flex items-center gap-3">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs"
                      style={{ color: "var(--accent)" }}
                    >
                      Tout lire
                    </button>
                  )}
                  <button onClick={() => setNotificationsOpen(false)} style={{ color: "var(--text-3)" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition"
                    style={{
                      background: !n.read ? "rgba(249,115,22,0.04)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-raised)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = !n.read ? "rgba(249,115,22,0.04)" : "transparent")}
                  >
                    <div
                      className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: !n.read ? "var(--accent)" : "transparent" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs leading-snug"
                        style={{ color: !n.read ? "var(--text-1)" : "var(--text-2)", fontWeight: !n.read ? 500 : 400 }}
                      >
                        {n.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                        {n.time}
                      </p>
                    </div>
                  </div>
                ))}
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
