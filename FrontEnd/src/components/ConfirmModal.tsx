"use client";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl border border-orange-400/25 bg-[#101010] shadow-2xl shadow-black/60">
        <div className="px-6 pt-6">
          <h3 className="text-lg font-semibold text-orange-300">{title}</h3>
          <p className="mt-2 text-sm text-stone-300">{message}</p>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-orange-400/15 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-stone-500/35 bg-stone-800/50 px-4 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-700/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg border border-red-500/40 bg-red-600/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-600/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

