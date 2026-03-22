"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import RecentDocuments from "./documents";

export default function EmployeeProfile() {
  const { databaseUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-orange-100 p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  const user = databaseUser;
  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : "U";

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      {/* Profile Header */}
      <div className="p-6 border-b border-orange-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-stone-600 mt-1">
                {user?.jobTitle || "Developer"}
              </p>
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                FULL-TIME
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">ID</p>
            <p className="text-sm font-mono text-stone-600">
              {user?.id?.slice(-6).toUpperCase() || "RH-0402"}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Info - Grid Layout */}
      <div className="p-6 border-b border-orange-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">
              EMAIL ADDRESS
            </p>
            <p className="text-sm text-stone-700 mt-1">
              {user?.personalEmail || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">
              DEPARTMENT
            </p>
            <p className="text-sm text-stone-700 mt-1">Product & Engineering</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">
              JOINING DATE
            </p>
            <p className="text-sm text-stone-700 mt-1">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "March 12, 2021"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-6 border-b border-orange-100">
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "personal"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "documents"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab("employment")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "employment"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Employment
          </button>
          <button
            onClick={() => setActiveTab("benefits")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "benefits"
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Benefits
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Personal Info Tab */}
        {activeTab === "personal" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Phone</span>
              <span className="text-stone-700">
                {user?.phone || "+1 (555) 123-4567"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Location</span>
              <span className="text-stone-700">
                {user?.address || "San Francisco, CA"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Role</span>
              <span className="text-stone-700">
                {user?.role?.description || "Senior Product Designer"}
              </span>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div>
            <RecentDocuments />
          </div>
        )}

        {/* Employment Tab */}
        {activeTab === "employment" && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Employment Type</span>
              <span className="text-stone-700">Full-Time</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Department</span>
              <span className="text-stone-700">Product & Engineering</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Position</span>
              <span className="text-stone-700">
                {user?.jobTitle || "Senior Product Designer"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Manager</span>
              <span className="text-stone-700">Sarah Johnson</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Work Email</span>
              <span className="text-stone-700">
                {user?.workEmail || "alex.johnson@company.com"}
              </span>
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === "benefits" && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Health Insurance</span>
              <span className="text-stone-700 text-green-600">Active</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Dental Insurance</span>
              <span className="text-stone-700 text-green-600">Active</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Vision Insurance</span>
              <span className="text-stone-700 text-green-600">Active</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">401(k)</span>
              <span className="text-stone-700">5% Match</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50">
              <span className="text-stone-500">Paid Time Off</span>
              <span className="text-stone-700">20 days/year</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
