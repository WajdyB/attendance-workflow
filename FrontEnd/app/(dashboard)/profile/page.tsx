"use client";

import EmployeeProfile from "@/components/settings/profile";

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

