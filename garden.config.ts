import type { GardenConfig } from './src/types.js';

// Everything you might want to tweak lives here.
export const config: GardenConfig = {
  // Your GitHub login. In GitHub Actions this is filled in automatically
  // from the repo owner (GARDEN_USERNAME), so you only need it for local runs.
  username: (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GARDEN_USERNAME
    || (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_REPOSITORY_OWNER
    || 'YOUR_GITHUB_USERNAME',
  // title: 'my little garden',
  outputDir: 'garden',

  // How garden/garden.svg looks:
  //   'sun'   - light during the day and dark at night where you live
  //   'light' - always the sunny afternoon
  //   'dark'  - always the cozy evening
  //   'black' - the cozy evening on GitHub's dark-mode black
  // For 'sun', put roughly where you live. A nearby city is plenty: one decimal
  // place is about 10 km, so you're not posting your exact address in a public repo.
  look: {
    mode: 'light',
    latitude: undefined, // e.g. 40.7
    longitude: undefined, // e.g. -74.0
  },
  // Opt in with 'auto', or pin spring, summer, fall, winter, halloween or christmas.
  // Auto: meteorological seasons, Halloween Oct 25-31, Christmas Dec 20-26 (UTC).
  theme: 'classic',
  hemisphere: 'north',

  languageSource: 'repos',
  includePrivate: false,
  excludeLanguages: ['Jupyter Notebook'],

  // Language -> flower. Species ids: hydrangea, sunflower, iris, rose, forgetmenot,
  // tulip, cosmos, poppy, daisy, lavender, peony, lily, bluebell, dahlia,
  // camellia, anemone, marigold, wildflower (reserved for "other").
  // The 17 most common languages each get their own flower; any language not
  // listed gets the next unused species from speciesPool.
  species: {
    TypeScript: 'hydrangea',
    JavaScript: 'sunflower',
    Python: 'iris',
    Rust: 'rose',
    Go: 'forgetmenot',
    HTML: 'tulip',
    CSS: 'cosmos',
    Java: 'poppy',
    C: 'daisy',
    'C++': 'dahlia',
    'C#': 'camellia',
    Ruby: 'peony',
    PHP: 'lavender',
    Swift: 'marigold',
    Kotlin: 'anemone',
    Shell: 'lily',
    Dart: 'bluebell',
  },
  speciesPool: ['daisy', 'lavender', 'peony', 'lily', 'bluebell', 'dahlia', 'camellia', 'anemone', 'marigold',
    'hydrangea', 'sunflower', 'iris', 'rose', 'forgetmenot', 'tulip', 'cosmos', 'poppy'],
  otherSpecies: 'wildflower',

  // Override a language's GitHub color. C's official color is plain grey,
  // which has no hue to soften, so it gets a muted lilac instead.
  languageColors: { C: '#8c7b9c' },
  otherColor: '#c7b8e0',

  bouquet: {
    stems: 15, // total stems in the bouquet (12–20 looks best)
    minPercent: 3, // languages below this are tied in as "other" wildflowers
    maxGroups: 8, // at most 8 languages fit in the legend, plus "other"
  },

  // Total contributions in the year needed to unlock each piece of scenery.
  milestones: {
    fence: 100, // wooden picket fence along the back
    lanterns: 250, // garden lanterns along the front
    tree: 250, // big cherry blossom tree
    bench: 1000, // wooden bench by the fence
    cottage: {
      starter: 100, // little cottage with warm-lit windows, there from the start
      cozy: 1000, // + porch, climbing roses, chimney smoke
      storybook: 2000, // + half-timbered second storey, roof dormer, attic window
    },
  },

  streakMinDays: 7,
  critters: { maxButterflies: 12, maxBees: 8 },

  themes: {
    // Sunny afternoon
    light: {
      bgTop: '#fcf1e4',
      bgBottom: '#f6dcc8',
      bgGlow: '#fff8ee',
      grassLight: '#a9ca6c',
      grassMid: '#8db255',
      grassDark: '#6e9a44',
      bushLight: '#9cc25f',
      bushMid: '#6e9a44',
      bushDark: '#4e7a33',
      soilLight: '#a0663a',
      soilMid: '#86522e',
      soilDark: '#6a3f24',
      woodLight: '#c58b57',
      woodMid: '#a0663a',
      woodDark: '#7a4a2b',
      stoneLight: '#d3c7ba',
      stoneMid: '#b8a99a',
      stoneDark: '#8e8173',
      roofLight: '#b8704a',
      roofMid: '#9a5637',
      roofDark: '#73402a',
      blossomLight: '#fbd3e0',
      blossomMid: '#f4a7c0',
      blossomDark: '#e87fa3',
      ceramicLight: '#fffaf2',
      ceramic: '#f1e2d0',
      ceramicShade: '#d6bfa6',
      wall: '#f3e3c3',
      wallShade: '#d9c29c',
      stem: '#6e9a44',
      leaf: '#8db255',
      glow: '#ffd27a',
      glassOff: '#e4e6d8',
      shadow: '#5a3a22',
      text: '#5a3e2b',
      textMuted: '#9a7a60',
      parchment: '#fbf1dd',
      parchmentEdge: '#e3cda6',
      ink: '#5a3e2b',
      inkMuted: '#9a7a60',
      signText: '#fff4de',
      signMuted: '#f0d6b4',
      petalLightness: 0.74,
      petalSaturation: 0.75,
      night: false,
    },
    // Cozy evening
    dark: {
      bgTop: '#2b221e',
      bgBottom: '#1b1513',
      bgGlow: '#3b2d26',
      grassLight: '#728f4b',
      grassMid: '#5d7a3d',
      grassDark: '#47612f',
      bushLight: '#6f8f47',
      bushMid: '#4f6e35',
      bushDark: '#354d24',
      soilLight: '#7d4f2f',
      soilMid: '#664027',
      soilDark: '#4b2e1c',
      woodLight: '#9b6a43',
      woodMid: '#7e5232',
      woodDark: '#5a3822',
      stoneLight: '#a59a8c',
      stoneMid: '#887d70',
      stoneDark: '#665d53',
      roofLight: '#94593b',
      roofMid: '#7a4630',
      roofDark: '#583222',
      blossomLight: '#ecbccd',
      blossomMid: '#d991ab',
      blossomDark: '#bf6b8b',
      ceramicLight: '#e9dccb',
      ceramic: '#cdbba6',
      ceramicShade: '#a99580',
      wall: '#e0caa2',
      wallShade: '#b39c78',
      stem: '#4f6e35',
      leaf: '#6f8f47',
      glow: '#ffd27a',
      glassOff: '#5d5a52',
      shadow: '#0c0807',
      text: '#f3e3c3',
      textMuted: '#c2a88c',
      parchment: '#eadcc0',
      parchmentEdge: '#b99e78',
      ink: '#4a3324',
      inkMuted: '#86684f',
      signText: '#fbe9cc',
      signMuted: '#d9bc98',
      petalLightness: 0.7,
      petalSaturation: 0.66,
      night: true,
    },
    // Cozy evening on a black GitHub background
    black: {
      bgTop: '#0d1117',
      bgBottom: '#0d1117',
      bgGlow: '#1b2733',
      grassLight: '#728f4b',
      grassMid: '#5d7a3d',
      grassDark: '#47612f',
      bushLight: '#6f8f47',
      bushMid: '#4f6e35',
      bushDark: '#354d24',
      soilLight: '#7d4f2f',
      soilMid: '#664027',
      soilDark: '#4b2e1c',
      woodLight: '#9b6a43',
      woodMid: '#7e5232',
      woodDark: '#5a3822',
      stoneLight: '#a59a8c',
      stoneMid: '#887d70',
      stoneDark: '#665d53',
      roofLight: '#94593b',
      roofMid: '#7a4630',
      roofDark: '#583222',
      blossomLight: '#ecbccd',
      blossomMid: '#d991ab',
      blossomDark: '#bf6b8b',
      ceramicLight: '#e9dccb',
      ceramic: '#cdbba6',
      ceramicShade: '#a99580',
      wall: '#e0caa2',
      wallShade: '#b39c78',
      stem: '#4f6e35',
      leaf: '#6f8f47',
      glow: '#ffd27a',
      glassOff: '#5d5a52',
      shadow: '#0c0807',
      text: '#f3e3c3',
      textMuted: '#c2a88c',
      parchment: '#eadcc0',
      parchmentEdge: '#b99e78',
      ink: '#4a3324',
      inkMuted: '#86684f',
      signText: '#fbe9cc',
      signMuted: '#d9bc98',
      petalLightness: 0.7,
      petalSaturation: 0.66,
      night: true,
    },
  },
};
