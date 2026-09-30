import type { ReactNode } from "react";

/** White result section card with an accent-barred heading (spec §6). */
export function ResultCard({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_10px_30px_-12px_rgba(15,23,42,.15)] flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#1e293b]">
        <span aria-hidden className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accent }} />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Chip({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full bg-white text-sm font-medium"
      style={{ color: accent, boxShadow: `0 0 0 1px ${accent}40` }}
    >
      {label}
    </span>
  );
}
