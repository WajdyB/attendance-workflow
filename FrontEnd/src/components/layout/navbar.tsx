"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { user, databaseUser, logout } = useAuth();
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);

  // State for notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "New timesheet approval needed",
      read: false,
      time: "5 min ago",
      type: "approval",
    },
    {
      id: 2,
      message: "Project deadline tomorrow",
      read: false,
      time: "1 hour ago",
      type: "deadline",
    },
    {
      id: 3,
      message: "Leave request pending",
      read: true,
      time: "2 hours ago",
      type: "request",
    },
    {
      id: 4,
      message: "Team meeting at 3 PM",
      read: false,
      time: "30 min ago",
      type: "meeting",
    },
  ]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark notification as read
  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        !(event.target as Element).closest(".notifications-dropdown")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval":
        return "✅";
      case "deadline":
        return "⏰";
      case "request":
        return "📋";
      case "meeting":
        return "📅";
      default:
        return "📌";
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (databaseUser?.firstName && databaseUser?.lastName) {
      return `${databaseUser.firstName[0]}${databaseUser.lastName[0]}`;
    }
    return user?.email?.[0].toUpperCase() || "U";
  };

  // Get display name
  const getDisplayName = () => {
    if (databaseUser?.firstName && databaseUser?.lastName) {
      return `${databaseUser.firstName} ${databaseUser.lastName}`;
    }
    return user?.email?.split("@")[0] || "User";
  };

  // Get job title or role
  const getUserTitle = () => {
    if (databaseUser?.jobTitle) {
      return databaseUser.jobTitle;
    }
    return databaseUser?.role?.description || "Team Member";
  };

  // Get role badge color based on role
  const getRoleBadgeColor = () => {
    const role = databaseUser?.role?.description?.toLowerCase() || "";
    if (role.includes("admin"))
      return "border border-orange-300/30 bg-orange-100/20 text-orange-300";
    if (role.includes("manager"))
      return "border border-orange-300/20 bg-orange-50/10 text-orange-200";
    return "border border-orange-300/20 bg-white/40 text-orange-200";
  };

  // Get initials for avatar display (first letters of first and last name)
  const avatarInitials = getInitials();

  return (
    <div className="flex items-center justify-between border-b border-orange-100/20 bg-white/60 px-6 py-4 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-semibold text-orange-300">
          {t("dashboard.title")}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <span
          className={`${getRoleBadgeColor()} rounded-full px-3 py-1 text-xs font-medium`}
        >
          {t("dashboard.role")}: {databaseUser?.role?.description || t("sidebar.collaborator")}
        </span>

        {/* Notification Bell with Badge */}
        <div className="relative notifications-dropdown">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-stone-300 hover:text-orange-300 transition rounded-lg hover:bg-orange-50/10"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white/90 rounded-xl shadow-lg border border-orange-100/20 z-50 backdrop-blur-md">
              <div className="p-3 border-b border-orange-100/20 flex justify-between items-center">
                <h3 className="font-semibold text-orange-300">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-orange-300 hover:text-orange-200"
                  >
                    {t("dashboard.markAllRead")}
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3 border-b border-orange-50/10 hover:bg-orange-50/10 cursor-pointer transition ${
                        !notif.read ? "bg-orange-50/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-xl">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${!notif.read ? "font-medium text-white" : "text-stone-300"}`}
                          >
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-stone-400">
                              {notif.time}
                            </p>
                            {!notif.read && (
                                  <span className="text-xs text-orange-300 font-medium">
                                {t("dashboard.new")}
                              </span>
                            )}
                          </div>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-2">🔔</div>
                    <p className="text-stone-300">{t("dashboard.noNotifications")}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {t("dashboard.allCaughtUp")}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-orange-100/20">
                <Link
                  href="/notifications"
                  className="block text-center text-sm text-orange-300 hover:text-orange-200 py-1"
                  onClick={() => setShowNotifications(false)}
                >
                  {t("dashboard.viewAllNotifications")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          {/* Avatar - shows image if exists, otherwise initials */}
          {databaseUser?.avatarUrl ? (
            <div className="relative">
              <Image
                src={databaseUser.avatarUrl}
                alt={getDisplayName()}
                width={36}
                height={36}
                className="rounded-full object-cover w-9 h-9 border-2 border-orange-200"
              />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
              {avatarInitials}
            </div>
          )}

          <div className="text-sm">
            <p className="font-semibold text-white">{getDisplayName()}</p>
            <p className="text-stone-300">{getUserTitle()}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="ml-1 rounded-lg p-2 text-stone-300 transition-colors hover:bg-orange-50/10 hover:text-orange-300"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}

