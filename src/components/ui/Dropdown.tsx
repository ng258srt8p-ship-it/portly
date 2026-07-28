import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon: ReactNode;
  disabled?: boolean;
}

export default function Dropdown({ label, value, options, onChange, icon, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-w-0 items-center gap-3 px-6 py-4 text-left disabled:opacity-40 hover:bg-black/[0.015]"
      >
        <span className="shrink-0 text-indigo">{icon}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
          <span className="truncate font-semibold text-ink">{disabled ? "Loading…" : value}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-float-lg sm:left-0 sm:right-auto sm:w-72">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full truncate rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                value === option ? "bg-indigo-mist text-indigo" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}