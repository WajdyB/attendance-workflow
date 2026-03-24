"use client";

import { useLanguage } from "@/context/LanguageContext";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-lg border border-orange-200 bg-white p-1">
      <button
        type="button"
        onClick={() => setLanguage("fr")}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          language === "fr"
            ? "bg-orange-600 text-white"
            : "text-stone-600 hover:bg-orange-50"
        }`}
        aria-pressed={language === "fr"}
      >
        {compact ? "FR" : t("common.french")}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          language === "en"
            ? "bg-orange-600 text-white"
            : "text-stone-600 hover:bg-orange-50"
        }`}
        aria-pressed={language === "en"}
      >
        {compact ? "EN" : t("common.english")}
      </button>
    </div>
  );
}

