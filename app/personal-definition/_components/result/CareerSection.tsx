import { ResultCard, Chip } from "./ResultCard";

/** Chips without icons — hints are free text (spec D5). */
export function CareerSection({ hints, accent }: { hints: string[]; accent: string }) {
  return (
    <ResultCard title="Nghề nghiệp phù hợp" accent={accent}>
      <div className="flex flex-wrap gap-2">
        {hints.map((h) => (
          <Chip key={h} label={h} accent={accent} />
        ))}
      </div>
      <p className="text-xs text-[#64748b]">Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất.</p>
    </ResultCard>
  );
}
