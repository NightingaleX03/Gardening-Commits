import type { GardenConfig, GardenData, Level } from './types.js';
import { SPECIES, type Species } from './flowers.js';
import { hashColor } from './color.js';
import { hashString, seededRandom } from './util.js';

/** One flower in the garden and bouquet: a single language, or the "other" bundle of small ones. */
export interface Group {
  key: string;
  label: string;
  languages: string[];
  species: Species;
  color: string;
  percent: number;
  wholePercent: number; // rounded so all groups add up to exactly 100
  stems: number; // how many stems it gets in the bouquet
}

export interface Plot {
  date: string;
  week: number;
  weekday: number;
  level: Level;
  group: Group | null;
  seed: number;
}

/** A run of days in a row with contributions, as indexes into data.days. */
export interface Streak {
  start: number;
  end: number;
  length: number;
}

export interface Model {
  data: GardenData;
  groups: Group[];
  plots: Plot[];
  weekCount: number;
  streaks: Streak[];
  longest: Streak | null;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Split `total` into whole numbers in proportion to `shares`, giving every share at
 * least `minimum`. Leftovers go to whichever shares were rounded down the most.
 */
function apportion(shares: number[], total: number, minimum: number): number[] {
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  const exact = shares.map((share) => (share / sum) * total);
  const result = exact.map((value) => Math.max(minimum, Math.floor(value)));

  let used = result.reduce((a, b) => a + b, 0);

  // Too many (because of the minimums): take from whoever got the most extra.
  while (used > total) {
    let pick = -1;

    for (let index = 0; index < result.length; index++) {
      const canGiveOne = result[index] > minimum;
      const givesMore = pick < 0 || result[index] - exact[index] > result[pick] - exact[pick];

      if (canGiveOne && givesMore) {
        pick = index;
      }
    }

    if (pick < 0) {
      break;
    }

    result[pick]--;
    used--;
  }

  // Too few: give to whoever was rounded down the most.
  while (used < total) {
    let pick = 0;

    for (let index = 1; index < result.length; index++) {
      if (exact[index] - result[index] > exact[pick] - result[pick]) {
        pick = index;
      }
    }

    result[pick]++;
    used++;
  }

  return result;
}

export function buildModel(data: GardenData, config: GardenConfig): Model {
  // Language shares, biggest first.
  const excluded = new Set(config.excludeLanguages.map((name) => name.toLowerCase()));
  const languages = data.languages.filter((language) => language.weight > 0 && !excluded.has(language.name.toLowerCase()));
  const totalWeight = languages.reduce((sum, language) => sum + language.weight, 0);
  const shares = languages
    .map((language) => ({ ...language, percent: (language.weight / totalWeight) * 100 }))
    .sort((a, b) => b.percent - a.percent);

  // Languages big enough to get their own flower; the rest become "other".
  const { stems, minPercent, maxGroups } = config.bouquet;
  const mainLanguages = shares.filter((share) => share.percent >= minPercent).slice(0, Math.max(1, Math.min(maxGroups, stems - 1)));
  const mainNames = new Set(mainLanguages.map((language) => language.name));
  const smallLanguages = shares.filter((share) => !mainNames.has(share.name));
  const otherPercent = smallLanguages.reduce((sum, language) => sum + language.percent, 0);

  // Languages in the config keep their flower; everyone else gets the next unused one.
  const usedSpecies = new Set<string>();
  const speciesFor = new Map<string, string>();

  for (const language of mainLanguages) {
    const id = config.species[language.name];

    if (id && SPECIES[id] && id !== config.otherSpecies && !usedSpecies.has(id)) {
      speciesFor.set(language.name, id);
      usedSpecies.add(id);
    }
  }

  const pool = config.speciesPool.filter((id) => SPECIES[id] && id !== config.otherSpecies);

  for (const language of mainLanguages) {
    if (speciesFor.has(language.name)) {
      continue;
    }

    const id = pool.find((candidate) => !usedSpecies.has(candidate)) ?? config.otherSpecies;
    usedSpecies.add(id);
    speciesFor.set(language.name, id);
  }

  const groups: Group[] = mainLanguages.map((language, index) => ({
    key: `g${index}`,
    label: language.name,
    languages: [language.name],
    species: SPECIES[speciesFor.get(language.name)!],
    color: config.languageColors[language.name] ?? language.color ?? hashColor(language.name),
    percent: language.percent,
    wholePercent: 0,
    stems: 0,
  }));

  if (otherPercent >= 1 || groups.length === 0) {
    groups.push({
      key: 'other',
      label: 'other',
      languages: smallLanguages.map((language) => language.name),
      species: SPECIES[config.otherSpecies] ?? SPECIES.wildflower,
      color: config.otherColor,
      percent: groups.length ? otherPercent : 100,
      wholePercent: 0,
      stems: 0,
    });
  }

  const percents = groups.map((group) => group.percent);

  apportion(percents, Math.max(stems, groups.length), 1).forEach((count, index) => {
    groups[index].stems = count;
  });

  apportion(percents, 100, 0).forEach((percent, index) => {
    groups[index].wholePercent = percent;
  });

  groups.sort((a, b) => b.percent - a.percent);

  // Which flower grows on each day.
  const groupFor = new Map<string, Group>();

  for (const group of groups) {
    for (const language of group.languages) {
      groupFor.set(language, group);
    }
  }

  const fallback = groups.find((group) => group.key === 'other') ?? groups[0];

  const plots: Plot[] = data.days.map((day) => {
    const seed = hashString(day.date);
    let group: Group | null = null;

    if (day.level > 0) {
      const languagesThatDay = Object.entries(data.dayLanguages[day.date] ?? {}).sort((a, b) => b[1] - a[1]);

      if (languagesThatDay.length) {
        group = groupFor.get(languagesThatDay[0][0]) ?? fallback;
      } else {
        // We don't know the language (PRs, issues, private work), so pick one
        // based on your overall usage so the mix still matches reality.
        let remaining = seededRandom(seed)() * 100;
        group = groups.find((candidate) => (remaining -= candidate.percent) < 0) ?? groups[0];
      }
    }

    return { date: day.date, week: day.week, weekday: day.weekday, level: day.level, group, seed };
  });

  // Streaks: runs of days in a row with at least one contribution.
  const streaks: Streak[] = [];
  let longest: Streak | null = null;
  let runStart = -1;

  data.days.forEach((day, index) => {
    if (day.count > 0 && runStart < 0) {
      runStart = index;
    }

    const runEnds = runStart >= 0 && (day.count === 0 || index === data.days.length - 1);

    if (runEnds) {
      const end = day.count > 0 ? index : index - 1;
      const streak = { start: runStart, end, length: end - runStart + 1 };

      if (!longest || streak.length > longest.length) {
        longest = streak;
      }

      if (streak.length >= config.streakMinDays) {
        streaks.push(streak);
      }

      runStart = -1;
    }
  });

  // Current streak: today counts if you've already coded, otherwise it can end yesterday.
  let currentStreak = 0;
  let dayIndex = data.days.length - 1;

  if (dayIndex >= 0 && data.days[dayIndex].count === 0) {
    dayIndex--;
  }

  while (dayIndex >= 0 && data.days[dayIndex].count > 0) {
    currentStreak++;
    dayIndex--;
  }

  const best = longest as Streak | null;

  return {
    data,
    groups,
    plots,
    weekCount: Math.max(1, ...data.days.map((day) => day.week + 1)),
    streaks,
    longest: best && best.length >= config.streakMinDays ? best : null,
    currentStreak,
    longestStreak: best?.length ?? 0,
  };
}
