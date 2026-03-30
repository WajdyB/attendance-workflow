"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveRequest, PublicHoliday, LEAVE_TYPE_LABELS } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface CalendarData {
  requests: LeaveRequest[];
  holidays: PublicHoliday[];
}

const DAY_NAMES_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function LeaveCalendar() {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<CalendarData>(apiConfig.endpoints.requests.calendar(month, year))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid (Mon–Sun weeks)
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isHoliday = (day: number) => {
    if (!data) return false;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return data.holidays.some((h) => {
      const hDate = new Date(h.date);
      const hStr = `${hDate.getFullYear()}-${String(hDate.getMonth() + 1).padStart(2, "0")}-${String(hDate.getDate()).padStart(2, "0")}`;
      return hStr === dateStr;
    });
  };

  const getHolidayName = (day: number) => {
    if (!data) return null;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const h = data.holidays.find((h) => {
      const hDate = new Date(h.date);
      const hStr = `${hDate.getFullYear()}-${String(hDate.getMonth() + 1).padStart(2, "0")}-${String(hDate.getDate()).padStart(2, "0")}`;
      return hStr === dateStr;
    });
    return h?.name ?? null;
  };

  const getRequestsForDay = (day: number): LeaveRequest[] => {
    if (!data) return [];
    const date = new Date(year, month - 1, day);
    return data.requests.filter((r) => {
      if (!r.leaveStartDate || !r.leaveEndDate) return false;
      const start = new Date(r.leaveStartDate);
      const end = new Date(r.leaveEndDate);
      return date >= start && date <= end;
    });
  };

  const isWeekend = (cellIndex: number) => cellIndex % 7 >= 5;
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear();

  return (
    <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h3 className="font-semibold text-stone-800">
          {t("Calendrier des Congés", "Leave Calendar")}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-stone-700">
            {language === "fr" ? MONTHS_FR[month - 1] : MONTHS_EN[month - 1]}{" "}
            {year}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-orange-300" />
        </div>
      ) : (
        <div className="p-4">
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {(language === "fr" ? DAY_NAMES_FR : DAY_NAMES_EN).map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-stone-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }

              const holiday = isHoliday(day);
              const holidayName = getHolidayName(day);
              const weekend = isWeekend(idx);
              const todayCell = isToday(day);
              const dayRequests = getRequestsForDay(day);

              return (
                <div
                  key={day}
                  title={holidayName ?? undefined}
                  className={`
                    relative flex min-h-[56px] flex-col rounded-lg p-1 text-xs transition-colors
                    ${todayCell ? "ring-2 ring-orange-400" : ""}
                    ${holiday ? "bg-orange-50" : weekend ? "bg-stone-50" : "bg-white hover:bg-stone-50"}
                  `}
                >
                  <span
                    className={`mb-1 self-end rounded-full px-1.5 py-0.5 font-medium ${
                      todayCell
                        ? "bg-orange-500 text-white"
                        : holiday
                          ? "text-orange-600"
                          : weekend
                            ? "text-stone-400"
                            : "text-stone-600"
                    }`}
                  >
                    {day}
                  </span>

                  {holiday && (
                    <span className="truncate text-[9px] text-orange-500 font-medium leading-tight">
                      🎉 {holidayName}
                    </span>
                  )}

                  {dayRequests.slice(0, 2).map((r) => {
                    const meta = r.leaveType
                      ? LEAVE_TYPE_LABELS[r.leaveType]
                      : null;
                    return (
                      <span
                        key={r.id}
                        className="mt-0.5 truncate rounded px-1 py-0.5 text-[9px] font-medium text-white leading-tight"
                        style={{ backgroundColor: meta?.color ?? "#f97316" }}
                      >
                        {r.submitter.firstName} {r.submitter.lastName[0]}.
                      </span>
                    );
                  })}
                  {dayRequests.length > 2 && (
                    <span className="mt-0.5 text-[9px] text-stone-400">
                      +{dayRequests.length - 2}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-100 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="h-3 w-3 rounded-full bg-orange-200" />
              {t("Jour férié", "Public holiday")}
            </div>
            {Object.entries(LEAVE_TYPE_LABELS)
              .filter(([type]) => {
                if (!data) return false;
                return data.requests.some((r) => r.leaveType === type);
              })
              .map(([type, meta]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-stone-500">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {language === "fr" ? meta.fr : meta.en}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
