import type { Palette } from './types.js';
import { num } from './util.js';

// Every species draws a flower head centred on (0, 0) with the given radius, so the
// same drawing works for garden tiles, bouquet stems and legend icons.

export interface Species {
  id: string;
  name: string;
  draw(radius: number, palette: Palette): string;
  /** Relative head size in the bouquet. */
  bouquetScale?: number;
  /** Small flowers read better as a little cluster in the bouquet. */
  cluster?: boolean;
}

const YELLOW = '#f4d27a';
const AMBER = '#e2a958';
const BROWN = '#8a5d3f';
const INK = '#3c3448';

type PetalShape = 'ellipse' | 'pointy' | 'round' | 'notch';

/** One petal pointing straight up from the centre. */
function petalPath(length: number, width: number, shape: PetalShape): string {
  const half = width / 2;

  switch (shape) {
    case 'ellipse':
      return `M0 0C${num(half * 1.3)} ${num(-length * 0.15)} ${num(half * 1.3)} ${num(-length * 0.95)} 0 ${num(-length)}` +
        `C${num(-half * 1.3)} ${num(-length * 0.95)} ${num(-half * 1.3)} ${num(-length * 0.15)} 0 0Z`;

    case 'pointy':
      return `M0 0C${num(half * 1.25)} ${num(-length * 0.3)} ${num(half * 0.75)} ${num(-length * 0.8)} 0 ${num(-length)}` +
        `C${num(-half * 0.75)} ${num(-length * 0.8)} ${num(-half * 1.25)} ${num(-length * 0.3)} 0 0Z`;

    case 'round':
      return `M0 0C${num(half * 1.5)} ${num(-length * 0.2)} ${num(half * 1.4)} ${num(-length)} 0 ${num(-length)}` +
        `C${num(-half * 1.4)} ${num(-length)} ${num(-half * 1.5)} ${num(-length * 0.2)} 0 0Z`;

    case 'notch':
      return `M0 0C${num(half * 1.4)} ${num(-length * 0.25)} ${num(half * 1.2)} ${num(-length)} ${num(half * 0.45)} ${num(-length)}` +
        `L0 ${num(-length * 0.86)}L${num(-half * 0.45)} ${num(-length)}` +
        `C${num(-half * 1.2)} ${num(-length)} ${num(-half * 1.4)} ${num(-length * 0.25)} 0 0Z`;
  }
}

/** A ring of identical petals around the centre. */
function ring(count: number, length: number, width: number, shape: PetalShape, fill: string, stroke?: string, rotation = 0): string {
  const path = petalPath(length, width, shape);
  const strokeWidth = Math.max(0.25, length * 0.045);
  const outline = stroke ? ` stroke="${stroke}" stroke-width="${num(strokeWidth)}" stroke-linejoin="round"` : '';

  let svg = `<g fill="${fill}"${outline}>`;

  for (let index = 0; index < count; index++) {
    svg += `<path d="${path}" transform="rotate(${num(rotation + (index * 360) / count)})"/>`;
  }

  return svg + '</g>';
}

function circle(radius: number, fill: string, centerX = 0, centerY = 0): string {
  const x = centerX ? ` cx="${num(centerX)}"` : '';
  const y = centerY ? ` cy="${num(centerY)}"` : '';

  return `<circle${x}${y} r="${num(radius)}" fill="${fill}"/>`;
}

/** Little dots in a circle, like seeds or stamens. */
function dots(count: number, distance: number, dotRadius: number, fill: string): string {
  let svg = '';

  for (let index = 0; index < count; index++) {
    const angle = ((index * 360) / count) * Math.PI / 180;
    svg += circle(dotRadius, fill, Math.cos(angle) * distance, Math.sin(angle) * distance);
  }

  return svg;
}

