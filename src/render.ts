import type { GardenConfig, GardenMode, GardenTheme, Palette, Theme } from './types.js';
import type { Group, Model } from './model.js';
import { bouquetHead, bud } from './flowers.js';
import { pastel } from './color.js';
import { escapeXml, formatDate, formatNumber, num, seededRandom } from './util.js';
import { pickTheme, seasonalPalette } from './themes.js';
import { bat, candyCane, deadTree, ghost, pine, tombstone } from './seasonal-art.js';

const WIDTH = 1000;
const HEIGHT = 560;
const FONT = `ui-rounded,'SF Pro Rounded','Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,Nunito,'Varela Round',Helvetica,Arial,sans-serif`;

// The garden is drawn in isometric view. Positions on the island use three numbers:
//   along  - left to right along the island, one unit per week
//   across - from the back edge to the front edge
//   height - straight up
//
// Back strip (across 0-2.5): fence, tree, bench.
// Rows Sun-Wed (across 3-6), cobblestone path (across 7.5), rows Thu-Sat (across 9-11).
// Front strip (across 12.3): lanterns.
// Left margin (along 0-4): tree and path entrance. Right margin: the cottage.
const ISLAND_LENGTH = 63;
const ISLAND_DEPTH = 13;
const TILE_HALF_WIDTH = 10;
const TILE_HALF_HEIGHT = 5;
const ORIGIN_X = 150;
const ORIGIN_Y = 118;
const SOIL_DEPTH = 30;
const FIRST_GARDEN_COLUMN = 4;
const GARDEN_WEEKS = 53;
const PATH_ACROSS = 7.5;
const COTTAGE = { left: 57.6, right: 62.4, back: 1, front: 5.2, wallHeight: 30 };

type Point = readonly [x: number, y: number];

/** Island position to screen position. */
function toScreen(along: number, across: number, height = 0): Point {
  return [
    ORIGIN_X + (along - across) * TILE_HALF_WIDTH,
    ORIGIN_Y + (along + across) * TILE_HALF_HEIGHT - height,
  ];
}

/** Same as toScreen, but relative to (0, 0), for shapes reused with <use>. */
function toScreenRelative(along: number, across: number, height = 0): Point {
  return [(along - across) * TILE_HALF_WIDTH, (along + across) * TILE_HALF_HEIGHT - height];
}

function pointText([x, y]: Point): string {
  return `${num(x)} ${num(y)}`;
}

/** Island position as "x y" text for SVG paths. */
function point(along: number, across: number, height = 0): string {
  return pointText(toScreen(along, across, height));
}

function polygon(points: string[], fill: string, extra = ''): string {
  return `<path d="M${points.join('L')}Z" fill="${fill}"${extra}/>`;
}

