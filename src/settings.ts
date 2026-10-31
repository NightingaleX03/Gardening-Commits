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

    settings = merge(settings, JSON.parse(readFileSync(fullPath, 'utf8')) as PlainObject);
  }

  const config = settings as unknown as GardenConfig;

  // Options from the workflow win over the file.
  const look = process.env.GARDEN_LOOK?.trim();

  if (look && look !== 'sun' && look !== 'light' && look !== 'dark') {
    throw new Error(`look should be "sun", "light" or "dark", but it was "${look}".`);
  }

  config.look = {
    mode: (look as GardenConfig['look']['mode'] | undefined) || config.look.mode,
    latitude: readNumber('GARDEN_LATITUDE', 'latitude') ?? config.look.latitude,
    longitude: readNumber('GARDEN_LONGITUDE', 'longitude') ?? config.look.longitude,
  };

  const outputDir = process.env.GARDEN_OUTPUT_DIR?.trim();

  if (outputDir) {
    config.outputDir = outputDir;
  }

  return config;
}
