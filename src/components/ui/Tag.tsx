"use client";

interface TagProps {
  children: React.ReactNode;
}

export function Tag({ children }: TagProps) {
  return (
    <span className="truncate rounded-lg bg-black/[0.035] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}