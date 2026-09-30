import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Hero } from "../onboarding/Hero";

describe("Hero", () => {
  it("shows the locked headline, subtext and CTA", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Giữa thế giới ai cũng đang rực rỡ… Bạn có đang lạc lối?",
    );
    expect(
      screen.getByText(
        "Cảm giác chênh vênh chỉ là trạm dừng chân đầu tiên. Hãy để sự thấu hiểu bản thân dẫn lối cho bạn bước tiếp.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" })).toBeInTheDocument();
  });

  // Review Focus 2 — jsdom (like some old WebViews) has no scrollIntoView.
  it("does not throw when scrollIntoView is unavailable", () => {
    render(
      <>
        <Hero />
        <div id="pd-quiz-preview" />
      </>,
    );
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" })),
    ).not.toThrow();
  });

  // Review Focus 3 — a fixed height would clip content on 320×568.
  it("uses a minimum height, never a fixed one", () => {
    const { container } = render(<Hero />);
    const section = container.querySelector("section")!;
    expect(section.className).toContain("min-h-[100svh]");
    expect(section.className).not.toMatch(/(^|\s)h-\[/);
  });

  // 320px viewport: the label must be able to wrap instead of overflowing the pill.
  it("lets the CTA label wrap on narrow screens", () => {
    render(<Hero />);
    const cta = screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" });
    expect(cta.className).not.toContain("whitespace-nowrap");
  });
});
