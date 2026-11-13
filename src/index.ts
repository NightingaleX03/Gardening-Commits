import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { demoData } from './demo.js';
import { fetchGardenData } from './github.js';
import { buildModel } from './model.js';
import { renderGarden } from './render.js';
import { loadConfig } from './settings.js';
import { sunIsUp } from './sun.js';
import { pickTheme } from './themes.js';
import type { GardenConfig, GardenMode } from './types.js';

export function findToken(): string | undefined {
  const fromEnvironment = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (fromEnvironment) {
    return fromEnvironment;
  }

  // On your own computer, reuse the GitHub CLI login if there is one.
  try {
    const output = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

    return output || undefined;
  } catch {
    return undefined;
  }
}

/** Which look garden.svg should have right now. */
export function pickLook(now: Date, config: GardenConfig): GardenMode {
  const { mode, latitude, longitude } = config.look;

  if (mode !== 'sun') {
    return mode;
  }

  if (latitude == null || longitude == null) {
    console.warn('The look is "sun" but latitude and longitude are not set, so using light.');
    return 'light';
  }

  return sunIsUp(now, latitude, longitude) ? 'light' : 'dark';
}

export async function generate(options: { demo?: boolean; outDir?: string } = {}): Promise<string[]> {
  const config = loadConfig();
  const outDir = resolve(options.outDir ?? config.outputDir);

  let data;

  if (options.demo) {
    data = demoData();
  } else {
    const token = findToken();

    if (!token) {
      throw new Error('No GitHub token found. Set GITHUB_TOKEN (or run `gh auth login`), or use --demo.');
    }

    if (config.username === 'YOUR_GITHUB_USERNAME') {
      throw new Error('Set your username with the username option or GARDEN_USERNAME.');
    }

    console.log(`Fetching contributions for ${config.username}…`);
    data = await fetchGardenData(config.username, token, config);
  }

  const model = buildModel(data, config);
  mkdirSync(outDir, { recursive: true });

  // One file per look, plus garden.svg in whichever look the config picks.
  const files: string[] = [];
  const svgs = { light: '', dark: '', black: '' };
  const now = new Date();

  for (const mode of ['light', 'dark', 'black'] as const) {
    const svg = renderGarden(model, config, mode, now);
    const file = join(outDir, `garden-${mode}.svg`);

    svgs[mode] = svg;
    writeFileSync(file, svg);
    files.push(file);
    console.log(`Wrote ${file} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
  }

  const look = pickLook(now, config);
  const lookFile = join(outDir, 'garden.svg');

  writeFileSync(lookFile, svgs[look]);
  files.push(lookFile);
  console.log(`Wrote ${lookFile} (${look}, look mode "${config.look.mode}", theme "${pickTheme(now, config)}")`);

  const flowers = model.groups.map((group) => `${group.species.name}=${group.label} ${group.wholePercent}%×${group.stems}`);
  console.log(`   ${data.totals.contributions} contributions · ${flowers.join(', ')}`);

  return files;
}

// Run when called directly (npm run generate), not when imported by the preview.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');

  generate({ demo: args.includes('--demo'), outDir: outIndex >= 0 ? args[outIndex + 1] : undefined }).catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
