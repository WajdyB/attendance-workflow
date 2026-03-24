"use client";

import Link from "next/link";
import Image from "next/image";
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
import { useLanguage } from "@/context/LanguageContext";

const featureIcons = [
  Users,
  FileText,
  CalendarClock,
  FolderKanban,
  UserCog,
  BarChart3,
  ShieldCheck,
  Briefcase,
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
  const { language } = useLanguage();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const content = useMemo(
    () =>
      language === "fr"
        ? {
            badge: "Plateforme RH moderne",
            heroTitle:
              "La plateforme RH intelligente pour le temps, les congés, les projets et la performance",
            heroDescription:
              "Centralisez les dossiers employés, les feuilles de temps, les validations de congés, le suivi de projets et la gestion de performance dans un système sécurisé et transparent.",
            getStarted: "Commencer",
            demo: "Demander une démo",
            counters: [
              { label: "Actions d'approbation traitées", target: 1280, suffix: "+" },
              { label: "Feuilles de temps mensuelles", target: 5400, suffix: "+" },
              { label: "Dossiers RH actifs", target: 140, suffix: "" },
            ],
            previewTitle: "Aperçu du tableau de bord exécutif",
            live: "En direct",
            completion: "Taux de complétion des feuilles",
            leaveRequests: "Demandes de congé",
            pending: "11 en attente",
            queueHealthy: "File d'approbation saine",
            table: { module: "Module", state: "État", owner: "Responsable" },
            rows: [
              ["Lot de feuilles de temps", "Approuvé", "Manager"],
              ["Workflow des congés", "En revue", "RH"],
              ["Cycle de performance", "Actif", "Direction"],
            ],
            floating: [
              "Feuille de temps approuvée",
              "Demande de congé soumise",
              "Heures projet suivies",
            ],
            valueItems: [
              "Source unique de vérité",
              "Workflows transparents",
              "Données RH sécurisées",
              "Visibilité du temps projet",
              "Accès basé sur les rôles",
            ],
            featuresTitle: "Aperçu des fonctionnalités",
            featuresHeading: "Conçue pour les opérations RH modernes",
            featuresDescription:
              "Chaque module améliore la clarté, le contrôle et la responsabilité tout en gardant les workflows simples et pratiques.",
            featureCards: [
              { title: "Dossiers employés", description: "Profils centralisés, contrats et données RH structurées." },
              { title: "Feuilles de temps", description: "Soumissions hebdomadaires avec états d'approbation contrôlés." },
              { title: "Gestion des congés", description: "Suivez soldes, validations et calendriers de planification." },
              { title: "Suivi des projets", description: "Associez les heures aux projets et suivez l'utilisation budget." },
              { title: "Évaluations", description: "Capturez évaluations, objectifs et historique de progression." },
              { title: "Analyse & reporting", description: "Indicateurs opérationnels pour RH et management." },
              { title: "Sécurité par rôles", description: "Permissions appliquées par collaborateur, manager et admin." },
              { title: "Gestion documentaire", description: "Métadonnées organisées, traçabilité et contrôle d'accès." },
            ],
            workflowTitle: "Workflow",
            workflowHeading: "Des flux d'approbation structurés et transparents",
            tsFlow: "Flux d'approbation des feuilles de temps",
            leaveFlow: "Flux de demande de congé",
            tsSteps: [
              "Le collaborateur soumet sa feuille de temps",
              "Le manager vérifie les détails",
              "Approbation ou rejet avec commentaire",
              "La feuille approuvée est verrouillée et archivée",
            ],
            leaveSteps: [
              "Demande soumise avec période et type",
              "Le manager reçoit une notification",
              "La décision met à jour le statut",
              "Le congé approuvé met à jour solde et calendrier",
            ],
            whyTitle: "Pourquoi c'est important",
            whyHeading: "Une valeur métier au-delà de l'administratif",
            whyItems: [
              "Réduisez les tâches RH manuelles et la coordination répétitive.",
              "Améliorez la visibilité sans micro-management.",
              "Suivez précisément le temps par projet pour de meilleures décisions.",
              "Simplifiez les validations, audits et contrôles internes.",
            ],
            cards: [
              ["Clarté opérationnelle", "Statut en temps réel des validations et activités."],
              ["Contrôle des données sensibles", "Politiques d'accès alignées sur les responsabilités."],
              ["Préparation audit", "Traçabilité complète des actions et changements."],
              ["Vision stratégique", "Modèle de données prêt pour l'analytics et le reporting."],
            ],
            securityTitle: "Sécurité & accès",
            securityHeading: "Gouvernance prête entreprise pour les données RH",
            securityItems: [
              "Accès et permissions basés sur les rôles",
              "Workflow d'authentification sécurisé",
              "Contrôles de protection des données sensibles",
              "Logs d'audit pour actions critiques",
              "Traçabilité d'accès aux documents",
              "Support sauvegarde et reprise",
            ],
            aiTitle: "Feuille de route IA",
            aiHeading: "Intelligence RH augmentée par l'IA, bientôt",
            aiDescription:
              "Les capacités IA sont prévues après maturité des workflows cœur, avec détection d'anomalies, signaux prédictifs de charge et assistance au reporting.",
            aiItems: [
              "Détection d'anomalies sur les feuilles de temps",
              "Analyse des patterns de congés",
              "Insights prédictifs de charge et allocation",
              "Recommandations de workflow assistées",
            ],
            ctaHeading: "Modernisez vos workflows RH avec une plateforme fiable",
            ctaBody:
              "Gérez collaborateurs, temps, validations et performance dans un système unique.",
            ctaLaunch: "Lancer la plateforme",
            ctaRequest: "Demander une démo",
            footerBrand: "RHpro",
            footerBody:
              "Plateforme RH interne pour la gestion employés, feuilles de temps, congés, projets et performance.",
            footerNav: "Navigation",
            footerContact: "Contact",
            footerContactBody:
              "Pour l'onboarding entreprise et les démonstrations, contactez l'administrateur système RH.",
            footerLogin: "Se connecter à la plateforme",
            footerRights: "© 2026 RHpro. Tous droits réservés.",
          }
        : {
            badge: "Modern HR Operating Platform",
            heroTitle:
              "The Smart HR Workflow Platform for Time, Leave, Projects, and Performance",
            heroDescription:
              "Centralize employee records, timesheets, leave approvals, project tracking, and performance management in one secure, transparent system designed for internal enterprise teams.",
            getStarted: "Get Started",
            demo: "Book a Demo",
            counters: [
              { label: "Approval actions processed", target: 1280, suffix: "+" },
              { label: "Monthly timesheet entries", target: 5400, suffix: "+" },
              { label: "Active HR records", target: 140, suffix: "" },
            ],
            previewTitle: "Executive Dashboard Preview",
            live: "Live",
            completion: "Timesheet Completion",
            leaveRequests: "Leave Requests",
            pending: "11 pending",
            queueHealthy: "Approval queue healthy",
            table: { module: "Module", state: "State", owner: "Owner" },
            rows: [
              ["Timesheet Batch", "Approved", "Manager"],
              ["Leave Workflow", "In Review", "HR"],
              ["Performance Cycle", "Active", "Leadership"],
            ],
            floating: ["Timesheet Approved", "Leave Request Submitted", "Project Hours Tracked"],
            valueItems: [
              "Single Source of Truth",
              "Transparent Workflows",
              "Secure HR Data",
              "Project Time Visibility",
              "Role-Based Access",
            ],
            featuresTitle: "Features Overview",
            featuresHeading: "Built for modern HR operations",
            featuresDescription:
              "Each module is designed to improve clarity, control, and accountability while keeping workflows practical and transparent.",
            featureCards: [
              { title: "Employee Records", description: "Centralized profiles, contracts, and structured HR data." },
              { title: "Timesheets", description: "Weekly submissions with controlled approval states and locks." },
              { title: "Leave & Absence Management", description: "Track balances, approvals, and planning calendars." },
              { title: "Project Tracking", description: "Link hours to projects and monitor budget utilization." },
              { title: "Performance Reviews", description: "Capture evaluations, goals, and progression history." },
              { title: "Analytics & Reporting", description: "Operational insights for HR and management decisions." },
              { title: "Role-Based Security", description: "Enforce permissions by collaborator, manager, and admin scope." },
              { title: "Document Management", description: "Organized document metadata, traceability, and access control." },
            ],
            workflowTitle: "Workflow",
            workflowHeading: "Structured approval flows with full transparency",
            tsFlow: "Timesheet Approval Flow",
            leaveFlow: "Leave Request Flow",
            tsSteps: [
              "Employee submits timesheet",
              "Manager reviews entry details",
              "Approval or rejection with comment",
              "Approved sheet is locked and archived",
            ],
            leaveSteps: [
              "Request submitted with period and type",
              "Manager receives notification",
              "Decision updates request status",
              "Approved leave updates balance and calendar",
            ],
            whyTitle: "Why It Matters",
            whyHeading: "Business value beyond administration",
            whyItems: [
              "Reduce manual HR processes and repetitive coordination overhead.",
              "Improve visibility without introducing micromanagement behavior.",
              "Track time by project accurately for better financial and planning decisions.",
              "Simplify approvals, audits, and internal governance controls.",
            ],
            cards: [
              ["Operational Clarity", "Live status across approvals, workload, and team activity."],
              ["Sensitive Data Control", "Access policies aligned with role responsibilities and scope."],
              ["Audit Readiness", "Traceability across actions, approvals, and changes."],
              ["Strategic Insight", "Analytics-ready data model for operational and leadership reporting."],
            ],
            securityTitle: "Security & Access",
            securityHeading: "Enterprise-ready governance for HR data",
            securityItems: [
              "Role-based access and permissions",
              "Secure authentication workflow",
              "Sensitive data protection controls",
              "Audit logs for critical actions",
              "Document access traceability",
              "Backup and recovery support",
            ],
            aiTitle: "AI Roadmap",
            aiHeading: "AI-Enhanced HR Intelligence, Coming Next",
            aiDescription:
              "AI capabilities are planned as a future enhancement after core workflow maturity, focusing on anomaly detection, predictive workload signals, leave pattern analysis, and intelligent reporting assistance.",
            aiItems: [
              "Timesheet anomaly detection and consistency checks",
              "Leave pattern analysis for operational risk awareness",
              "Predictive workload and allocation insights",
              "Assistant-driven reporting and workflow recommendations",
            ],
            ctaHeading: "Modernize HR workflows with one trusted platform",
            ctaBody:
              "Manage people, time, approvals, and performance in one connected system designed for operational excellence.",
            ctaLaunch: "Launch the Platform",
            ctaRequest: "Request a Demo",
            footerBrand: "RHpro",
            footerBody:
              "Internal HR platform for employee management, timesheets, leave requests, project tracking, and performance operations.",
            footerNav: "Navigation",
            footerContact: "Contact",
            footerContactBody:
              "For enterprise onboarding and demos, contact the HR systems administrator.",
            footerLogin: "Login to Platform",
            footerRights: "© 2026 RHpro. All rights reserved.",
          },
    [language],
  );

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
              {content.badge}
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base text-stone-600 md:text-lg">
              {content.heroDescription}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-700"
              >
                {content.getStarted}
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                {content.demo}
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {content.counters.map((item) => (
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
                <p className="font-semibold">{content.previewTitle}</p>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">{content.live}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <p className="text-xs text-stone-500">{content.completion}</p>
                  <p className="mt-1 text-lg font-semibold">94%</p>
                  <div className="mt-2 h-2 rounded-full bg-orange-100">
                    <div className="h-2 w-[94%] rounded-full bg-orange-600" />
                  </div>
                </div>
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                  <p className="text-xs text-stone-500">{content.leaveRequests}</p>
                  <p className="mt-1 text-lg font-semibold">{content.pending}</p>
                  <p className="mt-2 text-xs text-orange-700">{content.queueHealthy}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-orange-100">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-orange-50 text-stone-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{content.table.module}</th>
                      <th className="px-3 py-2 font-medium">{content.table.state}</th>
                      <th className="px-3 py-2 font-medium">{content.table.owner}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.rows.map((row) => (
                      <tr key={row[0]} className="border-t border-orange-100">
                        <td className="px-3 py-2">{row[0]}</td>
                        <td className="px-3 py-2 text-orange-700">{row[1]}</td>
                        <td className="px-3 py-2">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={floatingStyle}
              className="absolute -left-6 top-8 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">{content.floating[0]}</p>
            </div>
            <div
              style={{ transform: `translate3d(${mousePosition.x * -0.7}px, ${mousePosition.y * -0.7}px, 0)` }}
              className="absolute -right-8 top-24 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">{content.floating[1]}</p>
            </div>
            <div
              style={{ transform: `translate3d(${mousePosition.x * 0.6}px, ${mousePosition.y * 0.6}px, 0)` }}
              className="absolute -left-3 bottom-8 hidden rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm md:block"
            >
              <p className="font-medium">{content.floating[2]}</p>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <SectionReveal className="grid gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm md:grid-cols-5 md:p-5">
          {content.valueItems.map((item) => (
            <div key={item} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-center text-xs font-medium text-stone-700 md:text-sm">
              {item}
            </div>
          ))}
        </SectionReveal>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <SectionReveal>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{content.featuresTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold">{content.featuresHeading}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 md:text-base">
              {content.featuresDescription}
            </p>
          </div>
        </SectionReveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.featureCards.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
            <SectionReveal key={feature.title} delayMs={index * 60}>
              <article className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-md">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700 transition group-hover:bg-orange-200">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{feature.description}</p>
              </article>
            </SectionReveal>
          )})}
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <SectionReveal className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{content.workflowTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">{content.workflowHeading}</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="text-base font-semibold">{content.tsFlow}</h3>
              <ol className="mt-4 space-y-3 text-sm text-stone-600">
                {content.tsSteps.map((step, idx) => (
                  <li key={step} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">{idx + 1}</span>{step}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="text-base font-semibold">{content.leaveFlow}</h3>
              <ol className="mt-4 space-y-3 text-sm text-stone-600">
                {content.leaveSteps.map((step, idx) => (
                  <li key={step} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-600 text-xs text-white">{idx + 1}</span>{step}</li>
                ))}
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
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{content.whyTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">{content.whyHeading}</h2>
            <div className="mt-5 space-y-3 text-sm text-stone-600 md:text-base">
              {content.whyItems.map((item) => (
                <p key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 text-orange-600" size={16} />{item}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <Gauge className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">{content.cards[0][0]}</p>
              <p className="mt-1 text-xs text-stone-600">{content.cards[0][1]}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <Lock className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">{content.cards[1][0]}</p>
              <p className="mt-1 text-xs text-stone-600">{content.cards[1][1]}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <BadgeCheck className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">{content.cards[2][0]}</p>
              <p className="mt-1 text-xs text-stone-600">{content.cards[2][1]}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <BarChart3 className="text-orange-700" size={18} />
              <p className="mt-2 text-sm font-semibold">{content.cards[3][0]}</p>
              <p className="mt-1 text-xs text-stone-600">{content.cards[3][1]}</p>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section id="security" className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <SectionReveal className="rounded-2xl border border-orange-200 bg-orange-900 p-6 text-orange-50 shadow-xl md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-200">{content.securityTitle}</p>
          <h2 className="mt-2 text-3xl font-semibold">{content.securityHeading}</h2>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {content.securityItems.map((item) => (
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
            <p className="text-sm font-semibold uppercase tracking-wide">{content.aiTitle}</p>
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{content.aiHeading}</h2>
          <p className="mt-3 max-w-3xl text-sm text-stone-600 md:text-base">
            {content.aiDescription}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {content.aiItems.map((item) => (
              <div key={item} className="rounded-xl border border-orange-100 bg-white/90 p-4 text-sm text-stone-700">{item}</div>
            ))}
          </div>
        </SectionReveal>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <SectionReveal className="rounded-3xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-10 text-white shadow-xl md:px-10">
          <h2 className="text-3xl font-semibold">{content.ctaHeading}</h2>
          <p className="mt-3 max-w-2xl text-sm text-orange-100 md:text-base">
            {content.ctaBody}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
            >
              {content.ctaLaunch}
            </Link>
            <a
              href="#contact"
              className="rounded-lg border border-orange-300 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-700"
            >
              {content.ctaRequest}
            </a>
          </div>
        </SectionReveal>
      </section>

      <footer id="contact" className="border-t border-orange-100 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
          <div>
            <div className="flex items-center gap-2">
              <Image 
                src="/logos/mafrah.png" 
                alt="Mafrah Logo" 
                width={32} 
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
              />
              <h3 className="text-lg font-semibold text-stone-900">{content.footerBrand}</h3>
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {content.footerBody}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">{content.footerNav}</p>
            <ul className="mt-2 space-y-2 text-sm text-stone-600">
              <li><a className="hover:text-orange-700" href="#features">{language === "fr" ? "Fonctionnalités" : "Features"}</a></li>
              <li><a className="hover:text-orange-700" href="#workflow">{language === "fr" ? "Workflow" : "Workflow"}</a></li>
              <li><a className="hover:text-orange-700" href="#security">{language === "fr" ? "Sécurité" : "Security"}</a></li>
              <li><a className="hover:text-orange-700" href="#ai-roadmap">{content.aiTitle}</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">{content.footerContact}</p>
            <p className="mt-2 text-sm text-stone-600">{content.footerContactBody}</p>
            <a href="/auth/login" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-800">
              {content.footerLogin}
              <ChevronRight size={14} />
            </a>
          </div>
        </div>
        <div className="border-t border-orange-100 py-4 text-center text-xs text-stone-500">
          {content.footerRights}
        </div>
      </footer>
    </main>
  );
}

