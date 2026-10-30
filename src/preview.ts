import { exec } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { findToken, generate } from './index.js';

// Generates the SVGs into ./preview (git-ignored) and opens a page showing them all.
const useDemoData = process.argv.includes('--demo') || !findToken();

if (useDemoData) {
  console.log('No token found (or --demo passed), previewing with sample data.');
}

const outDir = resolve('preview');
await generate({ demo: useDemoData, outDir });

const page = resolve(outDir, 'index.html');

writeFileSync(page, `<!doctype html><meta charset="utf-8"><title>Garden preview</title>
<style>
  body { margin: 0; font: 14px system-ui, sans-serif; background: #f6f8fa; color: #1f2328; }
  section { padding: 24px; }
  section.dark { background: #0d1117; color: #e6edf3; }
  h2 { font-weight: 600; font-size: 14px; margin: 0 0 12px; }
  img { width: 100%; max-width: 1000px; display: block; border-radius: 6px; }
</style>
<section><h2>Your look (garden.svg)</h2><img src="garden.svg"></section>
<section><h2>Light (garden-light.svg)</h2><img src="garden-light.svg"></section>
<section class="dark"><h2>Dark (garden-dark.svg)</h2><img src="garden-dark.svg"></section>
<section>
  <h2>&lt;picture&gt;, follows your OS theme like GitHub does</h2>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="garden-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="garden-light.svg">
    <img src="garden-light.svg" alt="garden">
  </picture>
</section>`);

const openCommand = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';

exec(`${openCommand} "${page}"`);
console.log(`Opened ${page}`);
