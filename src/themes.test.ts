import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { config } from '../garden.config.js';
import { demoData } from './demo.js';
import { buildModel } from './model.js';
import { renderGarden } from './render.js';
import { loadConfig } from './settings.js';
import { pine } from './seasonal-art.js';
import { pickTheme, seasonalPalette, THEME_SELECTIONS } from './themes.js';
import type { GardenMode, GardenTheme, Hemisphere } from './types.js';

const date = (month: number, day = 1) => new Date(Date.UTC(2026, month - 1, day, 12));
const auto = (month: number, day = 1, hemisphere: Hemisphere = 'north') =>
  pickTheme(date(month, day), { theme: 'auto', hemisphere });

test('classic is the default and manual themes override seasons and holidays', () => {
  assert.equal(config.theme, 'classic');
  for (const theme of THEME_SELECTIONS) {
    if (theme === 'auto') {
      continue;
    }
    for (const hemisphere of ['north', 'south'] as const) {
      assert.equal(pickTheme(date(10, 31), { theme, hemisphere }), theme);
      assert.equal(pickTheme(date(12, 25), { theme, hemisphere }), theme);
    }
  }
});

test('meteorological seasons use all twelve months and invert in the south', () => {
  const north = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
  const south = ['summer', 'summer', 'fall', 'fall', 'fall', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer'];
  north.forEach((season, index) => assert.equal(auto(index + 1), season));
  south.forEach((season, index) => assert.equal(auto(index + 1, 1, 'south'), season));
});

test('holiday windows are inclusive, end correctly, and do not invert', () => {
  for (const hemisphere of ['north', 'south'] as const) {
    assert.equal(auto(10, 24, hemisphere), hemisphere === 'north' ? 'fall' : 'spring');
    for (let day = 25; day <= 31; day++) {
      assert.equal(auto(10, day, hemisphere), 'halloween');
    }
    assert.equal(auto(11, 1, hemisphere), hemisphere === 'north' ? 'fall' : 'spring');
    assert.equal(auto(12, 19, hemisphere), hemisphere === 'north' ? 'winter' : 'summer');
    for (let day = 20; day <= 26; day++) {
      assert.equal(auto(12, day, hemisphere), 'christmas');
    }
    assert.equal(auto(12, 27, hemisphere), hemisphere === 'north' ? 'winter' : 'summer');
  }
  assert.equal(pickTheme(new Date('2026-10-25T00:01:00Z'), { theme: 'auto', hemisphere: 'north' }), 'halloween');
  assert.equal(pickTheme(new Date('2026-12-27T00:00:00Z'), { theme: 'auto', hemisphere: 'north' }), 'winter');
  assert.throws(() => pickTheme(new Date('invalid'), { theme: 'auto', hemisphere: 'north' }), /invalid date/);
});

const data = demoData();
const model = buildModel(data, config);
const modes: GardenMode[] = ['light', 'dark', 'black'];
const themes = THEME_SELECTIONS.filter((theme): theme is GardenTheme => theme !== 'auto');

test('all themes render deterministically in every look without mutating config or data', () => {
  const before = JSON.stringify({ config, data });
  for (const theme of themes) {
    for (const mode of modes) {
      const settings = { ...config, theme };
      const svg = renderGarden(model, settings, mode, date(10, 31));
      assert.equal(svg, renderGarden(model, settings, mode, date(10, 31)));
      assert.ok(svg.startsWith('<svg '));
      assert.ok(svg.endsWith('</svg>'));
      assert.doesNotMatch(svg, /NaN|undefined/);
      assert.match(svg, /prefers-reduced-motion: reduce/);
      for (const group of model.groups) {
        assert.ok(svg.includes(`${group.label} ${group.wholePercent}%`));
      }
      if (mode === 'black') {
        assert.equal(seasonalPalette(config.themes.black, theme, mode).bgTop, '#0d1117');
        assert.equal(seasonalPalette(config.themes.black, theme, mode).bgBottom, '#0d1117');
      }
    }
  }
  assert.equal(JSON.stringify({ config, data }), before);
});

test('theme artwork includes requested motifs and removes inappropriate cherry petals', () => {
  const render = (theme: GardenTheme) => renderGarden(model, { ...config, theme }, 'light');
  assert.match(render('fall'), /#dc793c/);
  assert.match(render('fall'), /data-decoration="autumn-leaf"/);
  assert.match(render('winter'), /data-decoration="pine"/);
  assert.match(render('winter'), /data-decoration="snow"/);
  assert.match(render('christmas'), /data-decoration="christmas-tree"/);
  assert.match(render('christmas'), /data-decoration="candy-cane"/);
  assert.match(render('christmas'), /data-decoration="snow"/);
  const halloween = render('halloween');
  for (const decoration of ['dead-tree', 'tombstone', 'bat', 'ghost']) {
    assert.ok(halloween.includes(`data-decoration="${decoration}"`));
  }
  assert.match(halloween, /STARS · BATS/);
  assert.match(halloween, /FORKS · GHOSTS/);
  for (const theme of ['winter', 'christmas', 'halloween', 'summer'] as const) {
    assert.doesNotMatch(render(theme), /<use href="#petal"/);
  }
});

test('winter and Christmas pines share rounded branch snow while keeping foliage and ornaments', () => {
  for (const mode of modes) {
    const palette = seasonalPalette(config.themes[mode], 'winter', mode);
    for (const festive of [false, true]) {
      const art = pine(palette, festive);
      assert.equal((art.match(/data-decoration="branch-snow"/g) ?? []).length, 3);
      assert.equal((art.match(/<path d="M[^"]*Q[^"]*"\/>/g) ?? []).length, 9);
      assert.match(art, /fill="#315e50"/);
      assert.match(art, /fill="#497e66"/);
      assert.ok(art.includes(`fill="${palette.grassLight}"`));
      if (festive) {
        assert.ok(art.indexOf('fill="#d64b4b"') > art.lastIndexOf('data-decoration="branch-snow"'));
      }
    }
  }
});

test('holiday decorations work for empty gardens without unlocking milestone scenery', () => {
  const empty = { ...data, days: [], languages: [], totals: { ...data.totals, contributions: 0, stars: 0, forks: 0 } };
  const emptyModel = buildModel(empty, config);
  for (const theme of ['halloween', 'christmas', 'winter'] as const) {
    const svg = renderGarden(emptyModel, { ...config, theme }, 'black');
    assert.match(svg, /data-decoration=/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
  const classic = renderGarden(emptyModel, config, 'light');
  assert.doesNotMatch(classic, /data-decoration=/);
});

test('automatic selection matches manual rendering with a fixed date', () => {
  for (const mode of modes) {
    assert.equal(
      renderGarden(model, { ...config, theme: 'auto' }, mode, date(10, 31)),
      renderGarden(model, { ...config, theme: 'halloween' }, mode, date(10, 31)),
    );
  }
});

test('workflow options override JSON, blanks use JSON, and invalid settings fail explicitly', () => {
  const names = ['GARDEN_CONFIG', 'GARDEN_THEME', 'GARDEN_HEMISPHERE'] as const;
  const saved = names.map((name) => process.env[name]);
  const directory = mkdtempSync(join(tmpdir(), 'garden-themes-'));
  const path = join(directory, 'garden.json');
  try {
    writeFileSync(path, JSON.stringify({ theme: 'winter', hemisphere: 'south' }));
    process.env.GARDEN_CONFIG = path;
    process.env.GARDEN_THEME = '';
    process.env.GARDEN_HEMISPHERE = '';
    assert.equal(loadConfig().theme, 'winter');
    assert.equal(loadConfig().hemisphere, 'south');
    process.env.GARDEN_THEME = ' halloween ';
    process.env.GARDEN_HEMISPHERE = ' north ';
    assert.equal(loadConfig().theme, 'halloween');
    assert.equal(loadConfig().hemisphere, 'north');
    process.env.GARDEN_THEME = 'typo';
    assert.throws(() => loadConfig(), /theme should be/);
    process.env.GARDEN_THEME = '';
    process.env.GARDEN_HEMISPHERE = 'typo';
    assert.throws(() => loadConfig(), /hemisphere should be/);
    process.env.GARDEN_HEMISPHERE = '';
    writeFileSync(path, JSON.stringify({ theme: 'typo' }));
    assert.throws(() => loadConfig(), /theme should be/);
    writeFileSync(path, JSON.stringify({ hemisphere: 'typo' }));
    assert.throws(() => loadConfig(), /hemisphere should be/);
  } finally {
    names.forEach((name, index) => {
      if (saved[index] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[index];
      }
    });
    rmSync(path);
    rmdirSync(directory);
  }
});