const hydrangea: Species = {
  id: 'hydrangea',
  name: 'hydrangea',
  bouquetScale: 1.15,
  draw(radius, palette) {
    let svg = circle(radius * 0.9, palette.petalShade);

    // Lots of little florets in two rings plus one in the middle.
    const floretRadius = radius * 0.27;
    const spots: [number, number][] = [];

    for (let index = 0; index < 9; index++) {
      const angle = (index / 9) * 6.283 + 0.3;
      spots.push([Math.cos(angle) * radius * 0.66, Math.sin(angle) * radius * 0.66]);
    }

    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * 6.283 + 0.8;
      spots.push([Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3]);
    }

    spots.push([0, 0]);

    const tones = [palette.petal, palette.petalLight, palette.petal, palette.petalShade];

    spots.forEach(([x, y], index) => {
      const color = tones[index % tones.length];

      // Tiny heads just get dots; bigger ones get four-petal florets.
      if (radius < 9) {
        svg += circle(floretRadius * 1.15, color, x, y);
      } else {
        const floret = ring(4, floretRadius * 1.1, floretRadius, 'round', color, palette.petalShade) + circle(floretRadius * 0.18, palette.petalLight);
        svg += `<g transform="translate(${num(x)} ${num(y)}) rotate(${(index * 23) % 90})">${floret}</g>`;
      }
    });

    return svg;
  },
};

const sunflower: Species = {
  id: 'sunflower',
  name: 'sunflower',
  bouquetScale: 1.08,
  draw(radius, palette) {
    const seeds = radius > 8 ? dots(10, radius * 0.37, radius * 0.035, '#b8865c') : '';

    return ring(16, radius, radius * 0.34, 'pointy', palette.petalShade, undefined, 11.25) +
      ring(16, radius * 0.92, radius * 0.3, 'pointy', palette.petal) +
      circle(radius * 0.44, BROWN) +
      circle(radius * 0.3, '#6e4a33') +
      seeds;
  },
};

const iris: Species = {
  id: 'iris',
  name: 'iris',
  draw(radius, palette) {
    let beard = '';

    for (const angle of [60, 180, 300]) {
      beard += `<ellipse cy="${num(-radius * 0.42)}" rx="${num(radius * 0.07)}" ry="${num(radius * 0.2)}" fill="${YELLOW}" transform="rotate(${angle})"/>`;
    }

    return ring(3, radius, radius * 0.9, 'round', palette.petalShade, palette.petalShade, 60) +
      beard +
      ring(3, radius * 0.82, radius * 0.58, 'round', palette.petal, palette.petalShade) +
      circle(radius * 0.12, palette.petalLight);
  },
};

