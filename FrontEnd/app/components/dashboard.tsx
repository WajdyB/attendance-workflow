"use client";

import { Clock, FileText, FolderKanban, ClipboardList } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
export default function Dashboard() {
  const { databaseUser } = useAuth();

  const getUserName = () => {
    if (databaseUser?.firstName && databaseUser?.lastName) {
      return `${databaseUser.firstName} ${databaseUser.lastName}`;
    }
    return "User";
  };

  const getJobTitle = () => {
    return databaseUser?.jobTitle || "Team Member";
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Welcome back, {getUserName()}.
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {getJobTitle()} • Here is what is happening with your projects today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Clock size={18} className="text-orange-700" />
          </div>

          <p className="mt-3 text-sm text-stone-500">Weekly Hours</p>
          <h2 className="text-2xl font-bold text-stone-900">38h</h2>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <FileText size={18} className="text-orange-700" />
          </div>
          <p className="mt-3 text-sm text-stone-500">Timesheet Status</p>
          <h2 className="text-2xl font-bold text-stone-900">DRAFT</h2>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <FolderKanban size={18} className="text-orange-700" />
          </div>
          <p className="mt-3 text-sm text-stone-500">Pending Requests</p>
          <h2 className="text-2xl font-bold text-stone-900">2</h2>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <ClipboardList size={18} className="text-orange-700" />
          </div>
          <p className="mt-3 text-sm text-stone-500">Active Projects</p>
          <h2 className="text-2xl font-bold text-stone-900">3</h2>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="md:col-span-2 rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-stone-900">Recent Activity</h3>
            <button className="text-sm font-medium text-orange-700 hover:text-orange-800">
              View all
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-medium text-stone-900">
                  Holiday Request Approved
                </p>
                <p className="text-stone-500">
                  Your request for Oct 24 - Oct 28 has been approved.
                </p>
              </div>
              <span className="text-stone-400">2h ago</span>
            </div>

            <div className="flex justify-between">
              <div>
                <p className="font-medium text-stone-900">
                  New Project Assigned
                </p>
                <p className="text-stone-500">
                  You have been added to the Horizon UI Redesign project.
                </p>
              </div>
              <span className="text-stone-400">5h ago</span>
            </div>
          </div>
        </div>

        {/* Assigned Projects */}
        <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-stone-900">
            Assigned Projects
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-stone-700">Horizon UI Redesign</p>
              <div className="h-2 w-full rounded bg-orange-100">
                <div className="h-2 w-[75%] rounded bg-orange-600" />
              </div>
            </div>

            <div>
              <p className="text-sm text-stone-700">Client Portal Launch</p>
              <div className="h-2 w-full rounded bg-orange-100">
                <div className="h-2 w-[40%] rounded bg-orange-600" />
              </div>
            </div>

            <div>
              <p className="text-sm text-stone-700">Mobile App V2</p>
              <div className="h-2 w-full rounded bg-orange-100">
                <div className="h-2 w-[90%] rounded bg-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
