import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(
  path.join(process.cwd(), "app/personal-definition/_components/result/sticker.module.css"),
  "utf8",
);

describe("sticker.module.css rest states (generated)", () => {
  it("pins the hidden-at-rest Sentinel tick to its drawn state under reduced motion", () => {
    const m = css.match(/@media \(prefers-reduced-motion: reduce\) \{[^@]*?\.stk--sentinel \.tick \{([^}]*)\}/);
    expect(m?.[1]).toMatch(/stroke-dashoffset:\s*0\s*!important/);
  });

  it("pins the Sentinel tick to its drawn state under data-capturing", () => {
    expect(css).toMatch(
      /:global\(\[data-capturing\]\) \.stk--sentinel \.tick \{[^}]*stroke-dashoffset:\s*0\s*!important/,
    );
  });

  it("stops the .stk card itself (no transform/transition) under reduced motion", () => {
    const m = css.match(/@media \(prefers-reduced-motion: reduce\) \{[^@]*?(\.stk \{[^}]*\})/);
    expect(m?.[1]).toMatch(/transition:\s*none\s*!important/);
    expect(m?.[1]).toMatch(/transform:\s*none\s*!important/);
  });

  it("stops the .stk card itself (no transform/transition) under data-capturing", () => {
    expect(css).toMatch(
      /:global\(\[data-capturing\]\) \.stk \{[^}]*transition:\s*none\s*!important[^}]*transform:\s*none\s*!important/,
    );
  });
});
