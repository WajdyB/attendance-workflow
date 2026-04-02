"use client";

import { AppSelect } from "@/components/ui/app-select";

export type DashboardSelectOption = { value: number; label: string };

type DashboardSelectProps = {
  id: string;
  value: number;
  onChange: (value: number) => void;
  options: DashboardSelectOption[];
  ariaLabel: string;
  /** Width hints for the inline trigger (e.g. `max-w-[120px]` for month) */
  triggerClassName?: string;
};

/**
 * Inline period picker (flat trigger inside a pill). See {@link AppSelect} for behavior.
 */
export function DashboardSelect({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  triggerClassName = "",
}: DashboardSelectProps) {
  return (
    <AppSelect<number>
      id={id}
      variant="inline"
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      triggerClassName={triggerClassName}
    />
  );
}
