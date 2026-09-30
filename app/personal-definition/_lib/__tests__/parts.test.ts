import { describe, it, expect } from "vitest";
import {
  PART_SIZE, PART_COUNT, PART_TITLES,
  partOf, indexWithinPart,
  firstIndexOfPart, lastIndexOfPart,
  indicesOfPart, TEASER_PART,
} from "../parts";
import { QUESTION_COUNT } from "../likert";
import bank from "../data/questions.json";
import { PART_THEMES } from "../partTheme";

describe("parts", () => {
  it("splits the bank into four parts of ten", () => {
    expect(PART_SIZE).toBe(10);
    expect(PART_COUNT).toBe(4);
    expect(PART_SIZE * PART_COUNT).toBe(QUESTION_COUNT);
  });

  it("titles every part", () => {
    expect(PART_TITLES).toHaveLength(PART_COUNT);
    for (const title of PART_TITLES) expect(title.length).toBeGreaterThan(0);
  });

  it("maps item indices to parts", () => {
    expect(partOf(0)).toBe(0);
    expect(partOf(9)).toBe(0);
    expect(partOf(10)).toBe(1);
    expect(partOf(39)).toBe(3);
  });

  it("counts position within the part", () => {
    expect(indexWithinPart(0)).toBe(0);
    expect(indexWithinPart(9)).toBe(9);
    expect(indexWithinPart(10)).toBe(0);
    expect(indexWithinPart(39)).toBe(9);
  });

  it("gives the bounds of a part", () => {
    expect(firstIndexOfPart(0)).toBe(0);
    expect(lastIndexOfPart(0)).toBe(9);
    expect(firstIndexOfPart(2)).toBe(20);
    expect(lastIndexOfPart(3)).toBe(39);
  });
});

describe("indicesOfPart", () => {
  it("lists the ten absolute indices of a part", () => {
    expect(indicesOfPart(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(indicesOfPart(2)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  });

  it("covers the whole bank with no gaps or repeats across every part", () => {
    const all = Array.from({ length: PART_COUNT }, (_, p) => indicesOfPart(p)).flat();
    expect(all).toEqual(Array.from({ length: PART_COUNT * PART_SIZE }, (_, i) => i));
  });
});

describe("TEASER_PART", () => {
  it("is the halfway boundary", () => {
    // The interlude after this part shows the teaser, so it must sit at
    // exactly 50% of the bank. Spec §5.
    expect((TEASER_PART + 1) * PART_SIZE).toBe((PART_COUNT * PART_SIZE) / 2);
  });
});

describe("parts are dimensions", () => {
  const ITEMS = (bank as { items: { id: string; dimension: string; key: number }[] }).items;
  const ORDER = ["EI", "SN", "TF", "JP"];

  it("gives each part exactly one dimension, in EI, SN, TF, JP order", () => {
    for (let p = 0; p < PART_COUNT; p++) {
      const dims = new Set(indicesOfPart(p).map((i) => ITEMS[i]!.dimension));
      expect([...dims]).toEqual([ORDER[p]]);
    }
  });

  it("balances five items per pole in every part", () => {
    for (let p = 0; p < PART_COUNT; p++) {
      const keys = indicesOfPart(p).map((i) => ITEMS[i]!.key);
      expect(keys.filter((k) => k === 1)).toHaveLength(5);
      expect(keys.filter((k) => k === -1)).toHaveLength(5);
    }
  });

  it("keeps each dimension's items in their previous relative order", () => {
    expect(ITEMS.map((i) => i.id)).toEqual([
      "ei_01", "ei_06", "ei_02", "ei_07", "ei_03", "ei_08", "ei_04", "ei_09", "ei_05", "ei_10",
      "sn_06", "sn_01", "sn_07", "sn_02", "sn_08", "sn_03", "sn_09", "sn_04", "sn_10", "sn_05",
      "tf_06", "tf_01", "tf_07", "tf_02", "tf_08", "tf_03", "tf_09", "tf_04", "tf_10", "tf_05",
      "jp_01", "jp_06", "jp_02", "jp_07", "jp_03", "jp_08", "jp_04", "jp_09", "jp_05", "jp_10",
    ]);
  });

  it("matches the preview card letters to the part's dimension", () => {
    expect(PART_THEMES.map((t) => t.letters.join(""))).toEqual(ORDER);
  });
});
