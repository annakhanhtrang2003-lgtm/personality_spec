import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LikertScale } from "../LikertScale";
import { LIKERT_SETS } from "../../_lib/likert";

const base = {
  options: LIKERT_SETS.self,
  value: null,
  onChange: () => {},
  questionId: "7",
  question: "Tôi hay tưởng tượng.",
};

describe("LikertScale", () => {
  it("renders one radio per option, each with an accessible name", () => {
    render(<LikertScale {...base} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    for (const opt of LIKERT_SETS.self) {
      expect(screen.getByRole("radio", { name: opt.label })).toBeInTheDocument();
    }
  });

  it("names the group after the question so the radios are not orphaned", () => {
    render(<LikertScale {...base} />);
    expect(screen.getByRole("group", { name: "Tôi hay tưởng tượng." })).toBeInTheDocument();
  });

  it("shows only the two anchors before anything is chosen", () => {
    render(<LikertScale {...base} />);
    expect(screen.getByText("Đồng ý")).toBeInTheDocument();
    expect(screen.getByText("Không đồng ý")).toBeInTheDocument();
    expect(screen.queryByText("Đúng y chang mình")).not.toBeInTheDocument();
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("");
  });

  it("reports the chosen value and that a pointer click drove it", () => {
    const onChange = vi.fn();
    render(<LikertScale {...base} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Hơi giống mình" }), { detail: 1 });
    expect(onChange).toHaveBeenCalledWith(1, true);
  });

  it("reports advance:false for a keyboard-driven change", () => {
    // Per the HTML radio-group activation behaviour, arrow-key navigation
    // fires a synthetic `click` with `detail: 0` (the same as a
    // programmatic `.click()`) — unlike a real pointer click, whose
    // `detail` is >= 1. fireEvent.click defaults to `detail: 0`, so this is
    // the honest keyboard/programmatic simulation.
    const onChange = vi.fn();
    render(<LikertScale {...base} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Hơi giống mình" }));
    expect(onChange).toHaveBeenCalledWith(1, false);
  });

  it("shows the label of the chosen option and checks its radio", () => {
    render(<LikertScale {...base} value={1} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Hơi giống mình");
    expect(screen.getByRole("radio", { name: "Hơi giống mình" })).toBeChecked();
  });

  it("uses the situation wording when given the situation set", () => {
    render(<LikertScale {...base} options={LIKERT_SETS.situation} value={2} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Chuẩn luôn");
  });

  it("keeps two scales on one page independent", () => {
    render(
      <>
        <LikertScale {...base} questionId="1" />
        <LikertScale {...base} questionId="2" />
      </>,
    );
    const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
    expect(new Set(names).size).toBe(2);
  });
});
