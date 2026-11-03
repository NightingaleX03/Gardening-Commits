import type { GardenConfig, GardenMode, GardenTheme, Theme, ThemeSelection } from './types.js';

export const THEME_SELECTIONS: readonly ThemeSelection[] = [
  'classic', 'auto', 'spring', 'summer', 'fall', 'winter', 'halloween', 'christmas',
];

export function pickTheme(now: Date, config: Pick<GardenConfig, 'theme' | 'hemisphere'>): GardenTheme {
  if (config.theme !== 'auto') {
    return config.theme;
  }

  if (!Number.isFinite(now.getTime())) {
    throw new Error('Cannot select an automatic theme from an invalid date.');
  }

  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (month === 9 && day >= 25) {
    return 'halloween';
  }
  if (month === 11 && day >= 20 && day <= 26) {
    return 'christmas';
  }

  const season = Math.floor(((month + 1) % 12) / 3);
  return (config.hemisphere === 'south'
    ? ['summer', 'fall', 'winter', 'spring'] as const
    : ['winter', 'spring', 'summer', 'fall'] as const)[season];
}

/** Overlay scenery colors without changing language colors or the selected look. */
export function seasonalPalette(base: Theme, selection: GardenTheme, mode: GardenMode): Theme {
  if (selection === 'classic' || selection === 'spring') {
    return base;
  }

  let changes: Partial<Theme>;

  switch (selection) {
    case 'summer':
      changes = {
        blossomLight: '#b8d866', blossomMid: '#83b54b', blossomDark: '#4f8639',
        grassLight: '#bdd675', grassMid: '#92b650', grassDark: '#63883a',
      };
      break;
    case 'fall':
      changes = {
        grassLight: '#dcb76d', grassMid: '#bb8c4f', grassDark: '#91663e',
        bushLight: '#e7aa52', bushMid: '#c76b3c', bushDark: '#914535',
        blossomLight: '#f1b85c', blossomMid: '#dc793c', blossomDark: '#a53e32',
        leaf: '#bb753d',
      };
      break;
    case 'winter':
    case 'christmas':
      changes = {
        grassLight: '#f4fafc', grassMid: '#dbe9ef', grassDark: '#a4bfce',
        bushLight: '#b5cfd0', bushMid: '#527f75', bushDark: '#315b54',
        stoneLight: '#f2f7fa', stoneMid: '#c2d4df', stoneDark: '#8fa7b8',
        blossomLight: '#f4fafc', blossomMid: '#dbe9ef', blossomDark: '#a4bfce',
        roofLight: '#e6f0f5', roofMid: '#b0c9d6', roofDark: '#7995a6',
      };
      break;
    case 'halloween':
      changes = {
        grassLight: '#9b9662', grassMid: '#6f7247', grassDark: '#474d35',
        bushLight: '#aa794b', bushMid: '#795b44', bushDark: '#493b37',
        blossomLight: '#efb254', blossomMid: '#db7836', blossomDark: '#8f4936',
        woodLight: '#8d7969', woodMid: '#625349', woodDark: '#3d3332',
        glow: '#ffac42', roofLight: '#827085', roofMid: '#605067', roofDark: '#403645',
      };
      break;
  }

  if (base.night) {
    // Keep snow and foliage subdued at night, but leave the data legend untouched.
    changes = { ...changes, grassLight: selection === 'winter' || selection === 'christmas' ? '#b7ccd9' : changes.grassMid };
  }

  const backgrounds: Record<Exclude<GardenTheme, 'classic' | 'spring'>, readonly [string, string, string]> = {
    summer: ['#fff6dc', '#f1e4b7', '#fffae8'],
    fall: ['#fff0dd', '#ebc6a1', '#fff5e5'],
    winter: ['#eaf3fa', '#ccdfed', '#ffffff'],
    christmas: ['#eef5ef', '#cadfd9', '#fff9e7'],
    halloween: ['#eee5f2', '#c5b2ce', '#fff0d6'],
  };
  const background = backgrounds[selection];

  if (mode === 'light') {
    changes = { ...changes, bgTop: background[0], bgBottom: background[1], bgGlow: background[2] };
  } else if (mode === 'dark') {
    changes = {
      ...changes,
      bgTop: selection === 'halloween' ? '#282035' : '#202c38',
      bgBottom: selection === 'halloween' ? '#171321' : '#131d28',
      bgGlow: selection === 'halloween' ? '#513349' : '#344858',
    };
  }

  return { ...base, ...changes };
}