function strokePath(path: string, color: string, width: number, extra = ''): string {
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

/**
 * A box in three tones: top (lit), left face (mid) and right face (shadow).
 * Light comes from the top left, so the right faces are always darkest.
 */
function isoBox(
  along: number, across: number, length: number, depth: number, base: number, height: number,
  top: string, left: string, right: string, relative = false,
): string {
  const project = relative ? toScreenRelative : toScreen;
  const at = (a: number, c: number, h: number) => pointText(project(a, c, h));

  const end = along + length;
  const front = across + depth;
  const roof = base + height;

  const leftFace = polygon([at(along, front, roof), at(end, front, roof), at(end, front, base), at(along, front, base)], left);
  const rightFace = polygon([at(end, across, roof), at(end, front, roof), at(end, front, base), at(end, across, base)], right);
  const topFace = polygon([at(along, across, roof), at(end, across, roof), at(end, front, roof), at(along, front, roof)], top);

  return leftFace + rightFace + topFace;
}

/** Where a day's tile sits on the island. */
function tilePosition(week: number, weekday: number, weekCount: number) {
  const along = FIRST_GARDEN_COLUMN + (week + 0.5) * (GARDEN_WEEKS / weekCount);
  const across = weekday < 4 ? 3 + weekday : 9 + (weekday - 4);

  return { along, across };
}

// The animations are plain CSS inside the SVG. GitHub keeps CSS in README images,
// and the last rule turns everything off for people who have reduced motion on.
function styles(theme: Theme): string {
  return `
text { font-family: ${FONT}; }

.title { fill: ${theme.text}; }
.muted { fill: ${theme.textMuted}; }
.ink { fill: ${theme.ink}; }
.ink-muted { fill: ${theme.inkMuted}; }
.sign-text { fill: ${theme.signText}; }
.sign-muted { fill: ${theme.signMuted}; }
.bold { font-weight: 700; }
.italic { font-style: italic; }

/* Plants and bouquet flowers rocking in the breeze */
.sway, .bouquet-sway {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sway 6s ease-in-out infinite alternate;
}

.bouquet-sway { transform-origin: 50% 50%; animation-duration: 8s; }

.sway-1 { animation-duration: 5.2s; animation-delay: -1.3s; }
.sway-2 { animation-duration: 6.8s; animation-delay: -2.1s; }
.sway-3 { animation-duration: 5.6s; animation-delay: -3.4s; }
.sway-4 { animation-duration: 7.4s; animation-delay: -0.7s; }
.sway-5 { animation-duration: 6.2s; animation-delay: -4.2s; }

@keyframes sway {
  from { transform: rotate(-3deg); }
  to { transform: rotate(3deg); }
}

/* Cherry petals drifting down, each on one of three paths */
.falling-petal {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  opacity: 0;
  animation: petal-fall-0 13s linear infinite;
}

.petal-path-1 { animation-name: petal-fall-1; animation-duration: 16s; }
.petal-path-2 { animation-name: petal-fall-2; animation-duration: 11s; }

@keyframes petal-fall-0 {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); }
  10%, 85% { opacity: 0.95; }
  100% { opacity: 0; transform: translate(-70px, 330px) rotate(540deg); }
}

@keyframes petal-fall-1 {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); }
  10%, 85% { opacity: 0.9; }
  50% { transform: translate(30px, 160px) rotate(200deg); }
  100% { opacity: 0; transform: translate(-20px, 340px) rotate(420deg); }
}

@keyframes petal-fall-2 {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); }
  10%, 85% { opacity: 0.85; }
  100% { opacity: 0; transform: translate(50px, 300px) rotate(-480deg); }
}

/* Butterflies wandering around and flapping */
.drift { animation: drift-0 17s ease-in-out infinite; }
.drift-1 { animation-name: drift-1; animation-duration: 21s; }
.drift-2 { animation-name: drift-2; animation-duration: 14s; }

@keyframes drift-0 {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(18px, -10px); }
  50% { transform: translate(34px, 2px); }
  75% { transform: translate(14px, 9px); }
}

@keyframes drift-1 {
  0%, 100% { transform: translate(0, 0); }
  30% { transform: translate(-22px, -6px); }
  60% { transform: translate(-8px, -16px); }
  80% { transform: translate(6px, -6px); }
}

@keyframes drift-2 {
  0%, 100% { transform: translate(0, 0); }
  35% { transform: translate(12px, 12px); }
  70% { transform: translate(-14px, 4px); }
}

.left-wing, .right-wing {
  transform-box: fill-box;
  transform-origin: 100% 50%;
  animation: flap 0.4s ease-in-out infinite alternate;
}

.right-wing { transform-origin: 0 50%; }

@keyframes flap {
  to { transform: scaleX(0.35); }
}

/* Bees buzzing about */
.buzz { animation: buzz 3s ease-in-out infinite; }
.bee-wing { animation: twinkle 0.12s linear infinite alternate; }

@keyframes buzz {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(3px, -2px); }
  40% { transform: translate(6px, 1px); }
  60% { transform: translate(2px, 3px); }
  80% { transform: translate(-2px, -1px); }
}

/* Evening lights: fireflies, lanterns and windows */
.firefly { animation: twinkle 2.4s ease-in-out infinite alternate, drift-2 12s ease-in-out infinite; }
.flicker { animation: flicker 4s ease-in-out infinite; }

@keyframes twinkle {
  from { opacity: 0.2; }
  to { opacity: 1; }
}

@keyframes flicker {
  0%, 100% { opacity: 0.9; }
  20% { opacity: 0.75; }
  24% { opacity: 0.95; }
  50% { opacity: 0.82; }
  70% { opacity: 1; }
  74% { opacity: 0.86; }
}

/* Chimney smoke, three puffs taking turns */
.smoke {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  opacity: 0;
  animation: smoke-rise 6s ease-out infinite;
}

.smoke-1 { animation-delay: -2s; }
.smoke-2 { animation-delay: -4s; }

@keyframes smoke-rise {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  15% { opacity: 0.75; }
  100% { opacity: 0; transform: translate(9px, -28px) scale(1.7); }
}

/* Start times, so things don't all move together */
.delay-1 { animation-delay: -0.8s; }
.delay-2 { animation-delay: -1.7s; }
.delay-3 { animation-delay: -2.6s; }
.delay-4 { animation-delay: -3.9s; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  .falling-petal { opacity: 0; }
  .smoke-0 { opacity: 0.5; }
}
`;
}

// Plants

/** A bushy three-tone mound with its base at (0, 0). */
function mound(size: number, theme: Theme): string {
  const blobs: [x: number, y: number, radius: number][] = [
    [-0.55, -0.55, 0.62],
    [0.55, -0.5, 0.6],
    [0, -0.95, 0.72],
    [-0.2, -0.32, 0.6],
    [0.32, -0.3, 0.56],
  ];

  let shadow = '';
  let body = '';

  for (const [x, y, radius] of blobs) {
    shadow += `<circle cx="${num(x * size + 0.6)}" cy="${num(y * size + 0.5)}" r="${num(radius * size)}"/>`;
    body += `<circle cx="${num(x * size)}" cy="${num(y * size)}" r="${num(radius * size * 0.9)}"/>`;
  }

  const highlight = `<circle cx="${num(-0.5 * size)}" cy="${num(-0.85 * size)}" r="${num(0.36 * size)}"/>` +
    `<circle cx="${num(-0.1 * size)}" cy="${num(-1.25 * size)}" r="${num(0.3 * size)}"/>`;

  return `<g fill="${theme.bushDark}">${shadow}</g><g fill="${theme.bushMid}">${body}</g><g fill="${theme.bushLight}">${highlight}</g>`;
}

/** A plant at growth level 2 (bud), 3 (flowers) or 4 (full bloom). */
function plant(level: number, group: Group, palette: Palette, theme: Theme): string {
  // Tiny heads reuse one shared drawing (#flower-head-key, radius 3) to keep the file small.
  const head = (x: number, y: number, radius: number) =>
    `<use href="#flower-head-${group.key}" transform="translate(${num(x)} ${num(y)}) scale(${num(radius / 3)})"/>`;

  if (level === 2) {
    const size = 3.6;

    return mound(size, theme) + `<g transform="translate(.6 ${num(-size * 1.45)}) scale(.75)">${bud(palette)}</g>`;
  }

  if (level === 3) {
    const size = 5;

    return mound(size, theme) +
      head(-size * 0.5, -size * 1.1, 2.4) +
      head(size * 0.55, -size * 1.0, 2.3) +
      head(0, -size * 1.6, 2.6);
  }

  const size = 6.2;

  return mound(size, theme) +
    head(-size * 0.62, -size * 0.95, 2.7) +
    head(size * 0.62, -size * 0.9, 2.6) +
    head(-size * 0.2, -size * 0.45, 2.3) +
    head(size * 0.3, -size * 1.55, 2.8) +
    head(-size * 0.32, -size * 1.7, 3.3);
}

// Shared definitions: gradients, filters and every shape that repeats.

function defs(model: Model, palettes: Map<string, Palette>, theme: Theme, selection: GardenTheme): string {
  const glow = theme.glow;
  let svg = '';

  svg += `<linearGradient id="background" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.bgTop}"/><stop offset="1" stop-color="${theme.bgBottom}"/></linearGradient>`;
  svg += `<radialGradient id="background-glow" cx=".42" cy=".55" r=".6"><stop offset="0" stop-color="${theme.bgGlow}" stop-opacity=".9"/><stop offset="1" stop-color="${theme.bgGlow}" stop-opacity="0"/></radialGradient>`;
  svg += `<linearGradient id="grass-top" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${theme.grassLight}"/><stop offset="1" stop-color="${theme.grassMid}"/></linearGradient>`;
  svg += `<radialGradient id="lamp-glow"><stop offset="0" stop-color="${glow}" stop-opacity=".75"/><stop offset=".4" stop-color="${glow}" stop-opacity=".28"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
  svg += `<radialGradient id="firefly-glow"><stop offset="0" stop-color="#fff3b8" stop-opacity=".95"/><stop offset=".35" stop-color="${glow}" stop-opacity=".35"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
  svg += `<filter id="blur" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`;

  // Each language's flower head, and its plant at each growth level.
  for (const group of model.groups) {
    const palette = palettes.get(group.key)!;

    svg += `<g id="flower-head-${group.key}">${group.species.draw(3, palette)}</g>`;

    for (const level of [2, 3, 4]) {
      svg += `<g id="plant-${group.key}-${level}">${plant(level, group, palette, theme)}</g>`;
    }
  }

  // Contact shadow and the faint checker tile.
  svg += `<ellipse id="contact-shadow" cx="1.5" cy=".8" rx="7.5" ry="3.3" fill="${theme.shadow}" opacity=".22"/>`;
  svg += `<path id="checker-tile" d="M0 -5L10 0L0 5L-10 0Z" fill="${theme.grassLight}" opacity=".35"/>`;

  // Empty tiles: grass tuft, pebble, clover.
  svg += `<g id="grass-tuft">${strokePath('M-2.5 0l-1 -3.2M0 0V-4M2.5 0l1 -3.2', theme.grassDark, 0.9)}</g>`;
  svg += `<g id="pebble"><ellipse cx="1" cy=".6" rx="3.2" ry="1.4" fill="${theme.shadow}" opacity=".2"/>` +
    `<ellipse cy=".2" rx="2.6" ry="1.6" fill="${theme.stoneDark}"/><ellipse cy="-.4" rx="2.4" ry="1.4" fill="${theme.stoneMid}"/>` +
    `<ellipse cx="-.7" cy="-.9" rx="1" ry=".5" fill="${theme.stoneLight}"/></g>`;
  svg += `<g id="clover"><circle cx="-1.3" cy="-1" r="1.4" fill="${theme.bushMid}"/><circle cx="1.3" cy="-1" r="1.4" fill="${theme.bushDark}"/>` +
    `<circle cy="-2.3" r="1.4" fill="${theme.bushLight}"/></g>`;

  // Sprout.
  svg += `<g id="sprout"><ellipse cy=".4" rx="3" ry="1.3" fill="${theme.soilMid}" opacity=".6"/>${strokePath('M0 0V-4', theme.bushDark, 0.9)}` +
    `<path d="M0 -3.6C-1 -6 -4 -5.6 -4.2 -4.2C-3 -3.2 -1.2 -3 0 -3.6Z" fill="${theme.bushMid}"/>` +
    `<path d="M0 -3.8C1 -6.4 4 -6 4.4 -4.6C3.2 -3.4 1.2 -3.2 0 -3.8Z" fill="${theme.bushLight}"/></g>`;

  // Planter box for full blooms.
  const plankLine = `M${pointText(toScreenRelative(-0.42, 0.42, 2.5))}L${pointText(toScreenRelative(0.42, 0.42, 2.5))}L${pointText(toScreenRelative(0.42, -0.42, 2.5))}`;
  const rimLine = `M${pointText(toScreenRelative(-0.42, 0.42, 5))}L${pointText(toScreenRelative(0.42, 0.42, 5))}L${pointText(toScreenRelative(0.42, -0.42, 5))}`;

  svg += `<g id="planter-box">${isoBox(-0.42, -0.42, 0.84, 0.84, 0, 5, theme.soilDark, theme.woodMid, theme.woodDark, true)}` +
    strokePath(plankLine, theme.woodDark, 0.6, ' opacity=".7"') +
    strokePath(rimLine, theme.woodLight, 0.7) + `</g>`;

  // Fence pickets: one for the back-right fence, one for the back-left fence.
  svg += `<g id="fence-picket-back"><path d="M3.2 1.6L4.4 1L4.4 -12L3.2 -11.4Z" fill="${theme.woodDark}"/>` +
    `<path d="M0 0L3.2 1.6L3.2 -11.4L1.6 -14.6L0 -13Z" fill="${theme.woodMid}"/>` +
    `<path d="M0 -13L1.6 -14.6L1.6 -12.6L0 -11.4Z" fill="${theme.woodLight}"/></g>`;
  svg += `<g id="fence-picket-side"><path d="M-3.2 1.6L-4.4 1L-4.4 -12L-3.2 -11.4Z" fill="${theme.woodMid}"/>` +
    `<path d="M0 0L-3.2 1.6L-3.2 -11.4L-1.6 -14.6L0 -13Z" fill="${theme.woodDark}"/></g>`;

  // The same shared shape covers both fallen and drifting foliage.
  svg += selection === 'fall'
    ? `<path id="petal" data-decoration="autumn-leaf" d="M0 -3L1 -1L3 -2L2 0L4 1L1 2L0 4L-1 2L-4 1L-2 0L-3 -2L-1 -1Z"/>`
    : `<path id="petal" d="M0 0C1.4 -1.8 4 -1.4 3.6 .6C3.1 2.4 .9 2.1 0 0Z"/>`;

  return `<defs>${svg}</defs>`;
}

// Island block

function island(theme: Theme): string {
  const random = seededRandom(5);
  const topCorners = [point(0, 0), point(ISLAND_LENGTH, 0), point(ISLAND_LENGTH, ISLAND_DEPTH), point(0, ISLAND_DEPTH)];

  // Soft shadow under the whole island.
  const shadowOpacity = theme.night ? 0.6 : 0.28;
  let svg = `<path d="M${topCorners.join('L')}Z" fill="${theme.shadow}" opacity="${shadowOpacity}" filter="url(#blur)" transform="translate(0 ${SOIL_DEPTH + 18})"/>`;

  // The two soil sides.
  svg += polygon([point(0, ISLAND_DEPTH), point(ISLAND_LENGTH, ISLAND_DEPTH), point(ISLAND_LENGTH, ISLAND_DEPTH, -SOIL_DEPTH), point(0, ISLAND_DEPTH, -SOIL_DEPTH)], theme.soilLight);
  svg += polygon([point(ISLAND_LENGTH, 0), point(ISLAND_LENGTH, ISLAND_DEPTH), point(ISLAND_LENGTH, ISLAND_DEPTH, -SOIL_DEPTH), point(ISLAND_LENGTH, 0, -SOIL_DEPTH)], theme.soilDark);

  // Wavy soil layers.
  for (const depth of [-13, -22]) {
    let frontLayer = `M${point(0, ISLAND_DEPTH, depth)}`;

    for (let along = 3; along <= ISLAND_LENGTH; along += 3) {
      frontLayer += `L${point(along, ISLAND_DEPTH, depth + (random() - 0.5) * 3)}`;
    }

    svg += strokePath(frontLayer, theme.soilMid, 1.4, ' opacity=".8"');

    let sideLayer = `M${point(ISLAND_LENGTH, 0, depth)}`;

    for (let across = 1.5; across <= ISLAND_DEPTH; across += 1.5) {
      sideLayer += `L${point(ISLAND_LENGTH, across, depth + (random() - 0.5) * 3)}`;
    }

    svg += `<path d="${sideLayer}" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".9" stroke="${theme.soilMid}"/>`;
  }

  // Pebbles stuck in the soil.
  for (let index = 0; index < 34; index++) {
    const onFront = index < 28;
    const [x, y] = onFront
      ? toScreen(random() * ISLAND_LENGTH, ISLAND_DEPTH, -6 - random() * 22)
      : toScreen(ISLAND_LENGTH, random() * ISLAND_DEPTH, -6 - random() * 22);
    const width = 1.6 + random() * 1.8;

    svg += `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(width)}" ry="${num(width * 0.6)}" fill="${onFront ? theme.stoneMid : theme.stoneDark}" opacity=".8"/>`;
  }

  // Grass hanging over the top edges.
  let frontLip = `M${point(0, ISLAND_DEPTH)}`;

  for (let along = 0; along <= ISLAND_LENGTH; along += 1.5) {
    const droop = Math.floor(along / 1.5) % 2 ? 3.5 : 1;
    frontLip += `L${point(along, ISLAND_DEPTH, -3 - droop - random() * 1.5)}`;
  }

  svg += `<path d="${frontLip}L${point(ISLAND_LENGTH, ISLAND_DEPTH)}Z" fill="${theme.grassDark}"/>`;

  let sideLip = `M${point(ISLAND_LENGTH, 0)}`;

  for (let across = 0; across <= ISLAND_DEPTH; across += 1.3) {
    const droop = Math.floor(across / 1.3) % 2 ? 3.5 : 1;
    sideLip += `L${point(ISLAND_LENGTH, across, -3 - droop - random() * 1.5)}`;
  }

  svg += `<path d="${sideLip}L${point(ISLAND_LENGTH, ISLAND_DEPTH)}Z" fill="${theme.bushDark}"/>`;

  // The grass on top, with a highlight along the back edges.
  svg += polygon(topCorners, 'url(#grass-top)');
  svg += strokePath(`M${point(0, ISLAND_DEPTH)}L${point(0, 0)}L${point(ISLAND_LENGTH, 0)}`, theme.grassLight, 1.5, ' opacity=".8"');

  return svg;
}

function groundDetails(model: Model, theme: Theme, hasTree: boolean): string {
  let svg = '';

  // A faint checker so the calendar reads as garden tiles.
  for (const plot of model.plots) {
    if ((plot.week + plot.weekday) % 2) {
      continue;
    }

    const tile = tilePosition(plot.week, plot.weekday, model.weekCount);
    const [x, y] = toScreen(tile.along, tile.across);

    svg += `<use href="#checker-tile" x="${num(x)}" y="${num(y)}"/>`;
  }

  // Grass tufts along the back and front strips.
  const random = seededRandom(17);

  for (let index = 0; index < 70; index++) {
    const along = random() * ISLAND_LENGTH;
    const across = random() < 0.5 ? random() * 2.4 : 11.8 + random() * 1.1;
    const [x, y] = toScreen(along, across);

    svg += `<use href="#grass-tuft" x="${num(x)}" y="${num(y)}"/>`;
  }

  // Fallen petals under the cherry tree.
  if (hasTree) {
    for (let index = 0; index < 38; index++) {
      const [x, y] = toScreen(random() * 14, random() * ISLAND_DEPTH);
      const rotation = Math.floor(random() * 360);
      const color = random() < 0.5 ? theme.blossomMid : theme.blossomLight;

      svg += `<use href="#petal" transform="translate(${num(x)} ${num(y)}) rotate(${rotation}) scale(.8)" fill="${color}"/>`;
    }
  }

  return svg;
}

// Cobblestone path

/** The middle line of the path, from the front-left corner across the island (and up to the cottage door). */
function pathCenterLine(hasCottage: boolean): [along: number, across: number][] {
  const points: [number, number][] = [];

  const curve = (start: number[], control: number[], end: number[], steps: number) => {
    for (let step = 0; step < steps; step++) {
      const progress = step / steps;
      const along = (1 - progress) ** 2 * start[0] + 2 * (1 - progress) * progress * control[0] + progress * progress * end[0];
      const across = (1 - progress) ** 2 * start[1] + 2 * (1 - progress) * progress * control[1] + progress * progress * end[1];

      points.push([along, across]);
    }
  };

  curve([1.7, 13.2], [1.9, PATH_ACROSS], [5, PATH_ACROSS], 40);

  const straightEnd = hasCottage ? 56.8 : 62;

  for (let along = 5; along < straightEnd; along += 0.1) {
    points.push([along, PATH_ACROSS + 0.18 * Math.sin(along * 0.33)]);
  }

  if (hasCottage) {
    curve([56.8, PATH_ACROSS + 0.18 * Math.sin(56.8 * 0.33)], [60, PATH_ACROSS + 0.1], [60, COTTAGE.front + 0.35], 30);
  } else {
    points.push([62.6, PATH_ACROSS]);
  }

  return points;
}

function cobblestones(theme: Theme, hasCottage: boolean): string {
  const centerLine = pathCenterLine(hasCottage);
  const random = seededRandom(23);

  // Worn earth under the stones.
  const earthPoints = centerLine.filter((_, index) => index % 4 === 0).map(([along, across]) => point(along, across));
  let svg = strokePath(`M${earthPoints.join('L')}`, theme.stoneDark, 21, ' opacity=".35"');

  // Rows of three stones every half tile along the path.
  const stones: { along: number; across: number; radius: number }[] = [];
  let distance = 0;

  for (let index = 1; index < centerLine.length; index++) {
    const [previousAlong, previousAcross] = centerLine[index - 1];
    const [along, across] = centerLine[index];
    const stepLength = Math.hypot(along - previousAlong, across - previousAcross);

    distance += stepLength;

    if (distance < 0.52) {
      continue;
    }

    distance = 0;

    // Sideways direction across the path.
    const sideAlong = -(across - previousAcross) / stepLength;
    const sideAcross = (along - previousAlong) / stepLength;
    const stagger = stones.length % 2 ? 0.28 : -0.05;

    for (const offset of [-0.6, 0, 0.6]) {
      const sideways = offset + stagger * 0.4 + (random() - 0.5) * 0.12;

      stones.push({
        along: along + sideAlong * sideways + (random() - 0.5) * 0.1,
        across: across + sideAcross * sideways + (random() - 0.5) * 0.1,
        radius: 0.25 + random() * 0.08,
      });
    }
  }

  stones.sort((a, b) => a.along + a.across - (b.along + b.across));

  for (const stone of stones) {
    const [x, y] = toScreen(stone.along, stone.across);
    const width = stone.radius * TILE_HALF_WIDTH * 1.3;
    const height = width * 0.55;

    svg += `<ellipse cx="${num(x)}" cy="${num(y + 1.3)}" rx="${num(width)}" ry="${num(height)}" fill="${theme.stoneDark}"/>` +
      `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(width * 0.96)}" ry="${num(height * 0.92)}" fill="${theme.stoneMid}"/>` +
      `<ellipse cx="${num(x - width * 0.25)}" cy="${num(y - height * 0.3)}" rx="${num(width * 0.48)}" ry="${num(height * 0.4)}" fill="${theme.stoneLight}"/>`;
  }

  return svg;
}

// Scenery

function fence(theme: Theme, hasCottage: boolean): string {
  const fenceAcross = 0.25;
  const fenceEnd = hasCottage ? COTTAGE.left - 0.4 : ISLAND_LENGTH - 0.4;
  let svg = '';

  // Two rails on each side.
  for (const railHeight of [4, 9.5]) {
    svg += polygon([point(0.3, fenceAcross, railHeight + 2), point(fenceEnd, fenceAcross, railHeight + 2), point(fenceEnd, fenceAcross, railHeight), point(0.3, fenceAcross, railHeight)], theme.woodDark);
    svg += polygon([point(fenceAcross, 0.3, railHeight + 2), point(fenceAcross, ISLAND_DEPTH - 0.4, railHeight + 2), point(fenceAcross, ISLAND_DEPTH - 0.4, railHeight), point(fenceAcross, 0.3, railHeight)], theme.woodDark);
  }

  // Pickets.
  for (let across = ISLAND_DEPTH - 0.75; across >= 0.4; across -= 0.55) {
    const [x, y] = toScreen(0.25, across);
    svg += `<use href="#fence-picket-side" x="${num(x)}" y="${num(y)}"/>`;
  }

  for (let along = 0.4; along <= fenceEnd - 0.3; along += 0.55) {
    const [x, y] = toScreen(along, fenceAcross);
    svg += `<use href="#fence-picket-back" x="${num(x)}" y="${num(y)}"/>`;
  }

  // Thicker posts every few tiles.
  for (let along = 0.25; along <= fenceEnd; along += 6) {
    svg += isoBox(along - 0.2, fenceAcross - 0.2, 0.4, 0.4, 0, 17, theme.woodLight, theme.woodMid, theme.woodDark);
  }

  return svg;
}

function cherryTree(theme: Theme, selection: GardenTheme): string {
  const random = seededRandom(31);
  const [baseX, baseY] = toScreen(2.4, 2.1);

  let svg = `<ellipse cx="${num(baseX + 14)}" cy="${num(baseY + 3)}" rx="44" ry="15" fill="${theme.shadow}" opacity=".2"/>`;

  // Trunk: lit side, shaded side and a highlight.
  svg += `<path d="M${baseX - 6} ${baseY + 2}C${baseX - 4} ${baseY - 16} ${baseX - 6} ${baseY - 30} ${baseX - 12} ${baseY - 44}` +
    `L${baseX - 3} ${baseY - 46}C${baseX} ${baseY - 34} ${baseX + 2} ${baseY - 38} ${baseX + 8} ${baseY - 48}` +
    `L${baseX + 14} ${baseY - 44}C${baseX + 6} ${baseY - 32} ${baseX + 5} ${baseY - 16} ${baseX + 7} ${baseY + 2}Z" fill="${theme.woodMid}"/>`;
  svg += `<path d="M${baseX + 1} ${baseY + 2}C${baseX + 2} ${baseY - 14} ${baseX + 3} ${baseY - 28} ${baseX + 9} ${baseY - 44}` +
    `L${baseX + 14} ${baseY - 44}C${baseX + 6} ${baseY - 32} ${baseX + 5} ${baseY - 16} ${baseX + 7} ${baseY + 2}Z" fill="${theme.woodDark}"/>`;
  svg += strokePath(`M${baseX - 4} ${baseY - 6}C${baseX - 4} ${baseY - 18} ${baseX - 5} ${baseY - 28} ${baseX - 9} ${baseY - 38}`, theme.woodLight, 1.4, ' opacity=".8"');

  // Blossom canopy made of overlapping puffs in three tones.
  const puffs: [x: number, y: number, radius: number][] = [];

  for (let index = 0; index < 30; index++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());

    puffs.push([baseX + 2 + Math.cos(angle) * distance * 58, baseY - 72 + Math.sin(angle) * distance * 34, 12 + random() * 9]);
  }

  puffs.sort((a, b) => a[1] - b[1]);

  const shadowPuffs = puffs.map(([x, y, radius]) => `<circle cx="${num(x + 3)}" cy="${num(y + 4)}" r="${num(radius)}"/>`).join('');
  const bodyPuffs = puffs.map(([x, y, radius]) => `<circle cx="${num(x)}" cy="${num(y)}" r="${num(radius * 0.86)}"/>`).join('');
  const highlightPuffs = puffs
    .filter(([x, y]) => x - baseX + (y - baseY + 72) * 1.5 < 6) // only the upper-left side catches the light
    .map(([x, y, radius]) => `<circle cx="${num(x - 3)}" cy="${num(y - 4)}" r="${num(radius * 0.5)}"/>`)
    .join('');

  svg += `<g fill="${theme.blossomDark}">${shadowPuffs}</g>`;
  svg += `<g fill="${theme.blossomMid}">${bodyPuffs}</g>`;
  svg += `<g fill="${theme.blossomLight}">${highlightPuffs}</g>`;

  // Little specks of petals.
  for (let index = 0; index < 40; index++) {
    const x = baseX + 2 + (random() - 0.5) * 118;
    const y = baseY - 72 + (random() - 0.5) * 70;
    const radius = 0.8 + random();
    const color = random() < 0.5 ? (selection === 'fall' || selection === 'summer' ? theme.blossomLight : '#fff4f8') : theme.blossomDark;

    svg += `<circle cx="${num(x)}" cy="${num(y)}" r="${num(radius)}" fill="${color}" opacity=".85"/>`;
  }

  return svg;
}

