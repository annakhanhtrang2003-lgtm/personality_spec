export type Element = "Fire" | "Earth" | "Air" | "Water";
export type Modality = "Cardinal" | "Fixed" | "Mutable";
export type Dimension = "EI" | "SN" | "TF" | "JP";

/** Likert response: -2 = Rất sai … +2 = Rất đúng. 0 is neutral, not "skipped". */
export type Response = -2 | -1 | 0 | 1 | 2;

export interface ZodiacResult {
  sun_sign: string;
  moon_sign: null;
  rising_sign: null;
  element: Element;
  modality: Modality;
  traits: string[];
}

export interface NumerologyResult {
  life_path: number;
  expression: number;
  soul_urge: number;
  personality: number;
  interpretations: {
    life_path: string;
    expression: string;
    soul_urge: string;
    personality: string;
  };
}

export interface DimensionScore {
  /** Signed sum, -20…+20. Preserved so Step 2 can see how close the call was. */
  raw: number;
  /** Percentage toward the dimension's first pole (E, S, T, J). */
  first: number;
  /** Percentage toward the second pole (I, N, F, P). Always 100 - first. */
  second: number;
}

export interface MBTIResult {
  type: string;
  /** Vietnamese name of the type, e.g. "Người lặng lẽ dẫn đường". */
  label: string;
  dimensions: Record<Dimension, DimensionScore>;
  traits: string[];
}

export interface PersonalProfile {
  user: { name: string; university: string; birth_date: string };
  zodiac: ZodiacResult;
  numerology: NumerologyResult;
  mbti: MBTIResult;
  synthesis: {
    narrative: string;
    strengths: string[];
    growth_areas: string[];
    personality_keywords: string[];
    career_hints: string[];
  };
}
