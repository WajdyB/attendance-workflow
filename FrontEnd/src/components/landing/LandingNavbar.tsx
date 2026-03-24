"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "../layout/language-switcher";

const links = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#security", label: "Security" },
  { href: "#ai-roadmap", label: "AI Roadmap" },
  { href: "#contact", label: "Contact" },
];

export default function LandingNavbar() {
  const { t } = useLanguage();
  const links = [
    { href: "#features", label: t("landing.features") },
    { href: "#workflow", label: t("landing.workflow") },
    { href: "#security", label: t("landing.security") },
    { href: "#ai-roadmap", label: t("landing.aiRoadmap") },
    { href: "#contact", label: t("landing.contact") },
  ];

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-orange-100/80 bg-white/90 backdrop-blur-lg"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <a href="#top" className="flex items-center gap-2">
          <Image 
            src="/logos/mafrah.png" 
            alt="Mafrah Logo" 
            width={40} 
            height={40}
            className="h-10 w-10 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold text-stone-900 md:text-base">
            {t("landing.brand")}
          </span>
        </a>

        <ul className="hidden items-center gap-7 md:flex">
          {links.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-sm text-stone-600 transition hover:text-orange-700"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher compact />
          <Link
            href="/auth/login"
            className="rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
          >
            {t("landing.login")}
          </Link>
          <a
            href="#top"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
          >
            {t("landing.getStarted")}
          </a>
        </div>

        <button
          aria-label="Open navigation menu"
          className="rounded-lg border border-orange-200 p-2 text-stone-600 md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          type="button"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-orange-100 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md px-2 py-2 text-sm text-stone-700 hover:bg-orange-50"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <LanguageSwitcher compact />
              <Link
                href="/auth/login"
                className="flex-1 rounded-lg border border-orange-200 px-3 py-2 text-center text-sm font-medium text-stone-700"
                onClick={() => setMobileOpen(false)}
              >
                {t("landing.login")}
              </Link>
              <a
                href="#top"
                className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-center text-sm font-medium text-white"
                onClick={() => setMobileOpen(false)}
              >
                {t("landing.getStarted")}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