function bench(theme: Theme): string {
  const start = 25;
  const length = 3.5;
  const end = start + length;

  let svg = polygon([point(start - 0.1, 0.8), point(end + 0.4, 0.8), point(end + 0.4, 2.1), point(start - 0.1, 2.1)], theme.shadow, ' opacity=".18"');

  // Backrest with two plank lines.
  svg += isoBox(start, 0.62, length, 0.2, 6, 11, theme.woodLight, theme.woodMid, theme.woodDark);
  svg += strokePath(`M${point(start, 0.82, 10)}L${point(end, 0.82, 10)}M${point(start, 0.82, 13.5)}L${point(end, 0.82, 13.5)}`, theme.woodDark, 0.7);

  // Back legs, seat, front legs.
  for (const legAlong of [start + 0.1, end - 0.35]) {
    svg += isoBox(legAlong, 0.95, 0.25, 0.25, 0, 6, theme.woodMid, theme.woodMid, theme.woodDark);
  }

  svg += isoBox(start, 0.9, length, 0.9, 6, 2, theme.woodLight, theme.woodMid, theme.woodDark);
  svg += strokePath(`M${point(start, 1.2, 8)}L${point(end, 1.2, 8)}M${point(start, 1.5, 8)}L${point(end, 1.5, 8)}`, theme.woodMid, 0.6);

  for (const legAlong of [start + 0.1, end - 0.35]) {
    svg += isoBox(legAlong, 1.5, 0.25, 0.25, 0, 6, theme.woodMid, theme.woodMid, theme.woodDark);
  }

  // A little teapot resting on the seat.
  const [x, y] = toScreen(start + 2.4, 1.3, 8);

  svg += `<g transform="translate(${num(x)} ${num(y)})">` +
    `<path d="M-4.2 -2.5Q-7.6 -3.6 -8 -6.2" fill="none" stroke="${theme.ceramicShade}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M3.4 -5.2Q7.4 -5 5.4 -1.4" fill="none" stroke="${theme.ceramicShade}" stroke-width="1.2"/>` +
    `<ellipse cy="-3.4" rx="4.8" ry="3.8" fill="${theme.ceramicShade}"/><ellipse cx="-.5" cy="-3.8" rx="4.2" ry="3.3" fill="${theme.ceramic}"/>` +
    `<ellipse cx="-1.8" cy="-5" rx="1.6" ry=".9" fill="${theme.ceramicLight}"/><ellipse cy="-7" rx="2.2" ry=".8" fill="${theme.ceramicShade}"/>` +
    `<circle cy="-8" r=".9" fill="${theme.blossomDark}"/></g>`;

  return svg;
}

