import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InterludeView } from "../InterludeView";
import { calculateZodiac } from "../../_lib/zodiac";
import { calculateNumerology } from "../../_lib/numerology";

describe("InterludeView", () => {
  it("says which part was finished", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Xong phần 1/4 rồi!")).toBeInTheDocument();
  });

  it("names the part coming next", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/Cách bạn tiếp nhận/)).toBeInTheDocument();
  });

  it("gives each interlude its own line of encouragement", () => {
    const { unmount } = render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    const first = screen.getByTestId("interlude-line").textContent;
    unmount();
    render(<InterludeView part={1} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("interlude-line").textContent).not.toBe(first);
  });

  it("shows a mascot, marked decorative", () => {
    const { container } = render(<InterludeView part={2} onContinue={() => {}} onBack={() => {}} />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "");
  });

  it("continues and goes back", () => {
    const onContinue = vi.fn();
    const onBack = vi.fn();
    render(<InterludeView part={1} onContinue={onContinue} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Đi tiếp" }));
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });
});

const preview = {
  zodiac: calculateZodiac("2003-10-05"),
  numerology: calculateNumerology("2003-10-05", "Nguyễn Thị Khánh Trang"),
};

describe("InterludeView teaser", () => {
  it("shows nothing extra when no preview is given", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.queryByTestId("teaser")).not.toBeInTheDocument();
  });

  it("reveals the zodiac sign when a preview is given", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("teaser")).toBeInTheDocument();
    expect(screen.getByText(preview.zodiac.sun_sign)).toBeInTheDocument();
  });

  it("reveals the life path number", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText(String(preview.numerology.life_path))).toBeInTheDocument();
  });

  it("keeps MBTI locked and names no type", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("teaser-locked")).toBeInTheDocument();
    // A halfway type could contradict the final one, so none is computed.
    expect(screen.queryByText(/INFP|INFJ|ENFP|ESTJ/)).not.toBeInTheDocument();
  });

  it("counts the questions still to go", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Còn 20 câu nữa")).toBeInTheDocument();
  });

  it("still offers the continue button", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: "Đi tiếp" })).toBeInTheDocument();
  });
});
