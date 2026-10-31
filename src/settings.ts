import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as defaults } from '../garden.config.js';
import type { GardenConfig } from './types.js';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copy `base` with `changes` laid on top. Nested objects are merged, everything else is replaced. */
function merge(base: PlainObject, changes: PlainObject): PlainObject {
  const result: PlainObject = { ...base };

  for (const [key, value] of Object.entries(changes)) {
    const existing = base[key];

    if (isPlainObject(value) && isPlainObject(existing)) {
      result[key] = merge(existing, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function readNumber(name: string, option: string): number | undefined {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${option} should be a number, but it was "${raw}".`);
  }

  return value;
}

/**
 * The settings for this run: the defaults from garden.config.ts, then your own
 * JSON file if you have one, then the options from your workflow on top.
 */
export function loadConfig(): GardenConfig {
  let settings = merge(defaults as unknown as PlainObject, {});

  const configPath = process.env.GARDEN_CONFIG?.trim();

  if (configPath) {
    const fullPath = resolve(configPath);

    if (!existsSync(fullPath)) {
      throw new Error(`Couldn't find the config file "${configPath}".`);
    }

    let fromFile: PlainObject;

    try {
      fromFile = JSON.parse(readFileSync(fullPath, 'utf8')) as PlainObject;
    } catch (error) {
      throw new Error(`The config file "${configPath}" isn't valid JSON: ${error instanceof Error ? error.message : error}`);
    }

    settings = merge(settings, fromFile);
  }

  const config = settings as unknown as GardenConfig;

  // Options from the workflow win over the file. An empty option means "not set".
  const look = process.env.GARDEN_LOOK?.trim();

  config.look = {
    mode: (look as GardenConfig['look']['mode'] | undefined) || config.look.mode,
    latitude: readNumber('GARDEN_LATITUDE', 'latitude') ?? config.look.latitude,
    longitude: readNumber('GARDEN_LONGITUDE', 'longitude') ?? config.look.longitude,
  };

  // Check the look last, so a typo in either the workflow or the file gets a clear message.
  if (!['sun', 'light', 'dark', 'black'].includes(config.look.mode)) {
    throw new Error(`look should be "sun", "light", "dark" or "black", but it was "${config.look.mode}".`);
  }

  const outputDir = process.env.GARDEN_OUTPUT_DIR?.trim();

  if (outputDir) {
    config.outputDir = outputDir;
  }

  // The legend has room for 9 rows: up to 8 languages plus "other".
  if (config.bouquet.maxGroups > 8) {
    console.warn(`bouquet.maxGroups is ${config.bouquet.maxGroups}, but only 8 fit in the legend, so using 8.`);
    config.bouquet.maxGroups = 8;
  }

  return config;
}
