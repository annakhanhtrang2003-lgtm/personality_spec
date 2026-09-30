import { describe, it, expect } from "vitest";
import { initialState, reducer, validateInput } from "../state";
import type { State } from "../state";
import { QUESTION_COUNT } from "../likert";
import type { Response } from "../types";
import { firstIndexOfPart, PART_COUNT } from "../parts";

const validInput = {
  name: "Khánh",
  full_name: "Nguyễn Thị Khánh Trang",
  university: "ueh",
  birth_date: "2003-06-15",
};

const answered = (): (Response | null)[] =>
  Array.from({ length: QUESTION_COUNT }, () => 0 as Response);

describe("validateInput", () => {
  it("passes a complete, valid input", () => {
    expect(validateInput(validInput)).toEqual({});
  });

  it("flags empty name and full name", () => {
    const e = validateInput({ ...validInput, name: "  ", full_name: "" });
    expect(e.name).toBeTruthy();
    expect(e.full_name).toBeTruthy();
  });

  it("flags an unselected university", () => {
    expect(validateInput({ ...validInput, university: "" }).university).toBeTruthy();
  });

  it("flags a missing or future birth date", () => {
    expect(validateInput({ ...validInput, birth_date: "" }).birth_date).toBe(
      "Chọn đủ ngày, tháng và năm.",
    );
    expect(validateInput({ ...validInput, birth_date: "2999-01-01" }).birth_date).toBeTruthy();
  });

  it("flags a name with no mappable letters", () => {
    expect(validateInput({ ...validInput, full_name: "123 !!!" }).full_name).toBeTruthy();
  });
});

describe("reducer", () => {
  it("starts in the intro with 40 empty responses", () => {
    expect(initialState.phase).toBe("intro");
    expect(initialState.responses).toHaveLength(QUESTION_COUNT);
    expect(initialState.responses.every((r) => r === null)).toBe(true);
  });

  it("SET_INPUT updates one field", () => {
    const s = reducer(initialState, { type: "SET_INPUT", field: "name", value: "An" });
    expect(s.input.name).toBe("An");
  });

  it("START_QUIZ is blocked while input is invalid", () => {
    const onForm: State = { ...initialState, phase: "onboarding" };
    const s = reducer(onForm, { type: "START_QUIZ" });
    expect(s.phase).toBe("onboarding");
  });

  it("START_QUIZ enters the quiz once input is valid", () => {
    let s = initialState;
    for (const [field, value] of Object.entries(validInput)) {
      s = reducer(s, { type: "SET_INPUT", field: field as keyof typeof validInput, value });
    }
    s = reducer(s, { type: "START_QUIZ" });
    expect(s.phase).toBe("quiz");
    expect(s.part).toBe(0);
  });

  it("FINISH is blocked until all 40 are answered", () => {
    const partial = { ...initialState, phase: "quiz" as const };
    expect(reducer(partial, { type: "FINISH" }).phase).toBe("quiz");
  });

  it("FINISH computes the profile and enters synthesis", () => {
    const ready = {
      ...initialState,
      phase: "quiz" as const,
      input: validInput,
      responses: answered(),
    };
    const s = reducer(ready, { type: "FINISH" });
    expect(s.phase).toBe("synthesis");
    expect(s.profile).not.toBeNull();
    expect(s.profile!.mbti.type).toBe("INFP"); // all-neutral → declared defaults
  });
});

/** A quiz state on `part` with the listed part-local positions answered. */
function onPart(part: number, answeredWithin: number[] = []): State {
  const responses = initialState.responses.slice();
  for (const within of answeredWithin) responses[firstIndexOfPart(part) + within] = 1;
  return { ...initialState, phase: "quiz", part, responses, open: firstIndexOfPart(part) };
}

