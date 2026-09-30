import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QuizPreview, PREVIEW_ID } from "../onboarding/QuizPreview";
import { PART_THEMES } from "../../_lib/partTheme";

describe("QuizPreview", () => {
  it("renders one card per part with its letter pair and question range", () => {
    render(<QuizPreview onStart={() => {}} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]!).getByText("Phần 1 · Câu 1–10")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("E")).toBeInTheDocument();
    expect(within(cards[3]!).getByText("Phần 4 · Câu 31–40")).toBeInTheDocument();
    expect(within(cards[3]!).getByText("P")).toBeInTheDocument();
  });

  it("is the scroll target of the hero CTA", () => {
    const { container } = render(<QuizPreview onStart={() => {}} />);
    expect(container.querySelector(`#${PREVIEW_ID}`)).not.toBeNull();
  });

  it("calls onStart from 'Làm bài test ngay'", () => {
    const onStart = vi.fn();
    render(<QuizPreview onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Làm bài test ngay" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // Review Focus 4 — keyboard users and missing Element.scrollTo.
  it("has a focusable track and labelled dots that track the current card", () => {
    render(<QuizPreview onStart={() => {}} />);
    expect(screen.getByRole("list", { name: /4 phần của bài test/ })).toHaveAttribute("tabindex", "0");
    const dots = screen.getAllByRole("button", { name: /^Phần \d$/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(() => fireEvent.click(dots[2]!)).not.toThrow();
    expect(dots[2]).toHaveAttribute("aria-current", "true");
    expect(dots[0]).toHaveAttribute("aria-current", "false");
  });

  it("has one card per PART_THEMES entry", () => {
    render(<QuizPreview onStart={() => {}} />);
    expect(screen.getAllByRole("article")).toHaveLength(PART_THEMES.length);
  });

  it("disables dot transitions under prefers-reduced-motion", () => {
    render(<QuizPreview onStart={() => {}} />);
    const dots = screen.getAllByRole("button", { name: /^Phần [0-9]$/ });
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(dot.querySelector("span")!.className).toContain("motion-reduce:transition-none");
    }
  });
});
