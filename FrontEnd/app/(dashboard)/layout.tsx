// app/(dashboard)/layout.tsx
"use client";

import Sidebar from "@/components/layout/sidebar";
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
        <div className="flex h-screen" style={{ background: "var(--bg)" }}>
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto p-6 md:p-8" style={{ color: "var(--text-1)" }}>
            {children}
          </main>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