describe("quiz navigation", () => {
  it("opens the first row of the part on START_QUIZ", () => {
    let s = initialState;
    for (const [field, value] of Object.entries(validInput)) {
      s = reducer(s, { type: "SET_INPUT", field: field as keyof typeof validInput, value });
    }
    s = reducer(s, { type: "START_QUIZ" });
    expect(s.part).toBe(0);
    expect(s.open).toBe(0);
  });

  it("ANSWER records the response and opens the next unanswered row", () => {
    const s = reducer(onPart(0), { type: "ANSWER", index: 0, value: 2 });
    expect(s.responses[0]).toBe(2);
    expect(s.open).toBe(1);
  });

  it("ANSWER with advance:true (pointer) opens the next unanswered row", () => {
    const s = reducer(onPart(0), { type: "ANSWER", index: 0, value: 2, advance: true });
    expect(s.responses[0]).toBe(2);
    expect(s.open).toBe(1);
  });

  it("ANSWER with advance:false (keyboard) records the response but keeps the row open", () => {
    const s = reducer(onPart(0), { type: "ANSWER", index: 0, value: 2, advance: false });
    expect(s.responses[0]).toBe(2);
    expect(s.open).toBe(0);
  });

  it("a keyboard answer lets the user keep changing the same row up to option 5", () => {
    let s = onPart(0);
    for (const value of [2, 1, 0, -1, -2] as const) {
      s = reducer(s, { type: "ANSWER", index: 0, value, advance: false });
      expect(s.open).toBe(0);
    }
    expect(s.responses[0]).toBe(-2);
  });

  it("skips rows that are already answered", () => {
    const s = reducer(onPart(0, [1, 2]), { type: "ANSWER", index: 0, value: 1 });
    expect(s.open).toBe(3);
  });

  it("wraps to an earlier unanswered row rather than leaving the part", () => {
    // Positions 1..9 answered, 0 left. Answering 9 must come back to 0.
    const s = reducer(onPart(0, [1, 2, 3, 4, 5, 6, 7, 8]), { type: "ANSWER", index: 9, value: 1 });
    expect(s.open).toBe(0);
  });

  it("collapses everything once the part is complete", () => {
    const s = reducer(onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8]), { type: "ANSWER", index: 9, value: 1 });
    expect(s.open).toBeNull();
  });

  it("TOGGLE opens a row and closes it again", () => {
    const opened = reducer(onPart(1), { type: "TOGGLE", index: 14 });
    expect(opened.open).toBe(14);
    expect(reducer(opened, { type: "TOGGLE", index: 14 }).open).toBeNull();
  });

  it("FINISH_PART is refused while the part has an unanswered row", () => {
    const partial = onPart(0, [0, 1, 2]);
    expect(reducer(partial, { type: "FINISH_PART" })).toBe(partial);
  });

  it("FINISH_PART enters the interlude when the part is complete", () => {
    const done = onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const s = reducer(done, { type: "FINISH_PART" });
    expect(s.phase).toBe("interlude");
    expect(s.part).toBe(0);
  });

  it("FINISH_PART on the last part builds the profile instead", () => {
    const all = initialState.responses.map(() => 0 as Response);
    const last = { ...initialState, phase: "quiz" as const, input: validInput, part: PART_COUNT - 1, responses: all };
    const s = reducer(last, { type: "FINISH_PART" });
    expect(s.phase).toBe("synthesis");
    expect(s.profile).not.toBeNull();
  });

  it("CONTINUE moves to the next part and opens its first row", () => {
    const interlude = { ...onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), phase: "interlude" as const };
    const s = reducer(interlude, { type: "CONTINUE" });
    expect(s.phase).toBe("quiz");
    expect(s.part).toBe(1);
    expect(s.open).toBe(firstIndexOfPart(1));
  });

  it("BACK from the interlude returns to the same part", () => {
    const interlude = { ...onPart(1), phase: "interlude" as const };
    const s = reducer(interlude, { type: "BACK" });
    expect(s.phase).toBe("quiz");
    expect(s.part).toBe(1);
  });

  it("BACK inside the quiz steps to the previous part with rows collapsed", () => {
    const s = reducer(onPart(2), { type: "BACK" });
    expect(s.part).toBe(1);
    expect(s.open).toBeNull();
  });

  it("BACK is refused on the first part", () => {
    const first = onPart(0);
    expect(reducer(first, { type: "BACK" })).toBe(first);
  });
});

describe("intro", () => {
  it("START_FORM moves from the intro to the form", () => {
    expect(reducer(initialState, { type: "START_FORM" }).phase).toBe("onboarding");
  });

  it("START_FORM is a no-op outside the intro (double tap, stale click)", () => {
    const onForm: State = { ...initialState, phase: "onboarding" };
    expect(reducer(onForm, { type: "START_FORM" })).toBe(onForm);
    const inQuiz: State = { ...initialState, phase: "quiz" };
    expect(reducer(inQuiz, { type: "START_FORM" })).toBe(inQuiz);
  });

  it("BACK from the form returns to the intro and keeps the input", () => {
    const onForm: State = { ...initialState, phase: "onboarding", input: validInput };
    const back = reducer(onForm, { type: "BACK" });
    expect(back.phase).toBe("intro");
    expect(back.input).toEqual(validInput);
  });

  it("BACK from the intro does nothing", () => {
    expect(reducer(initialState, { type: "BACK" })).toBe(initialState);
  });
});
