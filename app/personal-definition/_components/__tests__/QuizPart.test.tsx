import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizPart } from "../QuizPart";
import { QUESTION_COUNT } from "../../_lib/likert";
import { firstIndexOfPart } from "../../_lib/parts";
import type { Response } from "../../_lib/types";
import { PART_THEMES } from "../../_lib/partTheme";
import { srcOf } from "../../_lib/mascot";

/** Responses with the given part-local positions of `part` answered. */
function responsesFor(part: number, answeredWithin: number[]): (Response | null)[] {
  const r: (Response | null)[] = Array.from({ length: QUESTION_COUNT }, () => null);
  for (const within of answeredWithin) r[firstIndexOfPart(part) + within] = 1;
  return r;
}

const base = {
  part: 1,
  responses: responsesFor(1, []),
  open: null,
  onAnswer: () => {},
  onToggle: () => {},
  onFinishPart: () => {},
  onBack: () => {},
};

const ALL_TEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("QuizPart", () => {
  it("names the part and its position", () => {
    render(<QuizPart {...base} />);
    expect(screen.getByText("Phần 2/4")).toBeInTheDocument();
    expect(screen.getByText("Cách bạn tiếp nhận")).toBeInTheDocument();
  });

  it("renders all ten rows of the part at once", () => {
    render(<QuizPart {...base} />);
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(10);
  });

  it("fills the bar by answers given, not by row position", () => {
    render(<QuizPart {...base} responses={responsesFor(1, [0, 1, 2])} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("3/10 câu")).toBeInTheDocument();
  });

  it("expands only the open row", () => {
    render(<QuizPart {...base} open={firstIndexOfPart(1) + 2} />);
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("keeps the end-of-part button disabled until all ten are answered", () => {
    const { rerender } = render(<QuizPart {...base} responses={responsesFor(1, [0, 1, 2])} />);
    expect(screen.getByRole("button", { name: "Xong phần 2" })).toBeDisabled();
    rerender(<QuizPart {...base} responses={responsesFor(1, ALL_TEN)} />);
    expect(screen.getByRole("button", { name: "Xong phần 2" })).toBeEnabled();
  });

  it("offers the result button on the last part instead", () => {
    render(<QuizPart {...base} part={3} responses={responsesFor(3, ALL_TEN)} />);
    expect(screen.getByRole("button", { name: "Xem kết quả" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xong phần/ })).not.toBeInTheDocument();
  });

  it("hides the back button on the first part", () => {
    render(<QuizPart {...base} part={0} responses={responsesFor(0, [])} />);
    expect(screen.queryByRole("button", { name: "Quay lại" })).not.toBeInTheDocument();
  });

  it("reports which row was answered, by absolute index, and that a pointer drove it", () => {
    const onAnswer = vi.fn();
    render(<QuizPart {...base} open={firstIndexOfPart(1)} onAnswer={onAnswer} />);
    fireEvent.click(screen.getAllByRole("radio")[0]!, { detail: 1 });
    expect(onAnswer).toHaveBeenCalledWith(firstIndexOfPart(1), 2, true);
  });

  it("reports advance:false for a keyboard-driven answer", () => {
    const onAnswer = vi.fn();
    render(<QuizPart {...base} open={firstIndexOfPart(1)} onAnswer={onAnswer} />);
    fireEvent.click(screen.getAllByRole("radio")[0]!); // detail 0 — keyboard/programmatic
    expect(onAnswer).toHaveBeenCalledWith(firstIndexOfPart(1), 2, false);
  });

  it("keeps the row's scale reachable through all five options on keyboard input", () => {
    // Regression for the keyboard trap: a keyboard change (advance:false)
    // must not collapse the row, so every option stays reachable.
    const open = firstIndexOfPart(1);
    const { rerender } = render(<QuizPart {...base} open={open} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("radio")[0]!); // keyboard, advance:false
    // `open` is unchanged because the parent reducer would not have moved
    // it either — re-render with the same prop to mirror that.
    rerender(<QuizPart {...base} open={open} responses={responsesFor(1, [0])} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("radio")[4]!);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("moves focus to the next row's toggle after a pointer-triggered auto-advance", () => {
    const open = firstIndexOfPart(1);
    const nextOpenIndex = open + 1;
    const { rerender } = render(<QuizPart {...base} open={open} />);
    fireEvent.click(screen.getAllByRole("radio")[0]!, { detail: 1 }); // pointer
    rerender(<QuizPart {...base} open={nextOpenIndex} responses={responsesFor(1, [0])} />);
    expect(document.activeElement).toHaveAttribute("id", `quiz-row-toggle-${nextOpenIndex}`);
  });

  it("does not steal focus when the row change was keyboard-driven", () => {
    const open = firstIndexOfPart(1);
    render(<QuizPart {...base} open={open} />);
    fireEvent.click(screen.getAllByRole("radio")[0]!); // keyboard, advance:false, open unchanged
    expect(document.activeElement).not.toHaveAttribute("id", `quiz-row-toggle-${open + 1}`);
  });

  it("reports which row was toggled, by absolute index", () => {
    const onToggle = vi.fn();
    render(<QuizPart {...base} onToggle={onToggle} />);
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[4]!);
    expect(onToggle).toHaveBeenCalledWith(firstIndexOfPart(1) + 4);
  });

  it("shows the part's dimension mascot", () => {
    const { container } = render(<QuizPart {...base} />);
    expect(container.querySelector("img")).toHaveAttribute("src", srcOf(PART_THEMES[1]!.mascot));
  });

  it("remounts the mascot on each new answer so the pulse replays", () => {
    const { container, rerender } = render(<QuizPart {...base} />);
    const before = container.querySelector("img");
    rerender(<QuizPart {...base} responses={responsesFor(1, [0])} />);
    expect(container.querySelector("img")).not.toBe(before);
  });

  it("shows the part's letter pair", () => {
    const { rerender } = render(<QuizPart {...base} part={0} responses={responsesFor(0, [])} />);
    expect(screen.getByTestId("part-letters")).toHaveTextContent("E · I");
    rerender(<QuizPart {...base} part={3} responses={responsesFor(3, [])} />);
    expect(screen.getByTestId("part-letters")).toHaveTextContent("J · P");
  });

  it("marks the mascot face as decorative", () => {
    const { container } = render(<QuizPart {...base} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
