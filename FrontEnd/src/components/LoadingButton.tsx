// components/LoadingButton.tsx
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export default function LoadingButton({
  isLoading,
  loadingText = "Loading...",
  children,
  className = "",
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={`
        w-full py-2 rounded-md transition flex items-center justify-center gap-2
        ${
          isLoading
            ? "bg-orange-300 cursor-not-allowed"
            : "bg-orange-600 hover:bg-orange-700"
        } text-white ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

