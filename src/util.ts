/** Round a number to one decimal place for SVG attributes, so the files stay small. */
export function num(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  // Avoid writing "-0".
  if (Object.is(rounded, -0)) {
    return '0';
  }

  return String(rounded);
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

/** Turn a string into a stable number, used to seed the random generator. */
export function hashString(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * A seeded random number generator (mulberry32). The same seed always gives the
 * same numbers, so the garden only changes when the data changes.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-30" becomes "Oct 30, 2026". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);

  return `${MONTHS[month - 1]} ${day}, ${year}`;
}
