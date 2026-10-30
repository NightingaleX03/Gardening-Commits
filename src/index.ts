import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config } from '../garden.config.js';
import { demoData } from './demo.js';
import { fetchGardenData } from './github.js';
import { buildModel } from './model.js';
import { renderGarden } from './render.js';
import { sunIsUp } from './sun.js';

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
export function pickLook(now: Date): 'light' | 'dark' {
  const { mode, latitude, longitude } = config.look;

  if (mode !== 'sun') {
    return mode;
  }

  if (latitude == null || longitude == null) {
    console.warn('look.mode is "sun" but latitude/longitude are not set in garden.config.ts, using light.');
    return 'light';
  }

  return sunIsUp(now, latitude, longitude) ? 'light' : 'dark';
}

export async function generate(options: { demo?: boolean; outDir?: string } = {}): Promise<string[]> {
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
      throw new Error('Set your username in garden.config.ts or GARDEN_USERNAME.');
    }

    console.log(`Fetching contributions for ${config.username}…`);
    data = await fetchGardenData(config.username, token, config);
  }

  const model = buildModel(data, config);
  mkdirSync(outDir, { recursive: true });

  // One file per look, plus garden.svg in whichever look the config picks.
  const files: string[] = [];
  const svgs = { light: '', dark: '' };

  for (const mode of ['light', 'dark'] as const) {
    const svg = renderGarden(model, config, mode);
    const file = join(outDir, `garden-${mode}.svg`);

    svgs[mode] = svg;
    writeFileSync(file, svg);
    files.push(file);
    console.log(`Wrote ${file} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
  }

  const look = pickLook(new Date());
  const lookFile = join(outDir, 'garden.svg');

  writeFileSync(lookFile, svgs[look]);
  files.push(lookFile);
  console.log(`Wrote ${lookFile} (${look}, look mode "${config.look.mode}")`);

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
