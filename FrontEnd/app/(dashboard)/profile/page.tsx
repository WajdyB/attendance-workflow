"use client";

import EmployeeProfile from "@/app/components/settings/profile";
import RecentDocuments from "@/app/components/settings/documents";

export default function ProfilePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Profile Section - Full Width */}
        <EmployeeProfile />
      </div>
    </div>
  );
}
