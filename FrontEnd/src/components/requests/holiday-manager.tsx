"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Sun, Pencil, X, Check } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { PublicHoliday } from "./types";
import { useLanguage } from "@/context/LanguageContext";

export default function HolidayManager() {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const currentYear = new Date().getFullYear();
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiClient
      .get<PublicHoliday[]>(apiConfig.endpoints.holidays.all(currentYear))
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName("");
    setDate("");
    setIsRecurring(true);
    setShowForm(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !date) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        date,
        year: isRecurring ? undefined : currentYear,
      };

      if (editId) {
        const updated = await apiClient.patch<PublicHoliday>(
          apiConfig.endpoints.holidays.update(editId),
          payload
        );
        setHolidays((prev) =>
          prev.map((h) => (h.id === editId ? updated : h))
        );
      } else {
        const created = await apiClient.post<PublicHoliday>(
          apiConfig.endpoints.holidays.create,
          payload
        );
        setHolidays((prev) => [...prev, created]);
      }
      resetForm();
    } catch {
      // keep form open
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(apiConfig.endpoints.holidays.delete(id));
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (h: PublicHoliday) => {
    setEditId(h.id);
    setName(h.name);
    setDate(new Date(h.date).toISOString().split("T")[0]);
    setIsRecurring(h.year === null || h.year === undefined);
    setShowForm(true);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "long",
    });

  return (
    <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-orange-500" />
          <h3 className="font-semibold text-stone-800">
            {t("Jours Fériés", "Public Holidays")}
          </h3>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          {t("Ajouter", "Add")}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border-b border-stone-100 bg-orange-50/30 px-5 py-4">
          <p className="mb-3 text-sm font-medium text-stone-700">
            {editId ? t("Modifier le jour férié", "Edit holiday") : t("Nouveau jour férié", "New holiday")}
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Nom du jour férié", "Holiday name")}
              className="flex-1 min-w-[180px] rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span className="text-sm text-stone-600">
                {t("Récurrent chaque année", "Recurring every year")}
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="rounded-lg border border-stone-200 p-2 text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X size={15} />
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !date}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("Enregistrer", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-orange-300" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-stone-400">
          <Sun size={28} className="mb-2 opacity-30" />
          <p className="text-sm">{t("Aucun jour férié configuré", "No holidays configured")}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-50">
          {holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-stone-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🎉</span>
                <div>
                  <p className="text-sm font-medium text-stone-800">{h.name}</p>
                  <p className="text-xs text-stone-400">
                    {formatDate(h.date)}
                    {(h.year === null || h.year === undefined) && (
                      <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">
                        {t("Récurrent", "Recurring")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(h)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(h.id)}
                  disabled={deletingId === h.id}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deletingId === h.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