function lantern(along: number, across: number, theme: Theme, index: number): string {
  const glass = theme.night ? theme.glow : theme.glassOff;
  const glassSide = theme.night ? '#f0b558' : theme.stoneMid;
  const [groundX, groundY] = toScreen(along, across);

  let svg = `<ellipse cx="${num(groundX + 1)}" cy="${num(groundY + 0.5)}" rx="4" ry="1.8" fill="${theme.shadow}" opacity=".25"/>`;

  if (theme.night) {
    svg += `<ellipse class="flicker delay-${index % 5}" cx="${num(groundX)}" cy="${num(groundY)}" rx="22" ry="9" fill="url(#lamp-glow)" opacity=".7"/>`;
  }

  // Post, base plate and glass box.
  svg += isoBox(along - 0.12, across - 0.12, 0.24, 0.24, 0, 20, theme.woodLight, theme.woodMid, theme.woodDark);
  svg += isoBox(along - 0.32, across - 0.32, 0.64, 0.64, 19, 2, theme.woodMid, theme.woodMid, theme.woodDark);
  svg += isoBox(along - 0.28, across - 0.28, 0.56, 0.56, 21, 8, glass, glass, glassSide);

  const frame = `M${point(along - 0.28, across + 0.28, 21)}L${point(along - 0.28, across + 0.28, 29)}` +
    `M${point(along + 0.28, across + 0.28, 21)}L${point(along + 0.28, across + 0.28, 29)}` +
    `M${point(along + 0.28, across - 0.28, 21)}L${point(along + 0.28, across - 0.28, 29)}`;

  svg += strokePath(frame, theme.woodDark, 0.8);

  // Pointed cap.
  const apex = point(along, across, 34);

  svg += polygon([point(along - 0.4, across + 0.4, 29), point(along + 0.4, across + 0.4, 29), apex], theme.woodMid);
  svg += polygon([point(along + 0.4, across - 0.4, 29), point(along + 0.4, across + 0.4, 29), apex], theme.woodDark);

  if (theme.night) {
    const [lightX, lightY] = toScreen(along, across, 25);
    svg += `<circle class="flicker delay-${(index + 2) % 5}" cx="${num(lightX)}" cy="${num(lightY)}" r="20" fill="url(#lamp-glow)"/>`;
  }

  return svg;
}

