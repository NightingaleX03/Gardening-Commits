export type Level = 0 | 1 | 2 | 3 | 4;

export interface Day {
  date: string; // YYYY-MM-DD
  count: number;
  level: Level; // GitHub's quartile bucket
  weekday: number; // 0 = Sunday
  week: number; // column index in the calendar
}

export interface LanguageStat {
  name: string;
  color: string | null;
  weight: number;
}

export interface Totals {
  contributions: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  repos: number;
  stars: number;
  forks: number;
}

export interface GardenData {
  login: string;
  name: string | null;
  from: string;
  to: string;
  days: Day[];
  /** date -> language -> commit count, from commit contributions by repository */
  dayLanguages: Record<string, Record<string, number>>;
  languages: LanguageStat[];
  totals: Totals;
}

/** Petal palette derived from a language color, plus the greens it sits on. */
export interface Palette {
  petal: string;
  petalShade: string; // darker petals and outlines
  petalLight: string; // highlights
  stem: string;
  leaf: string;
}

/** light = sunny afternoon, dark = cozy evening, black = GitHub's dark-mode black. */
export type GardenMode = 'light' | 'dark' | 'black';

export interface Theme {
  // Background behind the floating island
  bgTop: string;
  bgBottom: string;
  bgGlow: string;
  // Every object uses three tones: light (lit top), mid (lit side), dark (shadow side).
  grassLight: string;
  grassMid: string;
  grassDark: string;
  bushLight: string;
  bushMid: string;
  bushDark: string;
  soilLight: string;
  soilMid: string;
  soilDark: string;
  woodLight: string;
  woodMid: string;
  woodDark: string;
  stoneLight: string;
  stoneMid: string;
  stoneDark: string;
  roofLight: string;
  roofMid: string;
  roofDark: string;
  blossomLight: string;
  blossomMid: string;
  blossomDark: string;
  ceramicLight: string;
  ceramic: string;
  ceramicShade: string;
  wall: string;
  wallShade: string;
  /** flower stems and leaves in the bouquet */
  stem: string;
  leaf: string;
  /** lantern + window light, and unlit glass */
  glow: string;
  glassOff: string;
  shadow: string;
  text: string;
  textMuted: string;
  parchment: string;
  parchmentEdge: string;
  ink: string;
  inkMuted: string;
  signText: string;
  signMuted: string;
  /** 0..1 lightness and saturation for the pastel petal colors */
  petalLightness: number;
  petalSaturation: number;
  /** evening mode: lit lanterns/windows, fireflies */
  night: boolean;
}

export interface GardenConfig {
  username: string;
  /** Heading text. Defaults to "<name>'s garden". */
  title?: string;
  outputDir: string;
  /**
   * Which look garden.svg gets. "sun" is light while the sun is up where you live and dark after
   * sunset (needs latitude/longitude); "light" and "dark" always use that look.
   */
  look: { mode: 'sun' | GardenMode; latitude?: number; longitude?: number };
  /** "repos": language bytes across your own repos. "commits": commits in the last year by repo language. */
  languageSource: 'repos' | 'commits';
  /** Count private repos for languages/stars (needs a PAT with repo scope). */
  includePrivate: boolean;
  excludeLanguages: string[];
  /** Language name -> flower species id (see src/flowers.ts). */
  species: Record<string, string>;
  /** Species handed out, in order, to languages not in the map above. */
  speciesPool: string[];
  otherSpecies: string;
  /** Override a language's GitHub color. */
  languageColors: Record<string, string>;
  otherColor: string;
  bouquet: { stems: number; minPercent: number; maxGroups: number };
  /** Total contributions in the year needed to unlock each piece of scenery. */
  milestones: {
    fence: number;
    lanterns: number;
    tree: number;
    bench: number;
    /** The cottage upgrades as you go: starter → cozy (porch, roses, smoke) → storybook (second storey, dormer). */
    cottage: { starter: number; cozy: number; storybook: number };
  };
  streakMinDays: number;
  critters: { maxButterflies: number; maxBees: number };
  themes: Record<GardenMode, Theme>;
}
