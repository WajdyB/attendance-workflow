"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
}: ProtectedRouteProps) {
  const { isAuthenticated, databaseUser, isLoading } = useAuth();
  const router = useRouter();

  const hasRoleRestriction = requiredRoles.length > 0;
  const roleDescription = databaseUser?.role?.description;
  const roleNotAllowed =
    hasRoleRestriction && roleDescription && !requiredRoles.includes(roleDescription);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (
      hasRoleRestriction &&
      roleDescription &&
      !requiredRoles.includes(roleDescription)
    ) {
      router.push("/dashboard");
    }
  }, [
    isAuthenticated,
    isLoading,
    hasRoleRestriction,
    roleDescription,
    requiredRoles,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || roleNotAllowed) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

