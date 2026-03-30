"use client";

import { TrendingUp, TrendingDown, FileText } from "lucide-react";
import { SalaryHistory, REASON_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  history: SalaryHistory[];
  showUser?: boolean;
}

export default function SalaryHistoryList({ history, showUser = false }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-MA" : "en-US", {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(n);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-12 text-stone-400">
        <TrendingUp size={32} className="mb-2 opacity-30" />
        <p className="text-sm">{t("Aucun historique salarial", "No salary history")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
          <tr>
            {showUser && <th className="px-4 py-3 text-left">{t("Collaborateur", "Collaborator")}</th>}
            <th className="px-4 py-3 text-left">{t("Date d'effet", "Effective date")}</th>
            <th className="px-4 py-3 text-right">{t("Ancien salaire", "Old salary")}</th>
            <th className="px-4 py-3 text-right">{t("Nouveau salaire", "New salary")}</th>
            <th className="px-4 py-3 text-right">{t("Variation", "Change")}</th>
            <th className="px-4 py-3 text-left">{t("Motif", "Reason")}</th>
            <th className="px-4 py-3 text-left">{t("Validé par", "Approved by")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {history.map((h) => {
            const delta = Number(h.newSalary) - Number(h.oldSalary);
            const pct = Number(h.oldSalary) > 0 ? ((delta / Number(h.oldSalary)) * 100).toFixed(1) : null;
            const isUp = delta >= 0;

            return (
              <tr key={h.id} className="hover:bg-stone-50/50">
                {showUser && h.user && (
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-700">
                      {h.user.firstName} {h.user.lastName}
                    </p>
                    {h.user.department && (
                      <p className="text-xs text-stone-400">{h.user.department.name}</p>
                    )}
                  </td>
                )}

                <td className="px-4 py-3 text-stone-600">{formatDate(h.changeDate)}</td>

                <td className="px-4 py-3 text-right text-stone-500">
                  {formatCurrency(Number(h.oldSalary))}
                </td>

                <td className="px-4 py-3 text-right font-semibold text-stone-800">
                  {formatCurrency(Number(h.newSalary))}
                </td>

                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isUp
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {pct ? `${isUp ? "+" : ""}${pct}%` : "—"}
                  </span>
                </td>

                <td className="px-4 py-3 text-stone-500">
                  {h.reason
                    ? language === "fr"
                      ? REASON_META[h.reason].fr
                      : REASON_META[h.reason].en
                    : "—"}
                </td>

                <td className="px-4 py-3 text-stone-500">
                  {h.manager
                    ? `${h.manager.user.firstName} ${h.manager.user.lastName}`
                    : "—"}
                </td>

                <td className="px-4 py-3 text-right">
                  {h.attachmentUrl && (
                    <a
                      href={h.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-700"
                    >
                      <FileText size={14} />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
