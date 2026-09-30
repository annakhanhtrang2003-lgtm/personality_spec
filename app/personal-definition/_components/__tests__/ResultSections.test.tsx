import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StrengthsGrowth } from "../result/StrengthsGrowth";
import { CareerSection } from "../result/CareerSection";
import { profile } from "./fixtures";

const ACCENT = "#c2410c";

describe("StrengthsGrowth", () => {
  it("lists every strength and growth area under its own heading", () => {
    render(
      <StrengthsGrowth
        strengths={profile.synthesis.strengths}
        growthAreas={profile.synthesis.growth_areas}
        accent={ACCENT}
      />,
    );
    const strengths = screen.getByRole("heading", { name: "Điểm mạnh" }).closest("section")!;
    const growth = screen.getByRole("heading", { name: "Điểm cần cải thiện" }).closest("section")!;
    expect(within(strengths).getAllByRole("listitem")).toHaveLength(profile.synthesis.strengths.length);
    expect(within(growth).getAllByRole("listitem")).toHaveLength(profile.synthesis.growth_areas.length);
  });
});

describe("CareerSection", () => {
  it("shows every career hint as a chip, with the hint-not-verdict footnote", () => {
    render(<CareerSection hints={profile.synthesis.career_hints} accent={ACCENT} />);
    expect(screen.getByRole("heading", { name: "Nghề nghiệp phù hợp" })).toBeInTheDocument();
    for (const h of profile.synthesis.career_hints) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
    expect(
      screen.getByText("Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất."),
    ).toBeInTheDocument();
  });
});
