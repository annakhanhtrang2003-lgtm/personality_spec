/**
 * Vietnamese name → bare A-Z, for numerology letter mapping.
 *
 * Unicode NFD splits a precomposed character into base + combining marks,
 * so a single regex removes every tone mark, the breve (ă), the circumflex
 * (â ê ô) and the horn (ơ ư). Đ/đ is NOT decomposable — it is its own
 * codepoint — so it is replaced explicitly before the A-Z filter would
 * otherwise discard it.
 */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}
