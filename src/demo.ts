import type { Day, GardenData, Level } from './types.js';
import { seededRandom } from './util.js';

const DAY_MS = 864e5;

/** Made-up but realistic data so you can preview the garden without a token. */
export function demoData(seed = 7): GardenData {
  const random = seededRandom(seed);

  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = end - 364 * DAY_MS;

  const languages = [
    { name: 'TypeScript', color: '#3178c6', weight: 58 },
    { name: 'JavaScript', color: '#f1e05a', weight: 13 },
    { name: 'Python', color: '#3572A5', weight: 10 },
    { name: 'Rust', color: '#dea584', weight: 6 },
    { name: 'Go', color: '#00ADD8', weight: 4.5 },
    { name: 'CSS', color: '#663399', weight: 3.5 },
    { name: 'Shell', color: '#89e051', weight: 2.5 },
    { name: 'Dockerfile', color: '#384d54', weight: 1.5 },
    { name: 'Lua', color: '#000080', weight: 1 },
  ];
  const totalWeight = languages.reduce((sum, language) => sum + language.weight, 0);

  const pickLanguage = () => {
    let remaining = random() * totalWeight;

    for (const language of languages) {
      remaining -= language.weight;

      if (remaining < 0) {
        return language.name;
      }
    }

    return languages[0].name;
  };

  const days: Day[] = [];
  const dayLanguages: GardenData['dayLanguages'] = {};
  let week = 0;
  let mood = 0.6; // changes each Monday so some weeks are busier than others

  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time);
    const weekday = date.getUTCDay();

    if (weekday === 0 && days.length) {
      week++;
    }

    if (weekday === 1) {
      mood = Math.min(1, Math.max(0.15, mood + (random() - 0.5) * 0.5));
    }

    const isWeekend = weekday === 0 || weekday === 6;
    const isActive = random() < (isWeekend ? mood * 0.45 : mood + 0.15);
    const count = isActive ? Math.max(1, Math.round(random() ** 2 * 14 * mood + random() * 3)) : 0;
    const isoDate = date.toISOString().slice(0, 10);

    days.push({ date: isoDate, count, level: 0, weekday, week });

    if (count && random() < 0.85) {
      const commitsByLanguage: Record<string, number> = {};
      const languageCount = 1 + Math.floor(random() * 2);

      for (let index = 0; index < languageCount; index++) {
        const language = pickLanguage();
        commitsByLanguage[language] = (commitsByLanguage[language] ?? 0) + 1 + Math.floor(random() * count);
      }

      dayLanguages[isoDate] = commitsByLanguage;
    }
  }

  // GitHub-style levels: quartiles over the days that had any contributions.
  const sortedCounts = days.map((day) => day.count).filter((count) => count > 0).sort((a, b) => a - b);
  const quartile = (fraction: number) => sortedCounts[Math.floor((sortedCounts.length - 1) * fraction)] ?? 1;
  const [firstQuartile, median, thirdQuartile] = [quartile(0.25), quartile(0.5), quartile(0.75)];

  for (const day of days) {
    if (day.count === 0) {
      day.level = 0;
    } else if (day.count <= firstQuartile) {
      day.level = 1;
    } else if (day.count <= median) {
      day.level = 2;
    } else if (day.count <= thirdQuartile) {
      day.level = 3;
    } else {
      day.level = 4 as Level;
    }
  }

  const contributions = days.reduce((sum, day) => sum + day.count, 0);

  return {
    login: 'garden-demo',
    name: 'Demo',
    from: days[0].date,
    to: days[days.length - 1].date,
    days,
    dayLanguages,
    languages,
    totals: {
      contributions,
      commits: Math.round(contributions * 0.78),
      privateContributions: 0,
      pullRequests: Math.round(contributions * 0.09),
      issues: Math.round(contributions * 0.04),
      reviews: Math.round(contributions * 0.07),
      repos: 34,
      stars: 9,
      forks: 5,
    },
  };
}
