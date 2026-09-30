import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StickerCard } from "../result/StickerCard";

const ALL_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

describe("StickerCard", () => {
  it("tags the card with its type so the kit's per-type colours apply", () => {
    render(<StickerCard type="ENFP" />);
    expect(screen.getByTestId("sticker-card")).toHaveAttribute("data-type", "ENFP");
  });

  it("shows the type and the Vietnamese temperament name on the badge", () => {
    render(<StickerCard type="INTJ" />);
    const badge = screen.getByTestId("sticker-badge");
    expect(badge).toHaveTextContent("INTJ");
    expect(badge).toHaveTextContent("Nhóm Tư Duy");
    expect(badge).not.toHaveTextContent(/Analysts/i);
  });

  it("names the mascot in Vietnamese and hides every decoration", () => {
    const { container } = render(<StickerCard type="ISTJ" />);
    expect(screen.getByAltText("Linh vật ISTJ")).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    svgs.forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
  });

  // Review Focus 2
  it("renders all 16 types, with the right graffiti tag only on Explorers", () => {
    const TAGS: Record<string, string> = { ISTP: "FIX IT", ISFP: "VIBE", ESTP: "GO!", ESFP: "SHOW!" };
    for (const type of ALL_TYPES) {
      const { container, unmount } = render(<StickerCard type={type} />);
      const html = container.innerHTML;
      expect(html, type).not.toContain("{{TAG}}");
      if (TAGS[type]) expect(html, type).toContain(`>${TAGS[type]}<`);
      unmount();
    }
  });

  it("throws on a non-MBTI type instead of drawing an empty card", () => {
    expect(() => render(<StickerCard type="XXXX" />)).toThrow(/XXXX/);
  });
});
