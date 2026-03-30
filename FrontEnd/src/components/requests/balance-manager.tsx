"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Users } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveBalance } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface BalanceWithUser extends LeaveBalance {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
  };
}

export default function BalanceManager() {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);
  const currentYear = new Date().getFullYear();

  const [balances, setBalances] = useState<BalanceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    apiClient
      .get<BalanceWithUser[]>(apiConfig.endpoints.requests.allBalances(currentYear))
      .then((data) => {
        setBalances(data);
        const initial: Record<string, string> = {};
        data.forEach((b) => { initial[b.userId] = String(Number(b.allocatedDays)); });
        setEditValues(initial);
      })
      .catch(() => setBalances([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (userId: string) => {
    const val = parseFloat(editValues[userId] ?? "0");
    if (isNaN(val) || val < 0) return;
    setSavingId(userId);
    try {
      const updated = await apiClient.patch<BalanceWithUser>(
        apiConfig.endpoints.requests.updateBalance(userId),
        { allocatedDays: val, year: currentYear }
      );
      setBalances((prev) =>
        prev.map((b) => (b.userId === userId ? { ...b, ...updated } : b))
      );
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
        <Users size={18} className="text-orange-500" />
        <h3 className="font-semibold text-stone-800">
          {t("Soldes de Congés", "Leave Balances")} {currentYear}
        </h3>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-orange-300" />
        </div>
      ) : balances.length === 0 ? (
        <div className="py-10 text-center text-sm text-stone-400">
          {t("Aucun solde trouvé", "No balances found")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-400">
                <th className="px-5 py-3 text-left font-medium">{t("Employé", "Employee")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("Alloués", "Allocated")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("Utilisés", "Used")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("En attente", "Pending")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("Restants", "Remaining")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("Modifier alloués", "Edit allocated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {balances.map((b) => (
                <tr key={b.userId} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-stone-800">
                      {b.user.firstName} {b.user.lastName}
                    </p>
                    {b.user.department && (
                      <p className="text-xs text-stone-400">{b.user.department.name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-orange-600">
                    {Number(b.allocatedDays)}
                  </td>
                  <td className="px-3 py-3 text-center text-green-600">{Number(b.usedDays)}</td>
                  <td className="px-3 py-3 text-center text-amber-600">{Number(b.pendingDays)}</td>
                  <td className="px-3 py-3 text-center font-semibold text-blue-600">
                    {Number(b.remainingDays)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={editValues[b.userId] ?? ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [b.userId]: e.target.value }))
                        }
                        className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm outline-none focus:border-orange-400"
                      />
                      <button
                        onClick={() => handleSave(b.userId)}
                        disabled={savingId === b.userId}
                        className="rounded-lg bg-orange-600 p-1.5 text-white hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingId === b.userId ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
