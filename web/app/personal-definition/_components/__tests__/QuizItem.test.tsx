import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizItem } from "../QuizItem";

const base = {
  index: 13,
  text: "Khi nhận đề tài mới, tôi muốn xem một ví dụ cụ thể trước đã.",
  value: null,
  isOpen: false,
  onToggle: () => {},
  onAnswer: () => {},
};

describe("QuizItem", () => {
  it("numbers the row within its part, not across the bank", () => {
    render(<QuizItem {...base} />);
    // index 13 is the 4th item of part 2
    expect(screen.getByText("4.")).toBeInTheDocument();
  });

  it("shows the full item text whether open or closed", () => {
    const { rerender } = render(<QuizItem {...base} />);
    expect(screen.getByText(base.text)).toBeInTheDocument();
    rerender(<QuizItem {...base} isOpen />);
    expect(screen.getByText(base.text)).toBeInTheDocument();
  });

  it("hides the scale while collapsed", () => {
    render(<QuizItem {...base} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the scale when open", () => {
    render(<QuizItem {...base} isOpen />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("reports expansion state to assistive tech", () => {
    const { rerender } = render(<QuizItem {...base} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    rerender(<QuizItem {...base} isOpen />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles when the row is clicked", () => {
    const onToggle = vi.fn();
    render(<QuizItem {...base} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("marks an answered row", () => {
    render(<QuizItem {...base} value={2} />);
    expect(screen.getByTestId("row-answered")).toBeInTheDocument();
  });

  it("leaves an unanswered row unmarked", () => {
    render(<QuizItem {...base} />);
    expect(screen.queryByTestId("row-answered")).not.toBeInTheDocument();
  });

  it("passes the label set that matches the item", () => {
    // index 13 is sn_02, label_set "situation"
    render(<QuizItem {...base} isOpen value={2} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Chuẩn luôn");
  });

  it("reports the chosen value and whether a pointer drove it", () => {
    const onAnswer = vi.fn();
    render(<QuizItem {...base} isOpen onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("radio", { name: "Chuẩn luôn" }), { detail: 1 });
    expect(onAnswer).toHaveBeenCalledWith(2, true);
  });

  it("gives the row's toggle button a stable id so focus can be moved to it", () => {
    render(<QuizItem {...base} />);
    expect(screen.getByRole("button")).toHaveAttribute("id", `quiz-row-toggle-${base.index}`);
  });
});
