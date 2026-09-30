import type { PersonalProfile, Response } from "./types";
import { buildProfile } from "./profile";
import { normalizeVietnamese } from "./normalize";
import { QUESTION_COUNT } from "./likert";
import { PART_COUNT, indicesOfPart, firstIndexOfPart } from "./parts";

export type Phase = "intro" | "onboarding" | "quiz" | "interlude" | "synthesis";

export interface Input {
  name: string;
  full_name: string;
  university: string;
  birth_date: string; // YYYY-MM-DD
}

export type InputErrors = Partial<Record<keyof Input, string>>;

export interface State {
  phase: Phase;
  input: Input;
  responses: (Response | null)[];
  /** Which of the four screens is showing. */
  part: number;
  /** Absolute index of the expanded row, or null when all are collapsed. */
  open: number | null;
  profile: PersonalProfile | null;
}

export type Action =
  | { type: "SET_INPUT"; field: keyof Input; value: string }
  | { type: "START_FORM" }
  | { type: "START_QUIZ" }
  | { type: "ANSWER"; index: number; value: Response; advance?: boolean }
  | { type: "TOGGLE"; index: number }
  | { type: "FINISH_PART" }
  | { type: "BACK" }
  | { type: "CONTINUE" }
  | { type: "FINISH" };

export const initialState: State = {
  phase: "intro",
  input: { name: "", full_name: "", university: "", birth_date: "" },
  responses: Array.from({ length: QUESTION_COUNT }, () => null),
  part: 0,
  open: null,
  profile: null,
};

/**
 * The row to expand after answering `after`: the next unanswered row in the
 * part, scanning ascending and wrapping to the start of the part, or null
 * when every row is answered.
 *
 * Wrapping matters — a student who skips row 0 and answers 1..9 must be
 * brought back to 0 rather than dropped at the end of a part that still
 * cannot be finished. Returning null on a complete part is what enables the
 * end-of-part button, so "nothing left to open" and "you may leave" are the
 * same state and cannot drift apart.
 */
function nextOpen(
  responses: (Response | null)[],
  part: number,
  after: number,
): number | null {
  const indices = indicesOfPart(part);
  const from = indices.indexOf(after);
  for (let step = 1; step <= indices.length; step++) {
    const index = indices[(from + step + indices.length) % indices.length]!;
    if (responses[index] === null) return index;
  }
  return null;
}

/** Pure validation shared by the form (for messages) and the START_QUIZ guard. */
export function validateInput(input: Input): InputErrors {
  const errors: InputErrors = {};
  if (!input.name.trim()) errors.name = "Cho mình biết tên bạn nhé.";
  if (!input.full_name.trim()) {
    errors.full_name = "Điền họ tên đầy đủ giúp mình.";
  } else if (normalizeVietnamese(input.full_name).length === 0) {
    errors.full_name = "Tên cần có chữ cái để tính được con số của bạn.";
  }
  if (!input.university) errors.university = "Chọn trường của bạn.";
  if (!input.birth_date) {
    errors.birth_date = "Chọn đủ ngày, tháng và năm.";
  } else {
    const d = new Date(input.birth_date + "T00:00:00");
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
      errors.birth_date = "Ngày sinh chưa hợp lệ.";
    }
  }
  return errors;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: { ...state.input, [action.field]: action.value } };

    case "START_FORM":
      if (state.phase !== "intro") return state;
      return { ...state, phase: "onboarding" };

    case "START_QUIZ":
      if (Object.keys(validateInput(state.input)).length > 0) return state;
      return { ...state, phase: "quiz", part: 0, open: firstIndexOfPart(0) };

    case "ANSWER": {
      const responses = state.responses.slice();
      responses[action.index] = action.value;
      // `advance` defaults to true (pointer behaviour) so every existing
      // dispatch that omits it keeps auto-advancing. Keyboard input passes
      // `advance: false` explicitly — see LikertScale — and the row stays
      // open so arrow-key users can keep changing their answer instead of
      // having the row collapse and their focus drop to <body>.
      const advance = action.advance ?? true;
      return {
        ...state,
        responses,
        open: advance ? nextOpen(responses, state.part, action.index) : state.open,
      };
    }

    case "TOGGLE":
      return { ...state, open: state.open === action.index ? null : action.index };

    case "FINISH_PART": {
      if (state.phase !== "quiz") return state;
      const complete = indicesOfPart(state.part).every((i) => state.responses[i] !== null);
      if (!complete) return state;
      // The last part has no interlude after it — it goes straight to the
      // profile. FINISH re-checks all 40 rather than trusting the per-part
      // gates, so the "every response present" contract has one owner.
      if (state.part >= PART_COUNT - 1) return reducer(state, { type: "FINISH" });
      return { ...state, phase: "interlude" };
    }

    case "CONTINUE": {
      if (state.phase !== "interlude") return state;
      const next = state.part + 1;
      if (next >= PART_COUNT) return state;
      return { ...state, phase: "quiz", part: next, open: firstIndexOfPart(next) };
    }

    case "BACK": {
      if (state.phase === "onboarding") return { ...state, phase: "intro" };
      if (state.phase === "interlude") return { ...state, phase: "quiz" };
      if (state.phase !== "quiz") return state;
      if (state.part === 0) return state;
      return { ...state, part: state.part - 1, open: null };
    }

    case "FINISH": {
      if (state.responses.some((r) => r === null)) return state;
      const profile = buildProfile({
        name: state.input.name,
        university: state.input.university,
        birth_date: state.input.birth_date,
        full_name: state.input.full_name,
        responses: state.responses as Response[],
      });
      return { ...state, phase: "synthesis", profile };
    }

    default:
      return state;
  }
}
