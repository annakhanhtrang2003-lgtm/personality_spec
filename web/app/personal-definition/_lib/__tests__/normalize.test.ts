import { describe, it, expect } from "vitest";
import { normalizeVietnamese } from "../normalize";

describe("normalizeVietnamese", () => {
  it("strips every vowel diacritic family", () => {
    expect(normalizeVietnamese("áàảãạăâ")).toBe("AAAAAAA");
    expect(normalizeVietnamese("éèẻẽẹê")).toBe("EEEEEE");
    expect(normalizeVietnamese("íìỉĩị")).toBe("IIIII");
    expect(normalizeVietnamese("óòỏõọôơ")).toBe("OOOOOOO");
    expect(normalizeVietnamese("úùủũụư")).toBe("UUUUUU");
    expect(normalizeVietnamese("ýỳỷỹỵ")).toBe("YYYYY");
  });

  it("maps đ and Đ to D", () => {
    expect(normalizeVietnamese("đĐ")).toBe("DD");
  });

  it("drops spaces, punctuation and digits", () => {
    expect(normalizeVietnamese("Nguyễn Thị Khánh-Trang 2003")).toBe(
      "NGUYENTHIKHANHTRANG"
    );
  });

  it("returns empty string when nothing is mappable", () => {
    expect(normalizeVietnamese("!!! 123 ???")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeVietnamese("Đặng Thuý Vy");
    expect(normalizeVietnamese(once)).toBe(once);
  });
});