/** Tier 1 = starter cottage, 2 = cozy (porch, roses, smoke), 3 = storybook (second storey, dormer). */
function cottage(theme: Theme, tier: number): string {
  const { left, right, back, front } = COTTAGE;
  const wallHeight = tier >= 3 ? 46 : COTTAGE.wallHeight;
  const ridgeAcross = (back + front) / 2;
  const ridgeHeight = wallHeight + 19;

  const glass = theme.night ? theme.glow : theme.glassOff;
  const window = (corners: string[], bars: string) =>
    polygon(corners, glass, ` stroke="${theme.woodDark}" stroke-width="1.6" stroke-linejoin="round"`) + strokePath(bars, theme.woodDark, 0.8);
  const litWindows: Point[] = [toScreen(left + 0.95, front, 15), toScreen(right - 0.95, front, 15)];

  let svg = polygon([point(left - 0.3, back), point(right + 0.8, back), point(right + 0.8, front + 0.6), point(left - 0.3, front + 0.6)], theme.shadow, ' opacity=".2"');

  // Back roof slope and chimney.
  svg += polygon([point(left - 0.4, back - 0.5, wallHeight - 2), point(right + 0.4, back - 0.5, wallHeight - 2), point(right + 0.4, ridgeAcross, ridgeHeight), point(left - 0.4, ridgeAcross, ridgeHeight)], theme.roofDark);
  svg += isoBox(left + 3, back + 0.6, 0.7, 0.7, wallHeight + 4, 22, theme.stoneLight, theme.stoneMid, theme.stoneDark);
  svg += isoBox(left + 2.92, back + 0.52, 0.86, 0.86, wallHeight + 26, 2, theme.stoneMid, theme.stoneDark, theme.stoneDark);

  // Walls, gable and stone foundation.
  svg += polygon([point(left, front, wallHeight), point(right, front, wallHeight), point(right, front), point(left, front)], theme.wall);
  svg += polygon([point(right, back, wallHeight), point(right, front, wallHeight), point(right, front), point(right, back)], theme.wallShade);
  svg += polygon([point(right, back, wallHeight), point(right, front, wallHeight), point(right, ridgeAcross, ridgeHeight)], theme.wallShade);
  svg += polygon([point(left, front, 4), point(right, front, 4), point(right, front), point(left, front)], theme.stoneMid);
  svg += polygon([point(right, back, 4), point(right, front, 4), point(right, front), point(right, back)], theme.stoneDark);
  svg += strokePath(`M${point(right, front, 0)}L${point(right, front, wallHeight)}`, theme.woodDark, 1.6);
  svg += strokePath(`M${point(left, front, wallHeight)}L${point(right, front, wallHeight)}L${point(right, back, wallHeight)}`, theme.woodDark, 1.4);

  // Front windows with flower boxes under them.
  for (const windowLeft of [left + 0.5, right - 1.4]) {
    const windowRight = windowLeft + 0.9;
    const corners = [point(windowLeft, front, 19), point(windowRight, front, 19), point(windowRight, front, 11), point(windowLeft, front, 11)];
    const bars = `M${point(windowLeft + 0.45, front, 19)}L${point(windowLeft + 0.45, front, 11)}M${point(windowLeft, front, 15)}L${point(windowRight, front, 15)}`;

    svg += window(corners, bars);
    svg += isoBox(windowLeft - 0.1, front, 1.1, 0.3, 8.5, 2.5, theme.soilDark, theme.woodMid, theme.woodDark);

    for (let index = 0; index < 4; index++) {
      const [x, y] = toScreen(windowLeft + 0.1 + index * 0.28, front + 0.15, 12);
      const flowerColor = index % 2 ? theme.blossomMid : theme.glow;

      svg += `<circle cx="${num(x)}" cy="${num(y)}" r="1.6" fill="${theme.bushMid}"/><circle cx="${num(x - 0.3)}" cy="${num(y - 1)}" r=".9" fill="${flowerColor}"/>`;
    }
  }

  // Side window.
  svg += window(
    [point(right, back + 1.4, 19), point(right, back + 2.4, 19), point(right, back + 2.4, 11), point(right, back + 1.4, 11)],
    `M${point(right, back + 1.9, 19)}L${point(right, back + 1.9, 11)}M${point(right, back + 1.4, 15)}L${point(right, back + 2.4, 15)}`,
  );

  // Storybook: half-timbered second storey, upper windows and a round attic window.
  if (tier >= 3) {
    svg += strokePath(`M${point(left, front, 24)}L${point(right, front, 24)}L${point(right, back, 24)}`, theme.woodDark, 1.8);

    const timbers = `M${point(left + 1.62, front, 24)}L${point(left + 1.62, front, wallHeight)}` +
      `M${point(left + 3.2, front, 24)}L${point(left + 3.2, front, wallHeight)}` +
      `M${point(left + 1.62, front, 24)}L${point(left + 3.2, front, wallHeight)}` +
      `M${point(right, back + 2.1, 24)}L${point(right, back + 2.1, wallHeight)}`;

    svg += strokePath(timbers, theme.woodDark, 1.2);

    for (const windowLeft of [left + 0.4, left + 3.55]) {
      const windowRight = windowLeft + 0.85;
      const corners = [point(windowLeft, front, 37), point(windowRight, front, 37), point(windowRight, front, 29), point(windowLeft, front, 29)];

      svg += window(corners, `M${point(windowLeft + 0.42, front, 37)}L${point(windowLeft + 0.42, front, 29)}`);
      litWindows.push(toScreen(windowLeft + 0.42, front, 33));
    }

    for (const windowBack of [back + 0.6, back + 2.7]) {
      const windowFront = windowBack + 0.9;
      const corners = [point(right, windowBack, 37), point(right, windowFront, 37), point(right, windowFront, 29), point(right, windowBack, 29)];

      svg += window(corners, `M${point(right, windowBack + 0.45, 37)}L${point(right, windowBack + 0.45, 29)}`);
    }

    const [atticX, atticY] = toScreen(right, (back + front) / 2, wallHeight + 8);
    svg += `<circle cx="${num(atticX)}" cy="${num(atticY)}" r="3" fill="${glass}" stroke="${theme.woodDark}" stroke-width="1.4"/>`;
  }

  // Door with a little window, a knob and a stone step.
  const doorLeft = left + 1.85;
  const doorRight = doorLeft + 1.1;

  svg += polygon([point(doorLeft, front, 18), point(doorRight, front, 18), point(doorRight, front, 0), point(doorLeft, front, 0)], theme.woodMid, ` stroke="${theme.woodDark}" stroke-width="1.4"`);
  svg += strokePath(`M${point(doorLeft + 0.37, front, 17)}L${point(doorLeft + 0.37, front, 1)}M${point(doorLeft + 0.74, front, 17)}L${point(doorLeft + 0.74, front, 1)}`, theme.woodDark, 0.6, ' opacity=".7"');
  svg += window(
    [point(doorLeft + 0.25, front, 15.5), point(doorRight - 0.25, front, 15.5), point(doorRight - 0.25, front, 11), point(doorLeft + 0.25, front, 11)],
    `M${point(doorLeft + 0.55, front, 15.5)}L${point(doorLeft + 0.55, front, 11)}`,
  );

  const [knobX, knobY] = toScreen(doorRight - 0.18, front, 8);

  svg += `<circle cx="${num(knobX)}" cy="${num(knobY)}" r="1" fill="${theme.glow}"/>`;
  svg += isoBox(doorLeft - 0.1, front, 1.3, 0.45, 0, 1.6, theme.stoneLight, theme.stoneMid, theme.stoneDark);

  // Front roof slope with rows of tiles.
  const eaveAcross = front + 0.6;
  const eaveHeight = wallHeight - 3;

  svg += polygon([point(left - 0.4, eaveAcross, eaveHeight), point(right + 0.4, eaveAcross, eaveHeight), point(right + 0.4, ridgeAcross, ridgeHeight), point(left - 0.4, ridgeAcross, ridgeHeight)], theme.roofMid);

  const slopeAt = (fraction: number): [across: number, height: number] => [
    eaveAcross + (ridgeAcross - eaveAcross) * fraction,
    eaveHeight + (ridgeHeight - eaveHeight) * fraction,
  ];

  let tileRows = '';
  let tileSeams = '';

  for (let row = 1; row < 6; row++) {
    const [across, height] = slopeAt(row / 6);
    tileRows += `M${point(left - 0.4, across, height)}L${point(right + 0.4, across, height)}`;
  }

  for (let row = 0; row < 6; row++) {
    const [lowAcross, lowHeight] = slopeAt(row / 6);
    const [highAcross, highHeight] = slopeAt((row + 1) / 6);
    const firstSeam = left - 0.4 + (row % 2 ? 0.3 : 0.6);

    for (let along = firstSeam; along < right + 0.4; along += 0.6) {
      tileSeams += `M${point(along, lowAcross, lowHeight)}L${point(along, highAcross, highHeight)}`;
    }
  }

  svg += strokePath(tileSeams, theme.roofDark, 0.6, ' opacity=".55"') + strokePath(tileRows, theme.roofDark, 1);
  svg += strokePath(`M${point(left - 0.4, eaveAcross, eaveHeight)}L${point(right + 0.4, eaveAcross, eaveHeight)}`, theme.roofLight, 1.6);
  svg += strokePath(`M${point(right + 0.4, eaveAcross, eaveHeight)}L${point(right + 0.4, ridgeAcross, ridgeHeight)}L${point(right + 0.4, back - 0.5, wallHeight - 2)}`, theme.roofDark, 2.4);
  svg += strokePath(`M${point(left - 0.4, ridgeAcross, ridgeHeight)}L${point(right + 0.4, ridgeAcross, ridgeHeight)}`, theme.roofLight, 2.2);

  // Storybook: a gabled dormer window sitting on the front slope.
  if (tier >= 3) {
    const acrossAtHeight = (height: number) => eaveAcross + (ridgeAcross - eaveAcross) * ((height - eaveHeight) / (ridgeHeight - eaveHeight));
    const dormerBase = eaveHeight + (ridgeHeight - eaveHeight) * 0.22;
    const dormerFront = acrossAtHeight(dormerBase);
    const dormerTop = dormerBase + 9;
    const dormerLeft = left + 1.9;
    const dormerRight = dormerLeft + 1.2;
    const dormerMiddle = (dormerLeft + dormerRight) / 2;

    svg += polygon([point(dormerLeft, dormerFront, dormerBase), point(dormerRight, dormerFront, dormerBase), point(dormerRight, dormerFront, dormerTop), point(dormerLeft, dormerFront, dormerTop)], theme.wall);
    svg += window(
      [point(dormerLeft + 0.25, dormerFront, dormerTop - 1.5), point(dormerRight - 0.25, dormerFront, dormerTop - 1.5), point(dormerRight - 0.25, dormerFront, dormerBase + 1.5), point(dormerLeft + 0.25, dormerFront, dormerBase + 1.5)],
      `M${point(dormerMiddle, dormerFront, dormerTop - 1.5)}L${point(dormerMiddle, dormerFront, dormerBase + 1.5)}`,
    );
    litWindows.push(toScreen(dormerMiddle, dormerFront, dormerBase + 4.5));

    const roofFront = dormerFront + 0.15;
    const peak = dormerTop + 5;
    const eave = dormerTop - 1;

    svg += polygon([point(dormerLeft - 0.2, roofFront, eave), point(dormerMiddle, roofFront, peak), point(dormerMiddle, acrossAtHeight(peak), peak), point(dormerLeft - 0.2, acrossAtHeight(eave), eave)], theme.roofMid);
    svg += polygon([point(dormerMiddle, roofFront, peak), point(dormerRight + 0.2, roofFront, eave), point(dormerRight + 0.2, acrossAtHeight(eave), eave), point(dormerMiddle, acrossAtHeight(peak), peak)], theme.roofDark);
    svg += strokePath(`M${point(dormerLeft - 0.2, roofFront, eave)}L${point(dormerMiddle, roofFront, peak)}L${point(dormerRight + 0.2, roofFront, eave)}`, theme.roofLight, 1.4);
  }

  // Cozy: a porch over the door, climbing roses and chimney smoke.
  if (tier >= 2) {
    const porchFront = front + 0.9;
    const porchHeight = 21;

    for (const postAlong of [doorLeft - 0.2, doorRight + 0.2]) {
      svg += isoBox(postAlong - 0.08, porchFront - 0.08, 0.16, 0.16, 0, porchHeight, theme.woodLight, theme.woodMid, theme.woodDark);
    }

    svg += polygon([point(doorLeft - 0.45, front, porchHeight + 4), point(doorRight + 0.45, front, porchHeight + 4), point(doorRight + 0.45, porchFront + 0.15, porchHeight), point(doorLeft - 0.45, porchFront + 0.15, porchHeight)], theme.roofMid);
    svg += polygon([point(doorRight + 0.45, front, porchHeight + 4), point(doorRight + 0.45, porchFront + 0.15, porchHeight), point(doorRight + 0.45, porchFront + 0.15, porchHeight - 1.5), point(doorRight + 0.45, front, porchHeight + 2.5)], theme.roofDark);
    svg += strokePath(`M${point(doorLeft - 0.45, porchFront + 0.15, porchHeight)}L${point(doorRight + 0.45, porchFront + 0.15, porchHeight)}`, theme.roofLight, 1.6);

    // Roses up the front corner and along under the eave.
    const random = seededRandom(41);
    const roseSpots: Point[] = [];

    for (let index = 0; index <= 9; index++) {
      roseSpots.push(toScreen(left + 0.15 + Math.sin(index * 1.3) * 0.1, front + 0.05, 2 + (index / 9) * (wallHeight - 6)));
    }

    for (let index = 1; index <= 5; index++) {
      roseSpots.push(toScreen(left + index * 0.3, front + 0.05, wallHeight - 4 + Math.sin(index * 1.7) * 1.2));
    }

    for (const [x, y] of roseSpots) {
      const leafX = x + (random() - 0.5) * 3;
      const leafY = y + (random() - 0.5) * 2;
      const leafColor = random() < 0.5 ? theme.bushMid : theme.bushLight;
      const rotation = Math.floor(random() * 180);

      svg += `<ellipse cx="${num(leafX)}" cy="${num(leafY)}" rx="2.3" ry="1.4" fill="${leafColor}" transform="rotate(${rotation} ${num(x)} ${num(y)})"/>`;
    }

    roseSpots.forEach(([x, y], index) => {
      if (index % 2) {
        svg += `<circle cx="${num(x + 1)}" cy="${num(y - 0.5)}" r="1.5" fill="${theme.blossomDark}"/><circle cx="${num(x + 0.7)}" cy="${num(y - 0.8)}" r=".7" fill="${theme.blossomLight}"/>`;
      }
    });

    const [smokeX, smokeY] = toScreen(left + 3.35, back + 0.95, wallHeight + 30);

    for (let index = 0; index < 3; index++) {
      svg += `<circle class="smoke smoke-${index}" cx="${num(smokeX)}" cy="${num(smokeY)}" r="3.4" fill="${theme.stoneLight}"/>`;
    }
  }

  // Wall lantern by the door.
  const [lanternX, lanternY] = toScreen(doorRight + 0.35, front, 16);

  svg += `<rect x="${num(lanternX - 1.8)}" y="${num(lanternY - 3)}" width="3.6" height="5" rx="1" fill="${glass}" stroke="${theme.woodDark}" stroke-width="1"/>`;

  // At night every window glows and light spills onto the path.
  if (theme.night) {
    svg += `<circle class="flicker" cx="${num(lanternX)}" cy="${num(lanternY)}" r="16" fill="url(#lamp-glow)"/>`;

    for (const [x, y] of litWindows) {
      svg += `<circle class="flicker delay-3" cx="${num(x)}" cy="${num(y)}" r="18" fill="url(#lamp-glow)" opacity=".8"/>`;
    }

    const [spillX, spillY] = toScreen(doorLeft + 0.6, front + 1.4);
    svg += `<ellipse class="flicker delay-1" cx="${num(spillX)}" cy="${num(spillY)}" rx="30" ry="12" fill="url(#lamp-glow)" opacity=".6"/>`;
  }

  return svg;
}

