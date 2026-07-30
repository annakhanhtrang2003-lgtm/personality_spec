"use client";

import { useReducer, useState } from "react";
import { initialState, reducer, validateInput } from "./_lib/state";
import type { Input } from "./_lib/state";
import { OnboardingForm } from "./_components/OnboardingForm";
import { QuizItem } from "./_components/QuizItem";
import { SynthesisView } from "./_components/SynthesisView";
import bank from "./_lib/data/questions.json";

const ITEMS = (bank as { items: { text: string }[] }).items;

export default function PersonalDefinitionPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showErrors, setShowErrors] = useState(false);

  const errors = showErrors ? validateInput(state.input) : {};

  const handleStart = () => {
    if (Object.keys(validateInput(state.input)).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    dispatch({ type: "START_QUIZ" });
  };

  return (
    <div className="px-5 py-6 max-w-[600px] mx-auto">
      {state.phase === "onboarding" && (
        <OnboardingForm
          input={state.input}
          errors={errors}
          onChange={(field: keyof Input, value) => dispatch({ type: "SET_INPUT", field, value })}
          onSubmit={handleStart}
        />
      )}

      {state.phase === "quiz" && (
        <QuizItem
          text={ITEMS[state.current]!.text}
          index={state.current}
          value={state.responses[state.current]}
          onAnswer={(v) => dispatch({ type: "ANSWER", index: state.current, value: v })}
          onBack={() => dispatch({ type: "GOTO", index: state.current - 1 })}
          onNext={() => dispatch({ type: "GOTO", index: state.current + 1 })}
          onFinish={() => dispatch({ type: "FINISH" })}
        />
      )}

      {state.phase === "synthesis" && state.profile && <SynthesisView profile={state.profile} />}
    </div>
  );
}
