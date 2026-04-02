"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Check } from "lucide-react";

export type AppSelectOption<T extends string | number = string | number> = {
  value: T;
  label: string;
};

export type AppSelectTone = "default" | "dark" | "token" | "surface" | "surfaceRaised";

export type AppSelectProps<T extends string | number> = {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: AppSelectOption<T>[];
  ariaLabel: string;
  variant?: "inline" | "field";
  /** Field trigger only; ignored for inline */
  tone?: AppSelectTone;
  disabled?: boolean;
  fullWidth?: boolean;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  menuZIndexClass?: string;
  menuClassName?: string;
};

const FIELD_TONE_CLASS: Record<AppSelectTone, string> = {
  default:
    "dashboard-select-trigger-field inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-800 outline-none transition-[color,background,border,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
  dark:
    "dashboard-select-trigger-field inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-left text-sm text-stone-200 outline-none transition-[color,background,border,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
  token:
    "dashboard-select-trigger-field inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-[color,background,border,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
  surface:
    "dashboard-select-trigger-field inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-[color,background,border,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
  surfaceRaised:
    "dashboard-select-trigger-field inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-[color,background,border,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
};

const FIELD_TONE_STYLE: Partial<Record<AppSelectTone, CSSProperties>> = {
  token: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  },
  surface: {
    background: "var(--surface)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-1)",
  },
  surfaceRaised: {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-1)",
  },
};

/**
 * Custom themed dropdown (no native select). Inline = flat trigger + panel;
 * field = full-width control aligned with form inputs.
 */
export function AppSelect<T extends string | number>({
  id: idProp,
  value,
  onChange,
  options,
  ariaLabel,
  variant = "field",
  tone = "default",
  disabled = false,
  fullWidth = false,
  triggerClassName = "",
  triggerStyle,
  menuZIndexClass = "z-[200]",
  menuClassName = "",
}: AppSelectProps<T>) {
  const autoId = useId();
  const id = idProp ?? `app-select-${autoId}`;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const rawIndex = options.findIndex((o) => o.value === value);
  const selectedIndex = rawIndex >= 0 ? rawIndex : 0;
  const selectedLabel =
    rawIndex >= 0 ? options[rawIndex]!.label : "\u2014";

  useEffect(() => {
    if (open) {
      setHighlighted(selectedIndex);
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlighted];
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commit = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [onChange, options],
  );

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => (h + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => (h - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(highlighted);
        break;
      default:
        break;
    }
  };

  const isInline = variant === "inline";
  const mergedFieldStyle: CSSProperties | undefined =
    tone === "default" || tone === "dark"
      ? { ...triggerStyle }
      : { ...FIELD_TONE_STYLE[tone], ...triggerStyle };

  const panelPosition = isInline
    ? "left-0 w-max min-w-[10rem] max-w-[min(100vw-2rem,18rem)]"
    : "left-0 right-0 w-full min-w-0 max-w-none";

  const rootClass = isInline
    ? `relative inline-block ${triggerClassName}`
    : `relative ${fullWidth ? "w-full" : ""} ${triggerClassName}`;

  const triggerButtonClass = isInline
    ? "dashboard-select-trigger-inline inline-flex max-w-full cursor-pointer items-center gap-0.5 border-none bg-transparent py-0.5 pr-1 text-left text-xs font-medium outline-none"
    : `${FIELD_TONE_CLASS[tone]} ${triggerClassName}`;

  const triggerButtonStyle: CSSProperties | undefined = isInline
    ? {
        color: open ? "var(--accent)" : "var(--text-1)",
      }
    : mergedFieldStyle;

  const openAccent =
    !isInline && (tone === "default" || tone === "dark") && open;

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={
          open ? `${listboxId}-opt-${highlighted}` : undefined
        }
        onClick={() => !disabled && options.length > 0 && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={triggerButtonClass}
        style={{
          ...triggerButtonStyle,
          ...(openAccent && tone === "default"
            ? { borderColor: "#fb923c", boxShadow: "0 0 0 1px #fb923c" }
            : {}),
          ...(openAccent && tone === "dark"
            ? { borderColor: "rgba(249, 115, 22, 0.45)" }
            : {}),
        }}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <ChevronDown
          size={isInline ? 12 : 16}
          className="shrink-0 opacity-70 transition-transform duration-200 ease-out"
          style={{
            color: isInline ? "var(--text-3)" : undefined,
            transform: open ? "rotate(180deg)" : undefined,
          }}
          aria-hidden
        />
      </button>

      {open && options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={`dashboard-select-panel absolute top-full mt-1.5 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border py-1 shadow-xl ${panelPosition} ${menuZIndexClass} ${menuClassName}`}
          style={{
            background: "var(--surface-overlay)",
            borderColor: "var(--border-strong)",
            boxShadow:
              "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px var(--border)",
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHi = highlighted === idx;
            return (
              <li key={`${String(opt.value)}-${idx}`} role="none" className="px-1">
                <button
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  id={`${listboxId}-opt-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => commit(idx)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors duration-150"
                  style={{
                    background: isSelected
                      ? "color-mix(in srgb, var(--accent) 22%, transparent)"
                      : isHi
                        ? "var(--surface-raised)"
                        : "transparent",
                    color: isSelected ? "var(--accent)" : "var(--text-1)",
                    outline: "none",
                  }}
                >
                  <span className="flex min-w-0 flex-1 truncate">{opt.label}</span>
                  {isSelected ? (
                    <Check
                      size={14}
                      className="shrink-0"
                      style={{ color: "var(--accent)" }}
                      aria-hidden
                    />
                  ) : (
                    <span className="w-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
