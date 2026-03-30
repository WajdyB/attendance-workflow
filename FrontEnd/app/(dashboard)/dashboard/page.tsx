"use client";

import { useAuth } from "@/context/AuthContext";
import Dashboard from "@/components/dashboard";
import AdminDashboard from "@/components/admin-dashboard";
import ManagerDashboard from "@/components/manager-dashboard";

export default function DashboardPage() {
  const { databaseUser } = useAuth();
  const role = databaseUser?.role?.description?.toLowerCase() ?? "";
  const isAdmin = role.includes("admin");
  const isManager = role.includes("manager");

  if (isAdmin) return <AdminDashboard />;
  if (isManager) return <ManagerDashboard />;
  return <Dashboard />;
}
