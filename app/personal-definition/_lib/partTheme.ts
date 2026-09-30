import hero from "../_assets/onboarding/hero.webp";
import ei from "../_assets/onboarding/ei.webp";
import sn from "../_assets/onboarding/sn.webp";
import tf from "../_assets/onboarding/tf.webp";
import jp from "../_assets/onboarding/jp.webp";
import type { ImageAsset } from "./mascot";
import { POLE_NAMES } from "./poles";

/**
 * One entry per quiz part — the single source for the intro's preview cards
 * and the quiz part header, so the card a student saw and the screen they
 * land on cannot drift apart. Index = part = dimension (questions.json is
 * grouped EI, SN, TF, JP; see parts.test.ts). Colours are the prototype's
 * `.qp--*` values; they are runtime values, so consumers apply them through
 * inline `style`, not Tailwind classes.
 */
export interface PartTheme {
  letters: readonly [string, string];
  poleNames: readonly [string, string];
  mascot: ImageAsset;
  bg: string;
  ring: string;
  well: string;
  badge: string;
  badgeInk: string;
  chip: string;
}

export const HERO_MASCOT: ImageAsset = hero;

export const PART_THEMES: readonly PartTheme[] = [
  {
    letters: ["E", "I"],
    poleNames: [POLE_NAMES.E!, POLE_NAMES.I!],
    mascot: ei,
    bg: "#fdf2f8",
    ring: "#fbcfe8",
    well: "linear-gradient(135deg, #fbcfe8, #ffe4e6 50%, #ffedd5)",
    badge: "#ec4899",
    badgeInk: "#fff",
    chip: "#db2777",
  },
  {
    letters: ["S", "N"],
    poleNames: [POLE_NAMES.S!, POLE_NAMES.N!],
    mascot: sn,
    bg: "#f5f3ff",
    ring: "#ddd6fe",
    well: "linear-gradient(135deg, #ddd6fe, #e0e7ff 50%, #e0f2fe)",
    badge: "#8b5cf6",
    badgeInk: "#fff",
    chip: "#7c3aed",
  },
  {
    letters: ["T", "F"],
    poleNames: [POLE_NAMES.T!, POLE_NAMES.F!],
    mascot: tf,
    bg: "#f0f9ff",
    ring: "#bae6fd",
    well: "linear-gradient(135deg, #bae6fd, #cffafe 50%, #d1fae5)",
    badge: "#0284c7",
    badgeInk: "#fff",
    chip: "#0369a1",
  },
  {
    letters: ["J", "P"],
    poleNames: [POLE_NAMES.J!, POLE_NAMES.P!],
    mascot: jp,
    bg: "#fffbeb",
    ring: "#fde68a",
    well: "linear-gradient(135deg, #fde68a, #fef9c3 50%, #ecfccb)",
    badge: "#f59e0b",
    // White on #f59e0b fails WCAG AA; the prototype's dark brown passes.
    badgeInk: "#451a03",
    chip: "#b45309",
  },
];