/** A wooden arch over the path for a streak, wrapped in a vine of that streak's flower. */
function streakArch(along: number, group: Group, theme: Theme, isLongest: boolean): string {
  const backAcross = 6.3;
  const frontAcross = 8.7;
  const middleAcross = (backAcross + frontAcross) / 2;
  const halfSpan = (frontAcross - backAcross) / 2;
  const curveHeight = isLongest ? 10 : 8;
  const postHeight = isLongest ? 22 : 18;

  const archAt = (angle: number): [across: number, height: number] => [
    middleAcross - Math.cos(angle) * halfSpan,
    postHeight + Math.sin(angle) * curveHeight,
  ];

  const archPath = (archAlong: number) => {
    const points = [point(archAlong, backAcross, 0), point(archAlong, backAcross, postHeight)];

    for (let step = 1; step < 12; step++) {
      const [across, height] = archAt((step / 12) * Math.PI);
      points.push(point(archAlong, across, height));
    }

    points.push(point(archAlong, frontAcross, postHeight), point(archAlong, frontAcross, 0));

    return `M${points.join('L')}`;
  };

  // Two beams with rungs between them.
  let svg = strokePath(archPath(along), theme.woodDark, 2.6) +
    strokePath(archPath(along + 0.32), theme.woodMid, 2.6) +
    strokePath(archPath(along + 0.32), theme.woodLight, 0.8, ' opacity=".8"');

  for (let step = 0; step <= 8; step++) {
    const [across, height] = archAt((step / 8) * Math.PI);
    svg += strokePath(`M${point(along, across, height)}L${point(along + 0.32, across, height)}`, theme.woodDark, 1);
  }

  // The vine: leaves all the way round, with a flower every third leaf.
  const random = seededRandom(Math.round(along * 100));

  for (let index = 0; index < 16; index++) {
    const progress = index / 15;
    let across: number;
    let height: number;

    if (progress < 0.25) {
      across = backAcross;
      height = (progress / 0.25) * postHeight;
    } else if (progress > 0.75) {
      across = frontAcross;
      height = ((1 - progress) / 0.25) * postHeight;
    } else {
      [across, height] = archAt(((progress - 0.25) / 0.5) * Math.PI);
    }

    const [x, y] = toScreen(along + 0.34, across, height);
    const leafX = x + (random() - 0.5) * 3;
    const leafY = y + (random() - 0.5) * 2;
    const leafColor = index % 2 ? theme.bushMid : theme.bushLight;
    const rotation = Math.floor(random() * 180);

    svg += `<ellipse cx="${num(leafX)}" cy="${num(leafY)}" rx="2.4" ry="1.5" fill="${leafColor}" transform="rotate(${rotation} ${num(x)} ${num(y)})"/>`;

    if (index % 3 === 1) {
      svg += `<use href="#flower-head-${group.key}" transform="translate(${num(x)} ${num(y)}) scale(${isLongest ? 0.9 : 0.7})"/>`;
    }
  }

  return svg;
}

function butterfly(x: number, y: number, index: number, wingColor: string, spotColor: string, bodyColor: string): string {
  const offset = `delay-${index % 5}`;
  const wing = (side: number) =>
    `<path d="M0 0C${-3 * side} -7 ${-9 * side} -7 ${-8.5 * side} -2C${-8 * side} 1 ${-3 * side} 1.5 0 0Z" fill="${wingColor}"/>` +
    `<path d="M0 0C${-4 * side} 1.5 ${-6 * side} 5.5 ${-3 * side} 6C${-1 * side} 6.2 0 3 0 0Z" fill="${spotColor}"/>`;

  return `<g transform="translate(${num(x)} ${num(y)}) scale(.7)"><g class="drift drift-${index % 3} ${offset}">` +
    `<g class="left-wing ${offset}">${wing(1)}</g><g class="right-wing ${offset}">${wing(-1)}</g>` +
    `<ellipse cy="1" rx=".9" ry="3.6" fill="${bodyColor}"/>` +
    `<path d="M0 -2.4Q-1.5 -5.5 -2.8 -6M0 -2.4Q1.5 -5.5 2.8 -6" fill="none" stroke="${bodyColor}" stroke-width=".5"/></g></g>`;
}

function bee(x: number, y: number, index: number): string {
  return `<g transform="translate(${num(x)} ${num(y)}) scale(.75)"><g class="buzz delay-${index % 5}">` +
    `<ellipse class="bee-wing" cx="-1" cy="-3.4" rx="2.2" ry="3.2" fill="#fff" opacity=".75" transform="rotate(-20 -1 -3.4)"/>` +
    `<ellipse class="bee-wing delay-2" cx="1.6" cy="-3.2" rx="2" ry="3" fill="#fff" opacity=".65" transform="rotate(20 1.6 -3.2)"/>` +
    `<ellipse rx="3.8" ry="2.7" fill="#f2cd6a"/><path d="M-1.2 -2.5V2.5M1.4 -2.4V2.4" stroke="#5b4636" stroke-width="1.1"/>` +
    `<circle cx="3.8" cy="-.3" r="1.5" fill="#5b4636"/></g></g>`;
}

// The whole garden island

