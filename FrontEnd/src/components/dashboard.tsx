"use client";

import { Clock, FileText, FolderKanban, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type DashboardRole = "admin" | "manager" | "collaborator";

interface StatCard {
  label: string;
  value: string;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
}

export default function Dashboard() {
  const { databaseUser } = useAuth();
  const { t } = useLanguage();

  const getUserName = () => {
    if (databaseUser?.firstName && databaseUser?.lastName) {
      return `${databaseUser.firstName} ${databaseUser.lastName}`;
    }
    return t("dashboard.user");
  };

  const getRole = (): DashboardRole => {
    const normalizedRole = databaseUser?.role?.description?.toLowerCase().trim() || "";

    if (normalizedRole.includes("admin")) return "admin";
    if (normalizedRole.includes("manager")) return "manager";
    return "collaborator";
  };

  const role = getRole();

  const getRoleSubtitle = () => {
    if (role === "admin") return t("dashboard.role.admin");
    if (role === "manager") return t("dashboard.role.manager");
    return t("dashboard.role.collaborator");
  };

  const getStats = (): StatCard[] => {
    if (role === "admin") {
      return [
        { label: t("dashboard.stat.totalEmployees"), value: "42" },
        { label: t("dashboard.stat.activeProjects"), value: "8" },
        { label: t("dashboard.stat.pendingRequests"), value: "11" },
        { label: t("dashboard.stat.timesheetsSubmitted"), value: "34" },
      ];
    }

    if (role === "manager") {
      return [
        { label: t("dashboard.stat.teamMembers"), value: "9" },
        { label: t("dashboard.stat.toApprove"), value: "5" },
        { label: t("dashboard.stat.teamHoursWeek"), value: "312h" },
        { label: t("dashboard.stat.activeProjects"), value: "4" },
      ];
    }

    return [
      { label: t("dashboard.stat.weeklyHours"), value: "38h" },
      { label: t("dashboard.stat.timesheetStatus"), value: "DRAFT" },
      { label: t("dashboard.stat.pendingRequests"), value: "2" },
      { label: t("dashboard.stat.activeProjects"), value: "3" },
    ];
  };

  const getActivities = (): ActivityItem[] => {
    if (role === "admin") {
      return [
        {
          title: t("dashboard.activity.admin.title1"),
          description: t("dashboard.activity.admin.description1"),
          time: t("dashboard.activity.time2h"),
        },
        {
          title: t("dashboard.activity.admin.title2"),
          description: t("dashboard.activity.admin.description2"),
          time: t("dashboard.activity.time5h"),
        },
      ];
    }

    if (role === "manager") {
      return [
        {
          title: t("dashboard.activity.manager.title1"),
          description: t("dashboard.activity.manager.description1"),
          time: t("dashboard.activity.time1h"),
        },
        {
          title: t("dashboard.activity.manager.title2"),
          description: t("dashboard.activity.manager.description2"),
          time: t("dashboard.activity.time4h"),
        },
      ];
    }

    return [
      {
        title: t("dashboard.activity.collaborator.title1"),
        description: t("dashboard.activity.collaborator.description1"),
        time: t("dashboard.activity.time2h"),
      },
      {
        title: t("dashboard.activity.collaborator.title2"),
        description: t("dashboard.activity.collaborator.description2"),
        time: t("dashboard.activity.time5h"),
      },
    ];
  };

  const getFocusItems = () => {
    if (role === "admin") {
      return [
        { name: t("dashboard.focus.admin.item1"), progress: 85 },
        { name: t("dashboard.focus.admin.item2"), progress: 60 },
        { name: t("dashboard.focus.admin.item3"), progress: 40 },
      ];
    }

    if (role === "manager") {
      return [
        { name: t("dashboard.focus.manager.item1"), progress: 75 },
        { name: t("dashboard.focus.manager.item2"), progress: 50 },
        { name: t("dashboard.focus.manager.item3"), progress: 30 },
      ];
    }

    return [
      { name: t("dashboard.focus.collaborator.item1"), progress: 75 },
      { name: t("dashboard.focus.collaborator.item2"), progress: 40 },
      { name: t("dashboard.focus.collaborator.item3"), progress: 90 },
    ];
  };

  const stats = getStats();
  const activities = getActivities();
  const focusItems = getFocusItems();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-orange-300">
          {t("dashboard.welcomeBack")}, {getUserName()}.
        </h1>
        <p className="mt-1 text-sm text-stone-300">
          {getRoleSubtitle()} • {t("dashboard.todayOverview")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((item, index) => {
          const icons = [Clock, FileText, FolderKanban, ClipboardList];
          const Icon = icons[index] ?? Clock;

          return (
            <div key={item.label} className="rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100/20">
                <Icon size={18} className="text-orange-300" />
              </div>

              <p className="mt-3 text-sm text-stone-300">{item.label}</p>
              <h2 className="text-2xl font-bold text-white">{item.value}</h2>
            </div>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="md:col-span-2 rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-orange-300">{t("dashboard.recentActivity")}</h3>
            <button className="text-sm font-medium text-orange-300 hover:text-orange-200">
              {t("dashboard.viewAll")}
            </button>
          </div>

          <div className="space-y-4 text-sm">
            {activities.map((activity) => (
              <div key={activity.title} className="flex justify-between">
                <div>
                  <p className="font-medium text-white">{activity.title}</p>
                  <p className="text-stone-300">{activity.description}</p>
                </div>
                <span className="text-stone-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Focus Items */}
        <div className="rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-orange-300">
            {t("dashboard.focusTitle")}
          </h3>

          <div className="space-y-4">
            {focusItems.map((item) => (
              <div key={item.name}>
                <p className="text-sm text-stone-200">{item.name}</p>
                <div className="h-2 w-full rounded bg-orange-100/10">
                  <div className="h-2 rounded bg-orange-500" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