const rose: Species = {
  id: 'rose',
  name: 'rose',
  draw(radius, palette) {
    const strokeWidth = num(Math.max(0.3, radius * 0.07));
    const swirl = (path: string) => `<path d="${path}" fill="none" stroke="${palette.petalShade}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;

    return ring(5, radius, radius * 1.05, 'round', palette.petalShade, palette.petalShade) +
      circle(radius * 0.72, palette.petal) +
      swirl(`M${num(-radius * 0.55)} ${num(radius * 0.1)}A${num(radius * 0.52)} ${num(radius * 0.52)} 0 0 1 ${num(radius * 0.48)} ${num(-radius * 0.22)}`) +
      swirl(`M${num(radius * 0.4)} ${num(radius * 0.32)}A${num(radius * 0.38)} ${num(radius * 0.38)} 0 0 1 ${num(-radius * 0.32)} ${num(-radius * 0.22)}`) +
      swirl(`M${num(-radius * 0.16)} ${num(radius * 0.12)}A${num(radius * 0.17)} ${num(radius * 0.17)} 0 1 1 ${num(radius * 0.14)} 0`) +
      circle(radius * 0.1, palette.petalLight);
  },
};

const forgetmenot: Species = {
  id: 'forgetmenot',
  name: 'forget-me-not',
  cluster: true,
  draw(radius, palette) {
    return ring(5, radius * 0.95, radius * 0.85, 'round', palette.petal, palette.petalShade) +
      circle(radius * 0.27, '#fff6d8') +
      circle(radius * 0.14, AMBER);
  },
};

const tulip: Species = {
  id: 'tulip',
  name: 'tulip',
  draw(radius, palette) {
    const scaled = (factor: number) => num(radius * factor);

    const backPetals = `M${scaled(-0.62)} ${scaled(0.35)}C${scaled(-0.82)} ${scaled(-0.3)} ${scaled(-0.6)} ${scaled(-0.86)} ${scaled(-0.34)} ${scaled(-0.96)}` +
      `L0 ${scaled(-0.5)}L${scaled(0.34)} ${scaled(-0.96)}C${scaled(0.6)} ${scaled(-0.86)} ${scaled(0.82)} ${scaled(-0.3)} ${scaled(0.62)} ${scaled(0.35)}` +
      `C${scaled(0.4)} ${scaled(0.64)} ${scaled(-0.4)} ${scaled(0.64)} ${scaled(-0.62)} ${scaled(0.35)}Z`;
    const frontPetal = `M${scaled(-0.48)} ${scaled(0.42)}C${scaled(-0.66)} ${scaled(-0.2)} ${scaled(-0.34)} ${scaled(-0.86)} 0 ${scaled(-1)}` +
      `C${scaled(0.34)} ${scaled(-0.86)} ${scaled(0.66)} ${scaled(-0.2)} ${scaled(0.48)} ${scaled(0.42)}` +
      `C${scaled(0.28)} ${scaled(0.62)} ${scaled(-0.28)} ${scaled(0.62)} ${scaled(-0.48)} ${scaled(0.42)}Z`;
    const strokeWidth = num(Math.max(0.3, radius * 0.05));

    return `<path d="${backPetals}" fill="${palette.petalShade}"/>` +
      `<path d="${frontPetal}" fill="${palette.petal}" stroke="${palette.petalShade}" stroke-width="${strokeWidth}"/>` +
      `<path d="M${scaled(-0.18)} ${scaled(0.2)}Q${scaled(-0.2)} ${scaled(-0.4)} 0 ${scaled(-0.75)}" fill="none" stroke="${palette.petalLight}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
  },
};

const cosmos: Species = {
  id: 'cosmos',
  name: 'cosmos',
  draw(radius, palette) {
    return ring(8, radius, radius * 0.6, 'notch', palette.petal, palette.petalShade) +
      circle(radius * 0.21, YELLOW) +
      circle(radius * 0.1, AMBER);
  },
};

const poppy: Species = {
  id: 'poppy',
  name: 'poppy',
  draw(radius, palette) {
    const seeds = radius > 5 ? dots(8, radius * 0.36, radius * 0.05, INK) : '';

    return ring(4, radius, radius * 1.25, 'round', palette.petalShade, palette.petalShade, 45) +
      ring(4, radius * 0.9, radius * 1.15, 'round', palette.petal, palette.petalShade) +
      circle(radius * 0.25, INK) +
      seeds +
      circle(radius * 0.08, palette.petalLight);
  },
};

const wildflower: Species = {
  id: 'wildflower',
  name: 'wildflower',
  draw(radius, palette) {
    return ring(6, radius * 0.92, radius * 0.62, 'round', palette.petal, palette.petalShade) +
      circle(radius * 0.22, YELLOW);
  },
};

const daisy: Species = {
  id: 'daisy',
  name: 'daisy',
  draw(radius, palette) {
    return ring(14, radius * 0.95, radius * 0.22, 'ellipse', palette.petalShade, undefined, 12.8) +
      ring(14, radius * 0.9, radius * 0.2, 'ellipse', palette.petal) +
      circle(radius * 0.3, '#f2c14e') +
      circle(radius * 0.18, AMBER);
  },
};

