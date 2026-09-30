/**
 * The Temperament Sticker Kit groups the 16 types into four worlds by their
 * middle letters: NT, NF, SJ, SP. Derived on demand, never stored — the type
 * string is the single source of truth. The ids are the kit's code names and
 * never reach the UI; `name` is our own Vietnamese copy.
 *
 * `accent` is used as text and chip colour on white cards and on `tint`, so
 * it is darkened from the kit palette until it passes WCAG AA on both
 * (temperament.test.ts checks). The kit's brighter colours stay inside the
 * sticker card.
 */
export type TemperamentId = "analysts" | "diplomats" | "sentinels" | "explorers";

export interface Temperament {
  name: string;
  accent: string;
  tint: string;
}

export const TEMPERAMENTS: Record<TemperamentId, Temperament> = {
  analysts: { name: "Nhóm Tư Duy", accent: "#6d28d9", tint: "#eef2ff" },
  diplomats: { name: "Nhóm Lý Tưởng", accent: "#be185d", tint: "#fdf2f8" },
  sentinels: { name: "Nhóm Vững Chãi", accent: "#047857", tint: "#fffbf0" },
  explorers: { name: "Nhóm Trải Nghiệm", accent: "#c2410c", tint: "#fff7d6" },
};

const TYPE_RE = /^[EI][SN][TF][JP]$/;

export function temperamentOf(type: string): TemperamentId {
  if (!TYPE_RE.test(type)) {
    throw new Error(`temperamentOf: not an MBTI type "${type}"`);
  }
  if (type[1] === "N") return type[2] === "T" ? "analysts" : "diplomats";
  return type[3] === "J" ? "sentinels" : "explorers";
}
