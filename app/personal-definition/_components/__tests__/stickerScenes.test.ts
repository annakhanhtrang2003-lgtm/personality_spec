import { describe, it, expect } from "vitest";
import { SCENES } from "../result/stickerScenes";

describe("stickerScenes (generated)", () => {
  it("has a back and front layer for all four temperaments", () => {
    expect(Object.keys(SCENES).sort()).toEqual(["analysts", "diplomats", "explorers", "sentinels"]);
    for (const [id, s] of Object.entries(SCENES)) {
      expect(s.back.length, `${id} back`).toBeGreaterThan(50);
      expect(s.front.length, `${id} front`).toBeGreaterThan(50);
    }
  });

  it("puts the graffiti placeholder only in the explorers front layer", () => {
    expect(SCENES.explorers.front).toContain("{{TAG}}");
    for (const id of ["analysts", "diplomats", "sentinels"] as const) {
      expect(SCENES[id].front + SCENES[id].back).not.toContain("{{TAG}}");
    }
  });

  it("carries no scripts, event handlers or external references", () => {
    for (const s of Object.values(SCENES)) {
      const all = s.back + s.front;
      expect(all).not.toMatch(/<script|\son\w+=|href=|url\(/i);
    }
  });
});
