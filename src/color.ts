import type { Palette, Theme } from './types.js';
import { hashString } from './util.js';

type Hsl = [hue: number, saturation: number, lightness: number];

function hexToHsl(hex: string): Hsl {
  let digits = hex.replace('#', '');

  if (digits.length === 3) {
    digits = digits.split('').map((digit) => digit + digit).join('');
  }

  const red = parseInt(digits.slice(0, 2), 16) / 255;
  const green = parseInt(digits.slice(2, 4), 16) / 255;
  const blue = parseInt(digits.slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  // Greys have no hue.
  if (max === min) {
    return [0, 0, lightness];
  }

  const range = max - min;
  const saturation = lightness > 0.5 ? range / (2 - max - min) : range / (max + min);

  let hue: number;

  if (max === red) {
    hue = (green - blue) / range + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / range + 2;
  } else {
    hue = (red - green) / range + 4;
  }

  return [hue * 60, saturation, lightness];
}

function hslToHex([hue, saturation, lightness]: Hsl): string {
  saturation = Math.max(0, Math.min(1, saturation));
  lightness = Math.max(0, Math.min(1, lightness));

  const amount = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const position = (offset + hue / 30) % 12;

    return lightness - amount * Math.max(-1, Math.min(position - 3, Math.min(9 - position, 1)));
  };
  const toHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');

  return `#${toHex(channel(0))}${toHex(channel(8))}${toHex(channel(4))}`;
}

/** A stable color for languages GitHub doesn't have a color for. */
export function hashColor(name: string): string {
  return hslToHex([hashString(name) % 360, 0.55, 0.55]);
}

/** Soften an official language color into a pastel petal palette. */
export function pastel(hex: string, theme: Theme): Palette {
  const [hue, saturation] = hexToHsl(hex);

  const softSaturation = Math.min(0.85, Math.max(0.25, saturation)) * theme.petalSaturation;
  const lightness = theme.petalLightness;

  return {
    petal: hslToHex([hue, softSaturation, lightness]),
    petalShade: hslToHex([hue, Math.min(1, softSaturation * 1.1), lightness - 0.15]),
    petalLight: hslToHex([hue, softSaturation * 0.85, Math.min(0.94, lightness + 0.09)]),
    stem: theme.stem,
    leaf: theme.leaf,
  };
}
