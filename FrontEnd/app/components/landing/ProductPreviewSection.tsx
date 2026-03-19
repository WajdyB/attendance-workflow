"use client";

import { useMemo, useState } from "react";
import SectionReveal from "./SectionReveal";

type PreviewTab = "dashboard" | "timesheets" | "leave" | "projects" | "performance";

const tabLabels: { id: PreviewTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "timesheets", label: "Timesheets" },
  { id: "leave", label: "Leave Calendar" },
  { id: "projects", label: "Projects" },
  { id: "performance", label: "Performance" },
];

const tabData: Record<
  PreviewTab,
  {
    title: string;
    subtitle: string;
    kpis: { label: string; value: string }[];
    rows: { name: string; status: string; metric: string }[];
  }
> = {
  dashboard: {
    title: "Operations Dashboard",
    subtitle: "Daily HR and workforce metrics in one role-based command center.",
    kpis: [
      { label: "Active Employees", value: "142" },
      { label: "Pending Approvals", value: "18" },
      { label: "Weekly Hours", value: "5,294" },
    ],
    rows: [
      { name: "Timesheet Batch", status: "Submitted", metric: "94% complete" },
      { name: "Leave Requests", status: "In Review", metric: "11 pending" },
      { name: "Project Allocation", status: "Balanced", metric: "82% utilization" },
    ],
  },
  timesheets: {
    title: "Weekly Timesheets",
    subtitle: "Track project effort with transparent approval states and lock rules.",
    kpis: [
      { label: "Submitted", value: "87" },
      { label: "Approved", value: "79" },
      { label: "Rejected", value: "8" },
    ],
    rows: [
      { name: "Engineering Team", status: "Approved", metric: "1,126h" },
      { name: "Finance Team", status: "Submitted", metric: "462h" },
      { name: "Marketing Team", status: "Draft", metric: "308h" },
    ],
  },
  leave: {
    title: "Leave Planning",
    subtitle: "Manage leave demand, team coverage, and balance updates in real time.",
    kpis: [
      { label: "Requests This Month", value: "34" },
      { label: "Approved", value: "26" },
      { label: "Remaining PTO", value: "1,184d" },
    ],
    rows: [
      { name: "Summer Window", status: "High Demand", metric: "12 requests" },
      { name: "Operations Team", status: "Stable", metric: "6% absent" },
      { name: "HR Team", status: "Optimal", metric: "2 planned leaves" },
    ],
  },
  projects: {
    title: "Project Time Visibility",
    subtitle: "Compare allocated budgets and actual effort across active initiatives.",
    kpis: [
      { label: "Active Projects", value: "21" },
      { label: "Tracked Hours", value: "8,420" },
      { label: "Over-Budget", value: "3" },
    ],
    rows: [
      { name: "ERP Migration", status: "In Progress", metric: "72% budget used" },
      { name: "Mobile Rollout", status: "On Track", metric: "58% budget used" },
      { name: "BI Reporting", status: "Watch", metric: "89% budget used" },
    ],
  },
  performance: {
    title: "Performance Reviews",
    subtitle: "Review cycles, outcomes, and recommendations with full history context.",
    kpis: [
      { label: "Reviews Completed", value: "96" },
      { label: "In Progress", value: "23" },
      { label: "Goal Alignment", value: "88%" },
    ],
    rows: [
      { name: "Q1 Review Cycle", status: "Running", metric: "67% complete" },
      { name: "Leadership Track", status: "Scheduled", metric: "14 employees" },
      { name: "Compensation Review", status: "Draft", metric: "9 proposals" },
    ],
  },
};

export default function ProductPreviewSection() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("dashboard");
  const data = useMemo(() => tabData[activeTab], [activeTab]);

  return (
    <SectionReveal className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
          Product Preview
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-900">Explore key workspaces</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 md:text-base">
          Switch between major product areas to preview the operational experience for HR teams, managers, and employees.
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-orange-100 bg-white/90 p-3 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white"
                  : "bg-orange-50 text-stone-600 hover:bg-orange-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-orange-100 bg-white p-5 md:p-6">
          <div className="transition-all duration-300">
            <h3 className="text-lg font-semibold text-stone-900">{data.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{data.subtitle}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {data.kpis.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-stone-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-orange-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-orange-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Metric</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.name} className="border-t border-orange-100">
                      <td className="px-4 py-3 text-stone-900">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{row.metric}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
