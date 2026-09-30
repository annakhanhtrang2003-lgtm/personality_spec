import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DimensionBreakdown } from "../result/DimensionBreakdown";
import { dominantPole, POLE_NAMES } from "../../_lib/poles";
import type { Dimension, MBTIResult } from "../../_lib/types";
import bank from "../../_lib/data/questions.json";
import { profile } from "./fixtures";

const DIMS: Dimension[] = ["EI", "SN", "TF", "JP"];
const POLES = (bank as { poles: Record<Dimension, { first: string; second: string }> }).poles;
const DEFS = (bank as { pole_definitions: Record<string, string> }).pole_definitions;
const ACCENT = "#6d28d9";

function renderWith(mbti: MBTIResult) {
  return render(<DimensionBreakdown mbti={mbti} keywords={["tò mò", "linh hoạt"]} accent={ACCENT} />);
}

describe("DimensionBreakdown", () => {
  it("is headed 'Bốn chiều của bạn' and lists EI, SN, TF, JP in order", () => {
    renderWith(profile.mbti);
    expect(screen.getByRole("heading", { name: "Bốn chiều của bạn" })).toBeInTheDocument();
    const rows = screen.getAllByTestId(/^dim-(EI|SN|TF|JP)$/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(["dim-EI", "dim-SN", "dim-TF", "dim-JP"]);
  });

  // Review Focus 4
  it("gives each row a text alternative with both poles and both percentages", () => {
    renderWith(profile.mbti);
    for (const d of DIMS) {
      const { first, second } = POLES[d];
      const s = profile.mbti.dimensions[d];
      expect(
        within(screen.getByTestId(`dim-${d}`)).getByText(
          `${POLE_NAMES[first]} ${s.first}%, ${POLE_NAMES[second]} ${s.second}%`,
        ),
      ).toBeInTheDocument();
    }
  });

  it("lists the first pole on the left and the second on the right in each label row", () => {
    renderWith(profile.mbti);
    for (const d of DIMS) {
      const { first, second } = POLES[d];
      const row = screen.getByTestId(`dim-${d}`);
      const labels = row.querySelector("p.sr-only")!.nextElementSibling as HTMLElement;
      expect(labels.getAttribute("aria-hidden")).toBe("true");
      expect(labels.children[0]).toHaveTextContent(POLE_NAMES[first]!);
      expect(labels.children[1]).toHaveTextContent(POLE_NAMES[second]!);
    }
  });

  it("explains the winning pole under each row", () => {
    renderWith(profile.mbti);
    for (const d of DIMS) {
      const { pole } = dominantPole(d, profile.mbti.dimensions[d]);
      expect(within(screen.getByTestId(`dim-${d}`)).getByText(DEFS[pole]!)).toBeInTheDocument();
    }
  });

  // Review Focus 5 — fixture EI leans E (first pole), so the marker is left of centre.
  it("puts the marker on the winning side", () => {
    renderWith(profile.mbti);
    const s = profile.mbti.dimensions.EI;
    expect(s.first).toBeGreaterThan(50);
    const left = parseFloat(screen.getByTestId("dim-EI-marker").style.left);
    expect(left).toBe(100 - s.first);
    expect(left).toBeLessThan(50);
  });

  // Review Focus 1
  it("shows a 50/50 dimension as the default pole, marker centred", () => {
    const tied: MBTIResult = {
      ...profile.mbti,
      dimensions: { ...profile.mbti.dimensions, EI: { ...profile.mbti.dimensions.EI, raw: 0, first: 50, second: 50 } },
    };
    renderWith(tied);
    const row = screen.getByTestId("dim-EI");
    expect(within(row).getByText(DEFS["I"]!)).toBeInTheDocument();
    expect(screen.getByTestId("dim-EI-marker").style.left).toBe("50%");
  });

  it("renders the keywords as chips", () => {
    renderWith(profile.mbti);
    expect(screen.getByText("tò mò")).toBeInTheDocument();
    expect(screen.getByText("linh hoạt")).toBeInTheDocument();
  });
});
