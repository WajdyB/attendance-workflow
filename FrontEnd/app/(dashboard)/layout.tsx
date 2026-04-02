// app/(dashboard)/layout.tsx
"use client";

import Sidebar from "@/components/layout/sidebar";
import DashboardHeader from "@/components/layout/dashboard-header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="flex h-screen min-h-0" style={{ background: "var(--bg)" }}>
          <Sidebar />
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <DashboardHeader />
            <main
              className="min-h-0 flex-1 overflow-auto px-6 py-6 md:px-8 md:py-8"
              style={{ color: "var(--text-1)" }}
            >
              {children}
            </main>
          </div>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