const lavender: Species = {
  id: 'lavender',
  name: 'lavender',
  draw(radius, palette) {
    let svg = `<path d="M0 ${num(radius * 0.7)}L0 ${num(-radius)}" stroke="${palette.stem}" stroke-width="${num(Math.max(0.4, radius * 0.07))}"/>`;

    // Pairs of buds up the spike, getting a little smaller towards the top.
    for (let level = 0; level < 6; level++) {
      const y = radius * 0.55 - level * radius * 0.3;
      const shrink = 1 - level * 0.08;
      const color = level % 2 ? palette.petal : palette.petalShade;
      const offset = radius * 0.17 * shrink;
      const budWidth = num(radius * 0.16 * shrink);
      const budHeight = num(radius * 0.23 * shrink);

      svg += `<ellipse cx="${num(-offset)}" cy="${num(y)}" rx="${budWidth}" ry="${budHeight}" fill="${color}" transform="rotate(-22 ${num(-offset)} ${num(y)})"/>`;
      svg += `<ellipse cx="${num(offset)}" cy="${num(y)}" rx="${budWidth}" ry="${budHeight}" fill="${color}" transform="rotate(22 ${num(offset)} ${num(y)})"/>`;
    }

    return svg + `<ellipse cy="${num(-radius * 1.1)}" rx="${num(radius * 0.12)}" ry="${num(radius * 0.2)}" fill="${palette.petalLight}"/>`;
  },
};

const peony: Species = {
  id: 'peony',
  name: 'peony',
  bouquetScale: 1.1,
  draw(radius, palette) {
    return ring(8, radius, radius * 0.9, 'round', palette.petalShade, palette.petalShade) +
      ring(7, radius * 0.76, radius * 0.85, 'round', palette.petal, palette.petalShade, 20) +
      ring(6, radius * 0.5, radius * 0.75, 'round', palette.petalLight, palette.petalShade, 8) +
      circle(radius * 0.16, palette.petal);
  },
};

const lily: Species = {
  id: 'lily',
  name: 'lily',
  draw(radius, palette) {
    let stamens = '';

    for (let index = 0; index < 6; index++) {
      const angle = ((index * 60 + 30) * Math.PI) / 180;
      const x = Math.cos(angle) * radius * 0.48;
      const y = Math.sin(angle) * radius * 0.48;

      stamens += `<path d="M0 0L${num(x)} ${num(y)}" stroke="${palette.petalLight}" stroke-width="${num(Math.max(0.25, radius * 0.04))}"/>`;
      stamens += circle(radius * 0.06, '#c9805a', x, y);
    }

    return ring(6, radius, radius * 0.42, 'pointy', palette.petal, palette.petalShade) +
      ring(6, radius * 0.6, radius * 0.12, 'pointy', palette.petalShade) +
      stamens;
  },
};

const bluebell: Species = {
  id: 'bluebell',
  name: 'bluebell',
  draw(radius, palette) {
    const bell = (x: number, y: number, size: number) => {
      const hanger = `<path d="M${num(x)} ${num(y - size * 1.2)}L${num(x)} ${num(y - size * 0.9)}" stroke="${palette.stem}" stroke-width="${num(Math.max(0.3, radius * 0.05))}"/>`;
      const cup = `M${num(x - size)} ${num(y)}C${num(x - size)} ${num(y - size * 1.25)} ${num(x + size)} ${num(y - size * 1.25)} ${num(x + size)} ${num(y)}` +
        `L${num(x + size * 1.15)} ${num(y + size * 0.35)}L${num(x + size * 0.4)} ${num(y + size * 0.15)}L${num(x)} ${num(y + size * 0.4)}` +
        `L${num(x - size * 0.4)} ${num(y + size * 0.15)}L${num(x - size * 1.15)} ${num(y + size * 0.35)}Z`;

      return hanger + `<path d="${cup}" fill="${palette.petal}" stroke="${palette.petalShade}" stroke-width="${num(Math.max(0.25, size * 0.08))}"/>`;
    };
    const arch = `<path d="M0 ${num(radius * 0.5)}Q${num(-radius * 0.1)} ${num(-radius * 0.95)} ${num(radius * 0.7)} ${num(-radius * 0.7)}" fill="none" stroke="${palette.stem}" stroke-width="${num(Math.max(0.4, radius * 0.07))}"/>`;

    return arch +
      bell(-radius * 0.05, radius * 0.05, radius * 0.32) +
      bell(radius * 0.2, -radius * 0.45, radius * 0.28) +
      bell(radius * 0.66, -radius * 0.3, radius * 0.24);
  },
};

