// app/(dashboard)/layout.tsx
"use client";

import Sidebar from "@/app/components/layout/sidebar";
import Navbar from "@/app/components/layout/navbar";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-orange-50 to-white">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Navbar />
            <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
          </div>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
