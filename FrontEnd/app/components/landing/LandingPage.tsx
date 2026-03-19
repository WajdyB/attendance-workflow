"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  Gauge,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LandingNavbar from "./LandingNavbar";
import ProductPreviewSection from "./ProductPreviewSection";
import SectionReveal from "./SectionReveal";

const valueItems = [
  "Single Source of Truth",
  "Transparent Workflows",
  "Secure HR Data",
  "Project Time Visibility",
  "Role-Based Access",
];

const featureCards = [
  { icon: Users, title: "Employee Records", description: "Centralized profiles, contracts, and structured HR data." },
  { icon: FileText, title: "Timesheets", description: "Weekly submissions with controlled approval states and locks." },
  { icon: CalendarClock, title: "Leave & Absence Management", description: "Track balances, approvals, and planning calendars." },
  { icon: FolderKanban, title: "Project Tracking", description: "Link hours to projects and monitor budget utilization." },
  { icon: UserCog, title: "Performance Reviews", description: "Capture evaluations, goals, and progression history." },
  { icon: BarChart3, title: "Analytics & Reporting", description: "Operational insights for HR and management decisions." },
  { icon: ShieldCheck, title: "Role-Based Security", description: "Enforce permissions by collaborator, manager, and admin scope." },
  { icon: Briefcase, title: "Document Management", description: "Organized document metadata, traceability, and access control." },
];