const dahlia: Species = {
  id: 'dahlia',
  name: 'dahlia',
  draw(radius, palette) {
    return ring(12, radius, radius * 0.32, 'pointy', palette.petalShade, undefined, 15) +
      ring(12, radius * 0.76, radius * 0.3, 'pointy', palette.petal) +
      ring(10, radius * 0.48, radius * 0.26, 'pointy', palette.petalLight, undefined, 18) +
      circle(radius * 0.13, YELLOW);
  },
};

const camellia: Species = {
  id: 'camellia',
  name: 'camellia',
  draw(radius, palette) {
    const stamens = radius > 6 ? dots(7, radius * 0.15, radius * 0.04, AMBER) : '';

    return ring(7, radius, radius * 0.95, 'round', palette.petal, palette.petalShade) +
      ring(5, radius * 0.58, radius * 0.8, 'round', palette.petalLight, palette.petalShade, 36) +
      circle(radius * 0.2, YELLOW) +
      stamens;
  },
};

const anemone: Species = {
  id: 'anemone',
  name: 'anemone',
  draw(radius, palette) {
    const stamens = radius > 5 ? dots(12, radius * 0.36, radius * 0.045, INK) : '';

    return ring(6, radius, radius * 0.95, 'round', palette.petal, palette.petalShade) +
      stamens +
      circle(radius * 0.26, INK) +
      circle(radius * 0.08, palette.petalLight);
  },
};

const marigold: Species = {
  id: 'marigold',
  name: 'marigold',
  draw(radius, palette) {
    return ring(10, radius, radius * 0.55, 'notch', palette.petalShade, palette.petalShade) +
      ring(10, radius * 0.75, radius * 0.5, 'notch', palette.petal, palette.petalShade, 18) +
      ring(8, radius * 0.48, radius * 0.45, 'notch', palette.petalLight, palette.petalShade) +
      circle(radius * 0.12, palette.petalShade);
  },
};

const ALL_SPECIES = [
  hydrangea, sunflower, iris, rose, forgetmenot, tulip, cosmos, poppy, wildflower,
  daisy, lavender, peony, lily, bluebell, dahlia, camellia, anemone, marigold,
];

export const SPECIES: Record<string, Species> = Object.fromEntries(ALL_SPECIES.map((species) => [species.id, species]));

/** A closed bud for the middle growth level. */
export function bud(palette: Palette): string {
  return `<path d="M0 1C-2.4 -1 -2.2 -4.6 0 -6.4C2.2 -4.6 2.4 -1 0 1Z" fill="${palette.petal}" stroke="${palette.petalShade}" stroke-width=".4"/>` +
    `<path d="M0 1.3C-2 .5 -2.6 -1.8 -1.6 -2.6L0 -.6L1.6 -2.6C2.6 -1.8 2 .5 0 1.3Z" fill="${palette.leaf}"/>`;
}

/** A flower head for the bouquet. Small species become a little cluster of three. */
export function bouquetHead(species: Species, radius: number, palette: Palette): string {
  if (!species.cluster) {
    return species.draw(radius, palette);
  }

  const cluster = [[-0.45, 0.28, 0.6], [0.45, 0.2, 0.56], [0, -0.36, 0.66]] as const;

  return cluster
    .map(([x, y, size]) => `<g transform="translate(${num(x * radius)} ${num(y * radius)})">${species.draw(radius * size, palette)}</g>`)
    .join('');
}
