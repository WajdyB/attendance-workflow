"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const { t } = useLanguage();

  const isLight = mounted && theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-white text-stone-600 transition hover:border-orange-300 hover:text-orange-700"
      aria-label={isLight ? t("landing.themeDark") : t("landing.themeLight")}
      title={isLight ? t("landing.themeDark") : t("landing.themeLight")}
    >
      {isLight ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
