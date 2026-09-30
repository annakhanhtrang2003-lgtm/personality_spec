import type { PersonalProfile, Response } from "./types";
import { calculateZodiac } from "./zodiac";
import { calculateNumerology } from "./numerology";
import { scoreMBTI } from "./mbti";
import types from "./data/mbti-types.json";
import templates from "./data/templates.json";

export interface BuildProfileInput {
  name: string;
  university: string;
  birth_date: string;
  full_name: string;
  responses: Response[];
}

interface TypeEntry {
  label: string;
  traits: string[];
  strengths: string[];
  growth_areas: string[];
  personality_keywords: string[];
  career_hints: string[];
}

const TYPES = types as Record<string, TypeEntry>;
const T = templates as {
  intro: Record<string, string>;
  flavor_element: Record<string, string>;
  flavor_life_path: Record<string, string>;
  closing: string;
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * Compose the full profile.
 *
 * Layer separation (spec §5) is enforced structurally, not by convention:
 * strengths, growth_areas, personality_keywords and career_hints are read
 * from the MBTI type entry and nothing else touches them. Zodiac and
 * numerology reach only the narrative's flavor slots. Two students with
 * identical answers and different birthdays must get identical career
 * signals — profile.test.ts asserts exactly that.
 */
export function buildProfile(input: BuildProfileInput): PersonalProfile {
  const zodiac = calculateZodiac(input.birth_date);
  const numerology = calculateNumerology(input.birth_date, input.full_name);
  const mbti = scoreMBTI(input.responses);

  const entry = TYPES[mbti.type];
  if (!entry) {
    throw new Error(`buildProfile: no data for MBTI type "${mbti.type}"`);
  }
  // All 16 keys exist in mbti-types.json as objects, so `entry` is always
  // truthy — the check above can never fire on its own. As of Task 11 all
  // 16 entries are populated, so no real input reaches the check below
  // either; it stays as the guard against a future half-written entry,
  // which would otherwise ship a "complete-looking" profile with empty
  // strengths/career_hints instead of failing loudly. profile.test.ts
  // proves it against a deliberately emptied entry.
  if (!entry.label || entry.career_hints.length === 0) {
    throw new Error(
      `buildProfile: MBTI type "${mbti.type}" has no populated data yet`
    );
  }

  const intro = fill(T.intro[mbti.type] ?? "", {
    name: input.name,
    label: entry.label,
    trait_line: entry.traits.join(", "),
  });

  const narrative = [
    intro,
    T.flavor_element[zodiac.element] ?? "",
    T.flavor_life_path[String(numerology.life_path)] ?? "",
    T.closing,
  ]
    .filter((part) => part.trim().length > 0)
    .join(" ");

  return {
    user: {
      name: input.name,
      university: input.university,
      birth_date: input.birth_date,
    },
    zodiac,
    numerology,
    mbti: { ...mbti, label: entry.label, traits: [...entry.traits] },
    synthesis: {
      narrative,
      // Shallow copies: entry.* are references into the imported
      // mbti-types.json module object, which is shared and cached across
      // every call. Returning the arrays as-is would let any caller's
      // .push()/.sort() on a returned profile corrupt the data for every
      // subsequent user's profile, process-wide.
      strengths: [...entry.strengths],
      growth_areas: [...entry.growth_areas],
      personality_keywords: [...entry.personality_keywords],
      career_hints: [...entry.career_hints],
    },
  };
}
