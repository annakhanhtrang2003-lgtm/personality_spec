"use client";

import type { ReactNode } from "react";
import type { PersonalProfile } from "../_lib/types";
import { temperamentOf, TEMPERAMENTS } from "../_lib/temperament";
import { ResultHero } from "./result/ResultHero";
import { DimensionBreakdown } from "./result/DimensionBreakdown";
import { StrengthsGrowth } from "./result/StrengthsGrowth";
import { CareerSection } from "./result/CareerSection";

/**
 * The result screen: four sections in the user's temperament colours.
 * Zodiac and numerology are deliberately absent (spec D3) — the engine still
 * computes them for the halfway teaser. `actions` is rendered last; Spec B
 * (share + Idol Match) plugs in there.
 */
export function SynthesisView({ profile, actions }: { profile: PersonalProfile; actions?: ReactNode }) {
  const { mbti, synthesis, user } = profile;
  const { accent, tint } = TEMPERAMENTS[temperamentOf(mbti.type)];

  return (
    <div data-testid="result-page" className="min-h-screen px-5 py-8" style={{ backgroundColor: tint }}>
      <div className="max-w-[600px] mx-auto flex flex-col gap-6">
        <ResultHero mbti={mbti} name={user.name} narrative={synthesis.narrative} accent={accent} />
        <DimensionBreakdown mbti={mbti} keywords={synthesis.personality_keywords} accent={accent} />
        <StrengthsGrowth strengths={synthesis.strengths} growthAreas={synthesis.growth_areas} accent={accent} />
        <CareerSection hints={synthesis.career_hints} accent={accent} />
        {actions}
      </div>
    </div>
  );
}
