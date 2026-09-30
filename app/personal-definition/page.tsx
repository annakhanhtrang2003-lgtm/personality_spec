"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { initialState, reducer, validateInput } from "./_lib/state";
import type { Input } from "./_lib/state";
import { TEASER_PART } from "./_lib/parts";
import { calculateZodiac } from "./_lib/zodiac";
import { calculateNumerology } from "./_lib/numerology";
import { Hero } from "./_components/onboarding/Hero";
import { QuizPreview } from "./_components/onboarding/QuizPreview";
import { OnboardingForm } from "./_components/OnboardingForm";
import { QuizPart } from "./_components/QuizPart";
import { InterludeView } from "./_components/InterludeView";
import { SynthesisView } from "./_components/SynthesisView";

export default function PersonalDefinitionPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showErrors, setShowErrors] = useState(false);

  const { birth_date, full_name } = state.input;
  const inputErrors = validateInput(state.input);
  const errors = showErrors ? inputErrors : {};

  /**
   * Zodiac and numerology depend only on onboarding input, so they are
   * available long before the quiz ends — that is what lets the halfway
   * teaser show real values with no partial MBTI scoring. The memo is
   * gated on `validateInput` reporting no `full_name`/`birth_date` error —
   * the same check START_QUIZ uses — rather than the looser
   * "both fields non-empty" check this used to run on every keystroke.
   * That looser check let a name with no mappable letters (e.g. "88")
   * reach `calculateNumerology` while still onboarding, which throws for
   * exactly that input. Gating on `validateInput` means neither call can
   * throw here, using the same source of truth START_QUIZ already relies
   * on instead of duplicating its rules.
   */
  const preview = useMemo(() => {
    if (inputErrors.full_name || inputErrors.birth_date) return undefined;
    return {
      zodiac: calculateZodiac(birth_date),
      numerology: calculateNumerology(birth_date, full_name),
    };
  }, [birth_date, full_name, inputErrors.full_name, inputErrors.birth_date]);

  // Each screen (intro, onboarding, a quiz part, an interlude, synthesis) is a full
  // page's worth of content; without this, finishing a part while scrolled
  // down lands the next screen mid-scroll instead of at its top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase, state.part]);

  const handleStart = () => {
    if (Object.keys(validateInput(state.input)).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    dispatch({ type: "START_QUIZ" });
  };

  if (state.phase === "intro") {
    return (
      <>
        <Hero />
        <QuizPreview onStart={() => dispatch({ type: "START_FORM" })} />
      </>
    );
  }

  if (state.phase === "onboarding") {
    return (
      <OnboardingForm
        input={state.input}
        errors={errors}
        onChange={(field: keyof Input, value) => dispatch({ type: "SET_INPUT", field, value })}
        onSubmit={handleStart}
        onBack={() => dispatch({ type: "BACK" })}
      />
    );
  }

  // The result paints its own full-bleed temperament background and
  // constrains its content internally, so it sits outside the container.
  if (state.phase === "synthesis" && state.profile) {
    return <SynthesisView profile={state.profile} />;
  }

  return (
    <div className="px-5 py-6 max-w-[600px] mx-auto">
      {state.phase === "quiz" && (
        <QuizPart
          part={state.part}
          responses={state.responses}
          open={state.open}
          onAnswer={(index, value, advance) => dispatch({ type: "ANSWER", index, value, advance })}
          onToggle={(index) => dispatch({ type: "TOGGLE", index })}
          onFinishPart={() => dispatch({ type: "FINISH_PART" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}

      {state.phase === "interlude" && (
        <InterludeView
          part={state.part}
          preview={state.part === TEASER_PART ? preview : undefined}
          onContinue={() => dispatch({ type: "CONTINUE" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}
    </div>
  );
}
