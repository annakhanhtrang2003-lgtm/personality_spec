import { describe, it, expect } from "vitest";
import { calculateZodiac } from "../zodiac";
import signs from "../data/zodiac-signs.json";

describe("calculateZodiac", () => {
  it("returns the sign containing the date", () => {
    expect(calculateZodiac("2003-06-15").sun_sign).toBe("Song Tử");
  });

  it("is inclusive on both boundary days of every sign", () => {
    for (const s of signs) {
      const [sm, sd] = s.start.split("-");
      const [em, ed] = s.end.split("-");
      expect(calculateZodiac(`2003-${sm}-${sd}`).sun_sign).toBe(s.sun_sign);
      expect(calculateZodiac(`2003-${em}-${ed}`).sun_sign).toBe(s.sun_sign);
    }
  });

  it("handles the Ma Kết year wrap on both sides", () => {
    expect(calculateZodiac("2003-12-25").sun_sign).toBe("Ma Kết");
    expect(calculateZodiac("2003-01-05").sun_sign).toBe("Ma Kết");
  });

  it("derives element and modality from the sign", () => {
    const r = calculateZodiac("2003-11-30");
    expect(r.sun_sign).toBe("Nhân Mã");
    expect(r.element).toBe("Fire");
    expect(r.modality).toBe("Mutable");
  });

  it("leaves moon and rising null in Phase 1", () => {
    const r = calculateZodiac("2003-06-15");
    expect(r.moon_sign).toBeNull();
    expect(r.rising_sign).toBeNull();
  });

  it("covers all 366 days of a leap year with exactly one sign", () => {
    const d = new Date(Date.UTC(2004, 0, 1));
    let n = 0;
    while (d.getUTCFullYear() === 2004) {
      expect(() => calculateZodiac(d.toISOString().slice(0, 10))).not.toThrow();
      d.setUTCDate(d.getUTCDate() + 1);
      n++;
    }
    expect(n).toBe(366);
  });

  it("rejects a malformed date", () => {
    expect(() => calculateZodiac("15-06-2003")).toThrow(/YYYY-MM-DD/);
  });

  it("rejects impossible calendar dates instead of silently resolving them", () => {
    expect(() => calculateZodiac("2003-02-30")).toThrow(/not a real date/);
    expect(() => calculateZodiac("2003-13-45")).toThrow(/not a real date/);
    expect(() => calculateZodiac("2003-00-00")).toThrow(/not a real date/);
  });

  // r.traits was previously a reference into the imported zodiac-signs.json
  // module object, which Node caches and shares across every
  // calculateZodiac() call in the process. Mutating a returned result's
  // traits array would silently corrupt that sign's data for every
  // subsequent call, process-wide.
  it("returns a traits array that is safe to mutate — a fresh call is unaffected", () => {
    const r = calculateZodiac("2003-06-15"); // Song Tử
    r.traits.push("PROBE_MUTATED");

    const fresh = calculateZodiac("2003-06-15");
    expect(fresh.traits).not.toContain("PROBE_MUTATED");
  });
});
