import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const typeStyles = {
  success: "bg-mint-soft text-mint-ink border-mint-ink/15",
  error: "bg-coral-soft text-coral-ink border-coral-ink/15",
  info: "bg-indigo-mist text-indigo border-indigo/15",
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-float ${typeStyles[type]}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === "success" && <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />}
        {type === "success" && <path d="M22 4L12 14.88l-4-4" />}
        {type === "error" && <circle cx="12" cy="12" r="10" />}
        {type === "error" && <path d="M15 9l-6 6M9 9l6 6" />}
        {type === "info" && <circle cx="12" cy="12" r="10" />}
        {type === "info" && <path d="M12 16v-4M12 8h.01" />}
      </svg>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="ml-2 rounded-full p-1 hover:bg-black/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
