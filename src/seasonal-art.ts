import type { Theme } from './types.js';

/** Decorations are local to their ground anchor; the renderer supplies depth and position. */
export function pine(theme: Theme, festive: boolean): string {
  let svg = `<g data-decoration="${festive ? 'christmas-tree' : 'pine'}">` +
    `<ellipse cy="2" rx="26" ry="8" fill="${theme.shadow}" opacity=".2"/>` +
    `<path d="M-4 0V-30H4V0Z" fill="${theme.woodMid}"/>`;

  for (const [top, bottom, width] of [[-94, -43, 21], [-77, -25, 29], [-57, -8, 36]]) {
    svg += `<path d="M0 ${top}L${width} ${bottom}H${-width}Z" fill="#315e50"/>` +
      `<path d="M0 ${top}L0 ${bottom}H${-width}Z" fill="#497e66"/>`;
  }

  // Draw snow after the foliage so overlapping tiers cannot hide the branch-edge patches.
  for (const [bottom, width] of [[-43, 21], [-25, 29], [-8, 36]]) {
    svg += `<g data-decoration="branch-snow" transform="translate(0 ${bottom - 9}) scale(${width / 36})" fill="${theme.grassLight}">` +
      `<path d="M-29 1Q-27 -2 -24 -2Q-22 -6 -19 -4Q-16 -5 -14 -2Q-11 -2 -10 1Q-14 4 -18 3Q-21 6 -24 3Q-27 4 -29 1Z"/>` +
      `<path d="M10 3Q12 0 15 1Q17 -3 20 -1Q23 -2 25 1Q28 0 29 3Q27 6 24 5Q21 8 18 5Q14 7 10 3Z"/>` +
      `<path d="M-7 -12Q-5 -15 -2 -14Q1 -18 4 -15Q7 -16 9 -12Q6 -9 3 -10Q0 -7 -3 -10Q-6 -9 -7 -12Z"/>` +
      `</g>`;
  }

  if (festive) {
    svg += `<path d="M0 -105L3 -99L10 -98L5 -93L6 -86L0 -89L-6 -86L-5 -93L-10 -98L-3 -99Z" fill="${theme.glow}"/>`;
    svg += `<path d="M-14 -53Q0 -41 18 -45M-24 -29Q0 -16 29 -21" fill="none" stroke="${theme.glow}" stroke-width="2"/>`;
    for (const [x, y, color] of [[-9, -61, '#d64b4b'], [12, -38, '#eac35c'], [-20, -23, '#d64b4b'], [5, -16, '#eac35c']] as const) {
      svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
    }
  }
  return svg + '</g>';
}

export function deadTree(theme: Theme): string {
  return `<g data-decoration="dead-tree"><ellipse cy="2" rx="28" ry="8" fill="${theme.shadow}" opacity=".2"/>` +
    `<path d="M-5 0L-3 -34L-10 -63L-5 -87L0 -65L5 -42L7 0Z" fill="${theme.woodMid}"/>` +
    `<path d="M-1 -39L-25 -53L-32 -73M-24 -53L-40 -55M2 -51L23 -66L29 -88M23 -66L40 -70M-7 -64L-20 -77L-18 -89" fill="none" stroke="${theme.woodDark}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

export function tombstone(theme: Theme): string {
  return `<g data-decoration="tombstone"><ellipse cy="1" rx="10" ry="3" fill="${theme.shadow}" opacity=".25"/>` +
    `<path d="M-8 0V-16A8 8 0 0 1 8 -16V0Z" fill="${theme.stoneDark}"/>` +
    `<path d="M-9 -1V-17A7 7 0 0 1 5 -17V-1Z" fill="${theme.stoneLight}"/>` +
    `<path d="M-5 -14H1M-2 -17V-11M-5 -6H1" fill="none" stroke="${theme.stoneDark}" stroke-width="1.2"/></g>`;
}

export function candyCane(): string {
  // The repeated dash pattern follows the bend, rather than drawing stripes outside the cane.
  return `<g data-decoration="candy-cane"><path d="M-3 0V-22A6 6 0 0 1 9 -22V-18" fill="none" stroke="#fff8ef" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M-3 0V-22A6 6 0 0 1 9 -22V-18" fill="none" stroke="#cd444e" stroke-width="5" stroke-dasharray="3 5"/></g>`;
}

export function bat(index: number, theme: Theme): string {
  const color = theme.night ? '#9580aa' : '#3c3048';
  return `<g data-decoration="bat" class="drift drift-${index % 3} delay-${index % 5}">` +
    `<path d="M0 0Q-7 -10 -16 -7L-12 1Q-8 -3 -5 3L0 6L5 3Q8 -3 12 1L16 -7Q7 -10 0 0Z" fill="${color}"/>` +
    `<path d="M-3 0L-3 -6L0 -3L3 -6V0Z" fill="${color}"/><circle cx="-1.5" cy="0" r=".7" fill="#ffc16b"/><circle cx="1.5" cy="0" r=".7" fill="#ffc16b"/></g>`;
}

export function ghost(index: number): string {
  return `<g data-decoration="ghost" class="drift drift-${index % 3} delay-${index % 5}">` +
    `<path d="M-9 10V-3A9 10 0 0 1 9 -3V10L5 7L1 11L-3 7L-6 10Z" fill="#f3f2f7" opacity=".9"/>` +
    `<ellipse cx="-3" cy="-2" rx="1.4" ry="2" fill="#4a405b"/><ellipse cx="3" cy="-2" rx="1.4" ry="2" fill="#4a405b"/>` +
    `<ellipse cy="4" rx="1.6" ry="2" fill="#4a405b"/></g>`;
}
