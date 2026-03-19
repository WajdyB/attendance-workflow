"use client";

import { useAuth } from "@/app/context/AuthContext";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const { user, databaseUser, logout } = useAuth();

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
    if (role.includes("admin")) return "border border-orange-200 bg-orange-100 text-orange-800";
    if (role.includes("manager")) return "border border-orange-200 bg-orange-50 text-orange-700";
    return "border border-orange-200 bg-white text-orange-700";
  };

  return (
    <div className="flex items-center justify-between border-b border-orange-100 bg-white/90 px-6 py-4 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Dashboard Overview</h1>
        <p className="text-xs text-stone-500">Attendance Workflow</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <span
          className={`${getRoleBadgeColor()} rounded-full px-3 py-1 text-xs font-medium`}
        >
          Role: {databaseUser?.role?.description || "Collaborator"}
        </span>

        {/* User Info */}
        <div className="flex items-center gap-3">
          {/* Avatar with Initials */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-sm font-semibold text-white">
            {getInitials()}
          </div>

          <div className="text-sm">
            <p className="font-semibold text-stone-900">{getDisplayName()}</p>
            <p className="text-stone-500">{getUserTitle()}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="ml-1 rounded-lg p-2 text-stone-500 transition-colors hover:bg-orange-50 hover:text-orange-700"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