function garden(model: Model, palettes: Map<string, Palette>, config: GardenConfig, theme: Theme, selection: GardenTheme): string {
  const total = model.data.totals.contributions;
  const milestones = config.milestones;

  let cottageTier = 0;

  if (total >= milestones.cottage.storybook) {
    cottageTier = 3;
  } else if (total >= milestones.cottage.cozy) {
    cottageTier = 2;
  } else if (total >= milestones.cottage.starter) {
    cottageTier = 1;
  }

  const unlocked = {
    fence: total >= milestones.fence,
    lanterns: total >= milestones.lanterns,
    tree: total >= milestones.tree,
    bench: total >= milestones.bench,
    cottage: cottageTier > 0,
  };

  // Flat things first: the island, ground details, the path and the fence behind everything.
  const snowy = selection === 'winter' || selection === 'christmas';
  const spooky = selection === 'halloween';
  let svg = island(theme) + groundDetails(model, theme, unlocked.tree && !snowy && !spooky && selection !== 'summer') + cobblestones(theme, unlocked.cottage);

  if (unlocked.fence) {
    svg += fence(theme, unlocked.cottage);
  }

  // Everything that stands up is drawn back to front, sorted by along + across.
  const items: { depth: number; svg: string }[] = [];
  const decoration = (along: number, across: number, art: string, scale = 1) => {
    const [x, y] = toScreen(along, across);
    items.push({
      depth: along + across,
      svg: `<g transform="translate(${num(x)} ${num(y)}) scale(${num(scale)})">${art}</g>`,
    });
  };

  if (snowy) {
    for (const along of [12, 34, 48]) {
      decoration(along, 1.6, pine(theme, selection === 'christmas'), 0.38);
    }
  }
  if (spooky || selection === 'christmas') {
    for (const along of [8, 20, 32, 44, 54]) {
      decoration(along, 12.5, spooky ? tombstone(theme) : candyCane(), 0.8);
    }
    if (spooky) {
      decoration(17, 1.5, deadTree(theme), 0.4);
      decoration(43, 1.5, deadTree(theme), 0.35);
      decoration(5, 5, ghost(0), 0.8);
      decoration(39, 2, bat(0, theme), 0.7);
    }
  }

  for (const plot of model.plots) {
    const { along, across } = tilePosition(plot.week, plot.weekday, model.weekCount);
    const [x, y] = toScreen(along, across);
    const position = `x="${num(x)}" y="${num(y)}"`;

    let tile = '';

    if (plot.level === 0) {
      // Mostly bare grass, sometimes a tuft, pebble or clover.
      const variety = plot.seed % 20;

      if (variety >= 7) {
        const decoration = variety < 13 ? 'grass-tuft' : variety < 16 ? 'pebble' : 'clover';
        tile = `<use href="#${decoration}" ${position}/>`;
      }
    } else if (plot.level === 1) {
      tile = `<use href="#sprout" ${position}/>`;
    } else {
      // Swaying plants sit inside a translated <g>, because an animated <use> with x/y can fail to paint in Chrome.
      const swaying = (offsetY: number) =>
        `<g transform="translate(${num(x)} ${num(y + offsetY)})"><use href="#plant-${plot.group!.key}-${plot.level}" class="sway sway-${(plot.seed >>> 3) % 6}"/></g>`;

      tile = `<use href="#contact-shadow" ${position}/>`;
      tile += plot.level === 4 ? `<use href="#planter-box" ${position}/>${swaying(-4)}` : swaying(0);
    }

    if (tile) {
      items.push({ depth: along + across, svg: tile });
    }
  }

  // The flower that showed up most during a streak.
  const mostCommonGroup = (start: number, end: number): Group => {
    const counts = new Map<Group, number>();

    for (let index = start; index <= end; index++) {
      const group = model.plots[index].group;

      if (group) {
        counts.set(group, (counts.get(group) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? model.groups[0];
  };

  // One arch over the path per streak, skipping any that would crowd each other.
  const streaksLongestFirst = [...model.streaks].sort((a, b) => b.length - a.length);
  const archPositions: number[] = [];

  for (const streak of streaksLongestFirst) {
    const startAlong = tilePosition(model.plots[streak.start].week, 0, model.weekCount).along;
    const endAlong = tilePosition(model.plots[streak.end].week, 0, model.weekCount).along;
    const archAlong = (startAlong + endAlong) / 2 - 0.15;

    const tooClose = archPositions.some((other) => Math.abs(other - archAlong) < 3.2);

    if (tooClose || archPositions.length >= 10) {
      continue;
    }

    archPositions.push(archAlong);

    const group = mostCommonGroup(streak.start, streak.end);
    items.push({ depth: archAlong + 0.3 + 8.7, svg: streakArch(archAlong, group, theme, streak === model.longest) });
  }

  // Milestone scenery.
  if (unlocked.tree) {
    if (snowy || spooky) {
      decoration(2.4, 2.1, spooky ? deadTree(theme) : pine(theme, selection === 'christmas'));
    } else {
      items.push({ depth: 4.5, svg: cherryTree(theme, selection) });
    }
  }

  if (unlocked.bench) {
    items.push({ depth: 28, svg: bench(theme) });
  }

  if (unlocked.cottage) {
    items.push({ depth: 63.1, svg: cottage(theme, cottageTier) });
  }

  if (unlocked.lanterns) {
    const spots: [number, number][] = [[3.6, 12.4], [11, 12.3], [23, 12.3], [35, 12.3], [47, 12.3]];

    // The last one goes by the cottage door if there is one.
    spots.push(unlocked.cottage ? [61.4, 6.1] : [59, 12.3]);

    spots.forEach(([along, across], index) => {
      items.push({ depth: along + across, svg: lantern(along, across, theme, index) });
    });
  }

  // Little wildflower clumps along the front edge.
  const random = seededRandom(55);

  for (let index = 0; index < 14; index++) {
    const along = 6 + random() * 50;
    const across = 12.2 + random() * 0.6;
    const [x, y] = toScreen(along, across);
    const color = snowy ? theme.grassLight : [theme.blossomLight, '#fff6e8', theme.glow, theme.blossomMid][index % 4];

    let flowers = '';

    for (let flower = 0; flower < 5; flower++) {
      const flowerX = x + (random() - 0.5) * 6;
      const flowerY = y - 2.5 - random() * 3;

      flowers += `<circle cx="${num(flowerX)}" cy="${num(flowerY)}" r=".9" fill="${color}"/>`;
    }

    items.push({ depth: along + across, svg: `<g transform="translate(${num(x)} ${num(y)})">${mound(2.6, theme)}</g>${flowers}` });
  }

  items.sort((a, b) => a.depth - b.depth);
  svg += items.map((item) => item.svg).join('');

  // Critters: a butterfly per star, a bee per fork, and fireflies in the evening.
  const critterRandom = seededRandom(1234);
  const colors = model.groups.map((group) => palettes.get(group.key)!);
  const butterflyCount = Math.min(config.critters.maxButterflies, model.data.totals.stars);

  for (let index = 0; index < butterflyCount; index++) {
    const palette = colors[index % colors.length];
    const [x, y] = toScreen(6 + critterRandom() * 50, 1 + critterRandom() * 11, 28 + critterRandom() * 34);

    svg += spooky
      ? `<g transform="translate(${num(x)} ${num(y)}) scale(.7)">${bat(index, theme)}</g>`
      : butterfly(x, y, index, palette.petal, palette.petalLight, theme.night ? '#f3e3c3' : '#6b4a35');
  }

  const beeCount = Math.min(config.critters.maxBees, model.data.totals.forks);

  for (let index = 0; index < beeCount; index++) {
    const [x, y] = toScreen(6 + critterRandom() * 50, 3 + critterRandom() * 8, 14 + critterRandom() * 10);
    svg += spooky ? `<g transform="translate(${num(x)} ${num(y)}) scale(.6)">${ghost(index)}</g>` : bee(x, y, index);
  }

  if (theme.night) {
    const fireflyRandom = seededRandom(77);

    for (let index = 0; index < 30; index++) {
      const [x, y] = toScreen(fireflyRandom() * ISLAND_LENGTH, fireflyRandom() * ISLAND_DEPTH, 6 + fireflyRandom() * 46);

      svg += `<g transform="translate(${num(x)} ${num(y)})"><g class="firefly delay-${index % 5}"><circle r="7" fill="url(#firefly-glow)"/><circle r="1.1" fill="#fff8d6"/></g></g>`;
    }
  }

  return svg;
}

/** Cherry petals drifting down over the scene. */
function fallingPetals(theme: Theme, hasTree: boolean, selection: GardenTheme): string {
  if (selection === 'halloween' || selection === 'summer') {
    return '';
  }
  const snowy = selection === 'winter' || selection === 'christmas';
  const random = seededRandom(64);
  const count = snowy ? 38 : hasTree ? 24 : 10;
  let svg = '';

  for (let index = 0; index < count; index++) {
    const x = 30 + random() * 760;
    const y = -30 + random() * 230;
    const delay = -(random() * 16).toFixed(1);
    const color = index % 2 ? theme.blossomMid : theme.blossomLight;

    const shape = snowy
      ? `<circle data-decoration="snow" r="${num(1.3 + random() * 1.4)}" class="falling-petal petal-path-${index % 3}" style="animation-delay:${delay}s" fill="#f7fcff"/>`
      : `<use href="#petal" class="falling-petal petal-path-${index % 3}" style="animation-delay:${delay}s" fill="${color}"/>`;
    svg += `<g transform="translate(${num(x)} ${num(y)})">${shape}</g>`;
  }

  return svg;
}

// Bouquet in a teapot on a round table

function bouquet(model: Model, palettes: Map<string, Palette>, theme: Theme): string {
  const centerX = 892;
  const centerY = 122;
  const spreadX = 58;
  const spreadY = 44;
  const rimY = 190;
  const random = seededRandom(99);

  // One entry per stem, biggest language first.
  const stems = model.groups.flatMap((group) => Array<Group>(group.stems).fill(group));
  const stemCount = stems.length;

  // Round wooden table.
  let svg = `<ellipse cx="${centerX + 4}" cy="306" rx="58" ry="9" fill="${theme.shadow}" opacity=".22"/>`;

  svg += `<path d="M${centerX - 30} 304Q${centerX} 296 ${centerX + 30} 304L${centerX + 26} 309Q${centerX} 302 ${centerX - 26} 309Z" fill="${theme.woodDark}"/>`;
  svg += `<path d="M${centerX - 6} 262L${centerX - 8} 302H${centerX + 8}L${centerX + 6} 262Z" fill="${theme.woodMid}"/>`;
  svg += `<path d="M${centerX + 1} 262L${centerX + 2} 302H${centerX + 8}L${centerX + 6} 262Z" fill="${theme.woodDark}"/>`;
  svg += `<path d="M${centerX - 70} 252A70 20 0 0 0 ${centerX + 70} 252V258A70 20 0 0 1 ${centerX - 70} 258Z" fill="${theme.woodMid}"/>`;
  svg += `<path d="M${centerX + 10} 271.5A70 20 0 0 0 ${centerX + 70} 252V258A70 20 0 0 1 ${centerX + 10} 277.5Z" fill="${theme.woodDark}"/>`;
  svg += `<ellipse cx="${centerX}" cy="252" rx="70" ry="20" fill="${theme.woodLight}"/>`;
  svg += strokePath(`M${centerX - 62} 246Q${centerX} 240 ${centerX + 64} 248M${centerX - 66} 256Q${centerX} 250 ${centerX + 62} 260`, theme.woodMid, 0.8, ' opacity=".6"');
  svg += `<ellipse cx="${centerX - 18}" cy="246" rx="26" ry="6" fill="#fff" opacity=".12"/>`;

  // Heads on a sunflower spiral, so the biggest languages get the middle and back.
  const heads = stems.map((group, index) => {
    const distance = Math.sqrt((index + 0.5) / stemCount);
    const angle = index * 2.39996 + 0.9;
    const x = centerX + Math.cos(angle) * distance * spreadX;

    let y = centerY + Math.sin(angle) * distance * spreadY;

    // Flatten the bottom half so it sits in the teapot.
    if (y > centerY) {
      y = centerY + (y - centerY) * 0.7;
    }

    const baseRadius = index === 0 ? 17 : 14.5 - distance * 3;
    const radius = (baseRadius + (random() - 0.5) * 1.4) * (group.species.bouquetScale ?? 1);
    const tilt = ((x - centerX) / spreadX) * 22;

    return { group, x, y, radius, tilt };
  });

  // Greenery sprigs fanning out behind the flowers.
  const alongCurve = (start: number[], control: number[], end: number[], progress: number) =>
    [0, 1].map((axis) => (1 - progress) ** 2 * start[axis] + 2 * (1 - progress) * progress * control[axis] + progress * progress * end[axis]);

  [-84, -62, -40, -18, 2, 22, 44, 66, 86].forEach((degrees, sprigIndex) => {
    const angle = ((degrees + (random() - 0.5) * 8) * Math.PI) / 180;
    const tip = [centerX + Math.sin(angle) * (spreadX + 20), centerY - Math.cos(angle) * (spreadY + 16)];
    const control = [centerX + (tip[0] - centerX) * 0.25, centerY + 30];
    const base = [centerX, rimY];

    svg += strokePath(`M${base[0]} ${base[1]}Q${num(control[0])} ${num(control[1])} ${num(tip[0])} ${num(tip[1])}`, theme.stem, 1);

    for (let leafIndex = 0; leafIndex < 7; leafIndex++) {
      const progress = 0.4 + leafIndex * 0.1;
      const [x, y] = alongCurve(base, control, tip, progress);
      const [nextX, nextY] = alongCurve(base, control, tip, progress + 0.01);
      const leafAngle = (Math.atan2(nextY - y, nextX - x) * 180) / Math.PI + (leafIndex % 2 ? 50 : -50);
      const color = leafIndex % 2 ? theme.leaf : theme.stem;

      // Every other sprig has round eucalyptus leaves, the rest have long ones.
      if (sprigIndex % 2) {
        svg += `<ellipse cx="${num(x)}" cy="${num(y)}" rx="4.4" ry="3.2" fill="${color}"/>`;
      } else {
        svg += `<ellipse cx="${num(x)}" cy="${num(y)}" rx="5" ry="2" fill="${color}" transform="rotate(${num(leafAngle)} ${num(x)} ${num(y)})"/>`;
      }
    }
  });

  // Stems down into the teapot, then the flower heads on top.
  for (const head of heads) {
    const stemPath = `M${num(head.x)} ${num(head.y)}Q${num((head.x + centerX) / 2)} ${num(head.y + 40)} ${num(centerX + (head.x - centerX) * 0.08)} ${rimY + 4}`;
    svg += strokePath(stemPath, theme.stem, 1.4);
  }

  for (const head of heads) {
    const palette = palettes.get(head.group.key)!;
    const swayOffset = Math.floor(random() * 5);

    svg += `<g transform="translate(${num(head.x)} ${num(head.y)}) rotate(${num(head.tilt)})">` +
      `<g class="bouquet-sway delay-${swayOffset}">${bouquetHead(head.group.species, head.radius, palette)}</g></g>`;
  }

  // Baby's breath around the edges.
  for (let cluster = 0; cluster < 7; cluster++) {
    const angle = -2.7 + cluster * 0.9 + (random() - 0.5) * 0.3;
    const x = centerX + Math.cos(angle) * spreadX * 1.08;
    const y = centerY + Math.sin(angle) * spreadY * 1.05;

    for (let dot = 0; dot < 5; dot++) {
      const dotX = x + (random() - 0.5) * 9;
      const dotY = y + (random() - 0.5) * 7;

      svg += `<circle cx="${num(dotX)}" cy="${num(dotY)}" r="1.4" fill="#fffaf2"/>`;
    }
  }

  // Teapot: spout, handle, round body, painted dots and the opening.
  const potY = 224;

  svg += `<path d="M${centerX - 24} ${potY + 4}Q${centerX - 42} ${potY + 2} ${centerX - 44} ${potY - 16}L${centerX - 38} ${potY - 18}Q${centerX - 36} ${potY - 4} ${centerX - 22} ${potY - 6}Z" fill="${theme.ceramicShade}"/>`;
  svg += `<path d="M${centerX + 24} ${potY - 12}C${centerX + 46} ${potY - 16} ${centerX + 46} ${potY + 16} ${centerX + 22} ${potY + 12}" fill="none" stroke="${theme.ceramicShade}" stroke-width="5" stroke-linecap="round"/>`;
  svg += `<ellipse cx="${centerX}" cy="${potY + 26}" rx="22" ry="5" fill="${theme.ceramicShade}"/>`;
  svg += `<ellipse cx="${centerX}" cy="${potY}" rx="29" ry="26" fill="${theme.ceramicShade}"/>`;
  svg += `<ellipse cx="${centerX - 3}" cy="${potY - 2}" rx="25.5" ry="23.5" fill="${theme.ceramic}"/>`;
  svg += `<ellipse cx="${centerX - 12}" cy="${potY - 12}" rx="8" ry="5" fill="${theme.ceramicLight}" transform="rotate(-30 ${centerX - 12} ${potY - 12})"/>`;

  for (let index = 0; index < 7; index++) {
    const x = centerX - 21 + index * 7;
    const y = num(potY + 6 + Math.sin(index) * 1.5);

    svg += `<circle cx="${x}" cy="${y}" r="2.2" fill="${theme.blossomMid}"/><circle cx="${x}" cy="${y}" r=".8" fill="${theme.glow}"/>`;
  }

  svg += `<ellipse cx="${centerX}" cy="${rimY + 2}" rx="15" ry="4.5" fill="${theme.ceramicShade}"/>`;
  svg += `<ellipse cx="${centerX}" cy="${rimY + 1}" rx="11" ry="2.8" fill="${theme.shadow}" opacity=".45"/>`;

  return svg;
}

/** The parchment card listing each flower, its language and percentage. */
function legend(model: Model, palettes: Map<string, Palette>, theme: Theme): string {
  const left = 800;
  const top = 320;
  const width = 186;
  const height = 46 + model.groups.length * 19.5;

  let svg = `<rect x="${left + 2}" y="${top + 4}" width="${width}" height="${height}" rx="8" fill="${theme.shadow}" opacity=".18"/>`;

  svg += `<path d="M${left} ${top + 6}Q${left} ${top} ${left + 6} ${top}H${left + width - 6}Q${left + width} ${top} ${left + width} ${top + 6}` +
    `V${top + height - 6}Q${left + width} ${top + height} ${left + width - 6} ${top + height}H${left + 6}Q${left} ${top + height} ${left} ${top + height - 6}Z" ` +
    `fill="${theme.parchment}" stroke="${theme.parchmentEdge}" stroke-width="1.2"/>`;
  svg += `<rect x="${left + 5}" y="${top + 5}" width="${width - 10}" height="${height - 10}" rx="5" fill="none" stroke="${theme.parchmentEdge}" stroke-width=".6" stroke-dasharray="2 2"/>`;
  svg += `<text x="${left + width / 2}" y="${top + 24}" font-size="12" text-anchor="middle" class="ink bold">language bouquet</text>`;

  model.groups.forEach((group, index) => {
    const y = top + 46 + index * 19.5;
    const palette = palettes.get(group.key)!;
    const name = group.label.length > 11 ? group.label.slice(0, 10) + '…' : group.label;
    const percent = group.wholePercent ? group.wholePercent : '<1';

    svg += `<g transform="translate(${left + 16} ${y - 3.5})">${group.species.draw(6, palette)}</g>`;
    svg += `<text x="${left + 28}" y="${y}" font-size="9.5"><tspan class="ink-muted italic">${escapeXml(group.species.name)}</tspan><tspan class="ink-muted"> · </tspan><tspan class="ink bold">${escapeXml(name)}</tspan></text>`;
    svg += `<text x="${left + width - 12}" y="${y}" font-size="9.5" text-anchor="end" class="ink-muted">${percent}%</text>`;
  });

  return svg;
}

/** The "garden journal" stats, on a little wooden sign. */
function statsSign(model: Model, theme: Theme, selection: GardenTheme): string {
  const totals = model.data.totals;
  const left = 24;
  const width = 300;
  const bottom = 542;

  // One plank per row of text, so nothing sits on the gaps between boards:
  // the heading, the two rows of stats, and a slim board for the activity line.
  const plankHeights = [34, 46, 46, 26];
  const height = plankHeights.reduce((sum, plankHeight) => sum + plankHeight, 0);
  const top = bottom - height;

  const plankTops: number[] = [];
  let nextTop = top;

  for (const plankHeight of plankHeights) {
    plankTops.push(nextTop);
    nextTop += plankHeight;
  }

  let svg = `<rect x="${left + 3}" y="${top + 5}" width="${width}" height="${height}" rx="8" fill="${theme.shadow}" opacity=".25"/>`;

  plankHeights.forEach((plankHeight, index) => {
    const plankTop = plankTops[index];
    const isEdge = index === 0 || index === plankHeights.length - 1;
    const color = index % 2 ? theme.woodMid : theme.woodLight;

    svg += `<rect x="${left}" y="${plankTop}" width="${width}" height="${plankHeight - 1.5}" rx="${isEdge ? 7 : 3}" fill="${color}"/>`;
    svg += `<rect x="${left}" y="${plankTop + plankHeight - 5}" width="${width}" height="3.5" rx="1.5" fill="${theme.woodDark}" opacity=".55"/>`;
    svg += strokePath(`M${left + 8} ${plankTop + 2}H${left + width - 8}`, '#fff', 0.8, ' opacity=".18"');
  });

  // Nails in the corners.
  const nails = [[left + 8, top + 8], [left + width - 8, top + 8], [left + 8, top + height - 9], [left + width - 8, top + height - 9]];

  for (const [x, y] of nails) {
    svg += `<circle cx="${x}" cy="${y}" r="2" fill="${theme.stoneDark}"/><circle cx="${x - 0.5}" cy="${y - 0.5}" r=".8" fill="${theme.stoneLight}"/>`;
  }

  // Heading plank.
  const headingY = plankTops[0] + 21;

  svg += `<text x="${left + 18}" y="${headingY}" font-size="12" class="sign-text bold">garden journal</text>`;
  svg += `<text x="${left + width - 18}" y="${headingY}" font-size="9.5" text-anchor="end" class="sign-muted">${formatDate(model.data.from)} – ${formatDate(model.data.to)}</text>`;

  // The two stat planks: a big number with a small label under it, centred on the board.
  const stat = (x: number, plankTop: number, value: string, label: string) =>
    `<text x="${x}" y="${plankTop + 20}" font-size="15" class="sign-text bold">${value}</text>` +
    `<text x="${x}" y="${plankTop + 32}" font-size="8" class="sign-muted" letter-spacing=".6">${label}</text>`;
  const days = (count: number) => `${formatNumber(count)} ${count === 1 ? 'day' : 'days'}`;
  const columns = [left + 18, left + 112, left + 206];

  svg += stat(columns[0], plankTops[1], formatNumber(totals.contributions), 'CONTRIBUTIONS');
  svg += stat(columns[1], plankTops[1], days(model.currentStreak), 'CURRENT STREAK');
  svg += stat(columns[2], plankTops[1], days(model.longestStreak), 'LONGEST STREAK');
  svg += stat(columns[0], plankTops[2], formatNumber(totals.stars), selection === 'halloween' ? 'STARS · BATS' : 'STARS · BUTTERFLIES');
  svg += stat(columns[1], plankTops[2], formatNumber(totals.forks), selection === 'halloween' ? 'FORKS · GHOSTS' : 'FORKS · BEES');
  svg += stat(columns[2], plankTops[2], formatNumber(totals.repos), 'REPOSITORIES');

  // Slim activity plank.
  const activityParts = [
    `${formatNumber(totals.commits)} commits`,
    `${formatNumber(totals.pullRequests)} PRs`,
    `${formatNumber(totals.issues)} issues`,
    `${formatNumber(totals.reviews)} reviews`,
  ];

  if (totals.privateContributions > 0) {
    activityParts.push(`${formatNumber(totals.privateContributions)} private`);
  }

  const activity = activityParts.join(' · ');
  svg += `<text x="${left + 18}" y="${plankTops[3] + 16.5}" font-size="8.5" class="sign-muted">${activity}</text>`;

  return svg;
}

export function renderGarden(model: Model, config: GardenConfig, mode: GardenMode, now = new Date()): string {
  const selection = pickTheme(now, config);
  const theme = seasonalPalette(config.themes[mode], selection, mode);
  const palettes = new Map(model.groups.map((group) => [group.key, pastel(group.color, theme)] as const));
  const data = model.data;

  const owner = data.name || data.login;
  const title = config.title ?? `${owner}’s garden`;
  const languageList = model.groups.map((group) => `${group.label} ${group.wholePercent}% (${group.species.name})`).join(', ');
  const description = `${formatNumber(data.totals.contributions)} contributions from ${formatDate(data.from)} to ${formatDate(data.to)}, grown as an isometric garden. ` +
    `Languages: ${languageList}.` +
    (selection === 'classic' ? '' : ` Scenery: ${selection}.`);
  const hasTree = data.totals.contributions >= config.milestones.tree;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-labelledby="garden-title garden-description">`,
    `<title id="garden-title">${escapeXml(title)}</title><desc id="garden-description">${escapeXml(description)}</desc>`,
    `<style>${styles(theme)}</style>`,
    defs(model, palettes, theme, selection),
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#background)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#background-glow)"/>`,
    garden(model, palettes, config, theme, selection),
    `<text x="505" y="44" font-size="21" text-anchor="middle" class="title bold">${escapeXml(title)}</text>`,
    `<text x="505" y="64" font-size="11" text-anchor="middle" class="muted">${formatNumber(data.totals.contributions)} contributions in the last year · each tile is a day</text>`,
    bouquet(model, palettes, theme),
    legend(model, palettes, theme),
    statsSign(model, theme, selection),
    fallingPetals(theme, hasTree, selection),
    `</svg>`,
  ].join('\n');
}