const counters = [
  { label: "Approval actions processed", target: 1280, suffix: "+" },
  { label: "Monthly timesheet entries", target: 5400, suffix: "+" },
  { label: "Active HR records", target: 140, suffix: "" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let startTime = 0;
    const duration = 1200;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX / 100, y: event.clientY / 100 });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const floatingStyle = useMemo(
    () => ({ transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0)` }),
    [mousePosition]
  );

  return (
    <main id="top" className="relative overflow-x-hidden bg-orange-50/40 text-stone-900">
      <LandingNavbar />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="absolute right-0 top-64 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-36">
        <SectionReveal className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-orange-700">
              Modern HR Operating Platform
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              The Smart HR Workflow Platform for Time, Leave, Projects, and Performance
            </h1>
            <p className="mt-5 max-w-2xl text-base text-stone-600 md:text-lg">
              Centralize employee records, timesheets, leave approvals, project tracking, and performance management in one secure,
              transparent system designed for internal enterprise teams.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-700"
              >
                Get Started
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                Book a Demo
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {counters.map((item) => (
                <div key={item.label} className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-semibold text-stone-900">
                    <AnimatedCounter target={item.target} suffix={item.suffix} />
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-orange-100 bg-white/90 p-5 shadow-xl backdrop-blur-sm md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Executive Dashboard Preview</p>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">Live</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <p className="text-xs text-stone-500">Timesheet Completion</p>
                  <p className="mt-1 text-lg font-semibold">94%</p>
                  <div className="mt-2 h-2 rounded-full bg-orange-100">
                    <div className="h-2 w-[94%] rounded-full bg-orange-600" />
                  </div>
                </div>
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <p className="text-xs text-stone-500">Leave Requests</p>
                  <p className="mt-1 text-lg font-semibold">11 pending</p>
                  <p className="mt-2 text-xs text-orange-700">Approval queue healthy</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-orange-100">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-orange-50 text-stone-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Module</th>
                      <th className="px-3 py-2 font-medium">State</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-orange-100">
                      <td className="px-3 py-2">Timesheet Batch</td>
                      <td className="px-3 py-2 text-orange-700">Approved</td>
                      <td className="px-3 py-2">Manager</td>
                    </tr>
                    <tr className="border-t border-orange-100">
                      <td className="px-3 py-2">Leave Workflow</td>
                      <td className="px-3 py-2 text-orange-700">In Review</td>
                      <td className="px-3 py-2">HR</td>
                    </tr>
                    <tr className="border-t border-orange-100">
                      <td className="px-3 py-2">Performance Cycle</td>
                      <td className="px-3 py-2 text-orange-700">Active</td>
                      <td className="px-3 py-2">Leadership</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={floatingStyle}
              className="absolute -left-6 top-8 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">Timesheet Approved</p>
            </div>
            <div
              style={{ transform: `translate3d(${mousePosition.x * -0.7}px, ${mousePosition.y * -0.7}px, 0)` }}
              className="absolute -right-8 top-24 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">Leave Request Submitted</p>
            </div>
            <div
              style={{ transform: `translate3d(${mousePosition.x * 0.6}px, ${mousePosition.y * 0.6}px, 0)` }}
              className="absolute -left-3 bottom-8 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">Project Hours Tracked</p>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <SectionReveal className="grid gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm md:grid-cols-5 md:p-5">
          {valueItems.map((item) => (
            <div key={item} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-center text-xs font-medium text-stone-700 md:text-sm">
              {item}
            </div>
          ))}
        </SectionReveal>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <SectionReveal>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Features Overview</p>
            <h2 className="mt-2 text-3xl font-semibold">Built for modern HR operations</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 md:text-base">
              Each module is designed to improve clarity, control, and accountability while keeping workflows practical and transparent.
            </p>
          </div>
        </SectionReveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature, index) => (
            <SectionReveal key={feature.title} delayMs={index * 60}>
              <article className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-md">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700 transition group-hover:bg-orange-200">
                  <feature.icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{feature.description}</p>
              </article>
            </SectionReveal>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <SectionReveal className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Workflow</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Structured approval flows with full transparency</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="text-base font-semibold">Timesheet Approval Flow</h3>
              <ol className="mt-4 space-y-3 text-sm text-stone-600">
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">1</span>Employee submits timesheet</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">2</span>Manager reviews entry details</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">3</span>Approval or rejection with comment</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">4</span>Approved sheet is locked and archived</li>
              </ol>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="text-base font-semibold">Leave Request Flow</h3>
              <ol className="mt-4 space-y-3 text-sm text-stone-600">
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">1</span>Request submitted with period and type</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">2</span>Manager receives notification</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">3</span>Decision updates request status</li>
                <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">4</span>Approved leave updates balance and calendar</li>
              </ol>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <ProductPreviewSection />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8 md:py-8">
        <SectionReveal className="grid gap-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Why It Matters</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">Business value beyond administration</h2>
            <div className="mt-5 space-y-3 text-sm text-stone-600 md:text-base">
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 text-orange-600" size={16} />Reduce manual HR processes and repetitive coordination overhead.</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 text-orange-600" size={16} />Improve visibility without introducing micromanagement behavior.</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 text-orange-600" size={16} />Track time by project accurately for better financial and planning decisions.</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 text-orange-600" size={16} />Simplify approvals, audits, and internal governance controls.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <Gauge className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">Operational Clarity</p>
              <p className="mt-1 text-xs text-stone-600">Live status across approvals, workload, and team activity.</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <Lock className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">Sensitive Data Control</p>
              <p className="mt-1 text-xs text-stone-600">Access policies aligned with role responsibilities and scope.</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <BadgeCheck className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">Audit Readiness</p>
              <p className="mt-1 text-xs text-stone-600">Traceability across actions, approvals, and changes.</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <BarChart3 className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">Strategic Insight</p>
              <p className="mt-1 text-xs text-stone-600">Analytics-ready data model for operational and leadership reporting.</p>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section id="security" className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <SectionReveal className="rounded-2xl border border-orange-200 bg-orange-900 p-6 text-orange-50 shadow-xl md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-200">Security & Access</p>
          <h2 className="mt-2 text-3xl font-semibold">Enterprise-ready governance for HR data</h2>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              "Role-based access and permissions",
              "Secure authentication workflow",
              "Sensitive data protection controls",
              "Audit logs for critical actions",
              "Document access traceability",
              "Backup and recovery support",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-orange-700 bg-orange-800/80 p-4 text-sm text-orange-50">
                {item}
              </div>
            ))}
          </div>
        </SectionReveal>
      </section>

      <section id="ai-roadmap" className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8 md:py-8">
        <SectionReveal className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2 text-orange-700">
            <Sparkles size={18} />
            <p className="text-sm font-semibold uppercase tracking-wide">AI Roadmap</p>
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">AI-Enhanced HR Intelligence, Coming Next</h2>
          <p className="mt-3 max-w-3xl text-sm text-stone-600 md:text-base">
            AI capabilities are planned as a future enhancement after core workflow maturity, focusing on anomaly detection,
            predictive workload signals, leave pattern analysis, and intelligent reporting assistance.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-white/90 p-4 text-sm text-stone-700">Timesheet anomaly detection and consistency checks</div>
            <div className="rounded-xl border border-orange-100 bg-white/90 p-4 text-sm text-stone-700">Leave pattern analysis for operational risk awareness</div>
            <div className="rounded-xl border border-orange-100 bg-white/90 p-4 text-sm text-stone-700">Predictive workload and allocation insights</div>
            <div className="rounded-xl border border-orange-100 bg-white/90 p-4 text-sm text-stone-700">Assistant-driven reporting and workflow recommendations</div>
          </div>
        </SectionReveal>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <SectionReveal className="rounded-3xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-10 text-white shadow-xl md:px-10">
          <h2 className="text-3xl font-semibold">Modernize HR workflows with one trusted platform</h2>
          <p className="mt-3 max-w-2xl text-sm text-orange-100 md:text-base">
            Manage people, time, approvals, and performance in one connected system designed for operational excellence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
            >
              Launch the Platform
            </Link>
            <a
              href="#contact"
              className="rounded-lg border border-orange-300 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-700"
            >
              Request a Demo
            </a>
          </div>
        </SectionReveal>
      </section>

      <footer id="contact" className="border-t border-orange-100 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Attendance Workflow</h3>
            <p className="mt-2 text-sm text-stone-600">
              Internal HR platform for employee management, timesheets, leave requests, project tracking, and performance operations.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">Navigation</p>
            <ul className="mt-2 space-y-2 text-sm text-stone-600">
              <li><a className="hover:text-orange-700" href="#features">Features</a></li>
              <li><a className="hover:text-orange-700" href="#workflow">Workflow</a></li>
              <li><a className="hover:text-orange-700" href="#security">Security</a></li>
              <li><a className="hover:text-orange-700" href="#ai-roadmap">AI Roadmap</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">Contact</p>
            <p className="mt-2 text-sm text-stone-600">For enterprise onboarding and demos, contact the HR systems administrator.</p>
            <a href="/auth/login" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-800">
              Login to Platform
              <ChevronRight size={14} />
            </a>
          </div>
        </div>
        <div className="border-t border-orange-100 py-4 text-center text-xs text-stone-500">
          © 2026 Attendance Workflow. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
