import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SynthesisView } from "../SynthesisView";
import { dominantPole } from "../../_lib/poles";
import type { Dimension } from "../../_lib/types";
import { profile } from "./fixtures";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

describe("SynthesisView", () => {
  it("guards the fixture: four distinct, non-tied percentages, type ESFP", () => {
    const percents = DIMENSIONS.map((d) => dominantPole(d, profile.mbti.dimensions[d]).percent);
    expect(new Set(percents).size).toBe(4);
    expect(percents).not.toContain(50);
    expect(profile.mbti.type).toBe("ESFP");
  });

  it("leads with the sticker card, the type as the page heading, and the Vietnamese label", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByTestId("sticker-card")).toHaveAttribute("data-type", "ESFP");
    expect(screen.getByRole("heading", { level: 1, name: profile.mbti.type })).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.label)).toBeInTheDocument();
  });

  it("shows the user's name without zodiac or life path", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByTestId("result-name")).toHaveTextContent(profile.user.name);
    expect(screen.getByTestId("result-name")).not.toHaveTextContent(profile.zodiac.sun_sign);
  });

  it("renders the narrative including its caveat", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByText(/không phải toàn bộ con người bạn/)).toBeInTheDocument();
  });

  it("renders the four sections in order", () => {
    render(<SynthesisView profile={profile} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Bốn chiều của bạn", "Điểm mạnh", "Điểm cần cải thiện", "Nghề nghiệp phù hợp"]);
  });

  it("has no zodiac or numerology anywhere on the screen", () => {
    const { container } = render(<SynthesisView profile={profile} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Cung |Thần số học|Số Chủ Đạo|Số Sứ Mệnh|Số Linh Hồn|Số Nhân Cách/);
    expect(text).not.toContain(profile.zodiac.sun_sign);
  });

  it("paints the page in the temperament tint", () => {
    render(<SynthesisView profile={profile} />);
    // ESFP → explorers → #fff7d6
    expect(screen.getByTestId("result-page")).toHaveStyle({ backgroundColor: "#fff7d6" });
  });

  it("renders whatever actions it is given", () => {
    render(<SynthesisView profile={profile} actions={<button>Lưu ảnh</button>} />);
    expect(screen.getByRole("button", { name: "Lưu ảnh" })).toBeInTheDocument();
  });
});
