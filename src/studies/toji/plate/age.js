// The lid's age: years ↔ uAge (0..1), the default, and the URL parameters that set it. One module so the three.js plate
// (three-renderer.js, three-pack.js) and the page's age slider (study.js) read the same numbers (chain-2 V8). No imports.

/**
 * The lid's age (uAge, 0..1) from its age in years. Lacquer clears fastest in its first decades and ever more slowly after: an
 * exponential approach with a time constant of AGE_TAU_YEARS. The fixed point is the Hatsune trousseau, made in 1639: at its age
 * (HATSUNE_YEARS in 2026) the curve gives about .92, the look the shader's age 1 constants were set against. 0 years is a lid fresh
 * from the workshop: a deep brown film over the gold.
 */
export const AGE_TAU_YEARS = 150, HATSUNE_YEARS = 2026 - 1639;
/** @param {unknown} years */
export const ageFromYears = years => 1 - Math.exp(-Math.max(0, Number(years) || 0) / AGE_TAU_YEARS);
/** The inverse of ageFromYears: the years that give uAge `age` (0 ≤ age < 1). @param {number} age */
export const yearsFromAge = age => -AGE_TAU_YEARS * Math.log(1 - Math.min(Math.max(age, 0), 1 - 1e-9));

/** How old the lid looks when nothing sets it (about 285 years: mid-Edo). */
export const AGE_DEFAULT = .85;

/**
 * The lid's age from the page's URL: ?years=N (its age in years) wins over ?age=0..1 (uAge itself); otherwise AGE_DEFAULT.
 * @param {string} [search] location.search
 */
export function ageFromSearch(search = '') {
  const params = new URLSearchParams(search), years = params.get('years'), age = params.get('age');
  if (years !== null && !Number.isNaN(Number(years))) return ageFromYears(Number(years));
  if (age === null || Number.isNaN(Number(age))) return AGE_DEFAULT;
  return Math.min(1, Math.max(0, Number(age)));
}
