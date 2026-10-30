import type { Day, GardenConfig, GardenData, LanguageStat, Level } from './types.js';

const API_URL = 'https://api.github.com/graphql';

const LEVELS: Record<string, Level> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CONTRIBUTIONS_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel weekday } }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner primaryLanguage { name color } }
        contributions(first: 100) {
          pageInfo { hasNextPage endCursor }
          nodes { occurredAt commitCount }
        }
      }
    }
  }
}`;

const MORE_COMMITS_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner }
        contributions(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { occurredAt commitCount }
        }
      }
    }
  }
}`;

const REPOS_QUERY = `
query($login: String!, $after: String, $privacy: RepositoryPrivacy) {
  user(login: $login) {
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false, privacy: $privacy) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        stargazerCount
        forkCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface CommitDay {
  occurredAt: string;
  commitCount: number;
}

interface RepoCommits {
  repository: { nameWithOwner: string; primaryLanguage?: { name: string; color: string | null } | null };
  contributions: { pageInfo: PageInfo; nodes: CommitDay[] };
}

interface ContributionsResponse {
  user: {
    login: string;
    name: string | null;
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalIssueContributions: number;
      totalPullRequestReviewContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string; weekday: number }[] }[];
      };
      commitContributionsByRepository: RepoCommits[];
    };
  } | null;
}

interface MoreCommitsResponse {
  user: { contributionsCollection: { commitContributionsByRepository: RepoCommits[] } };
}

interface ReposResponse {
  user: {
    repositories: {
      totalCount: number;
      pageInfo: PageInfo;
      nodes: {
        stargazerCount: number;
        forkCount: number;
        languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
      }[];
    };
  };
}

type LanguageTotals = Record<string, { weight: number; color: string | null }>;

async function query<T>(token: string, queryText: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'contribution-garden',
    },
    body: JSON.stringify({ query: queryText, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(`GitHub API: ${json.errors.map((error) => error.message).join('; ')}`);
  }

  return json.data as T;
}

/** Commit times come back as local midnight in UTC, so adding 12 hours lands them on the right calendar date. */
function toCalendarDate(timestamp: string): string {
  return new Date(Date.parse(timestamp) + 12 * 3600e3).toISOString().slice(0, 10);
}

export async function fetchGardenData(login: string, token: string, config: GardenConfig): Promise<GardenData> {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364)).toISOString();
  const variables = { login, from, to };

  const main = await query<ContributionsResponse>(token, CONTRIBUTIONS_QUERY, variables);

  if (!main.user) {
    throw new Error(`GitHub user "${login}" not found`);
  }

  const collection = main.user.contributionsCollection;

  // The calendar: one entry per day.
  const days: Day[] = [];

  collection.contributionCalendar.weeks.forEach((calendarWeek, week) => {
    for (const calendarDay of calendarWeek.contributionDays) {
      days.push({
        date: calendarDay.date,
        count: calendarDay.contributionCount,
        level: LEVELS[calendarDay.contributionLevel] ?? 0,
        weekday: calendarDay.weekday,
        week,
      });
    }
  });

  // Commits per day per language, following pagination for very busy repos.
  const dayLanguages: Record<string, Record<string, number>> = {};
  const commitLanguages: LanguageTotals = {};

  const addCommits = (language: string, commitDays: CommitDay[]) => {
    for (const commitDay of commitDays) {
      const date = toCalendarDate(commitDay.occurredAt);

      dayLanguages[date] ??= {};
      dayLanguages[date][language] = (dayLanguages[date][language] ?? 0) + commitDay.commitCount;
      commitLanguages[language].weight += commitDay.commitCount;
    }
  };

  for (const repoCommits of collection.commitContributionsByRepository) {
    const language = repoCommits.repository.primaryLanguage?.name;

    if (!language) {
      continue;
    }

    commitLanguages[language] ??= { weight: 0, color: repoCommits.repository.primaryLanguage?.color ?? null };
    addCommits(language, repoCommits.contributions.nodes);

    let page = repoCommits.contributions.pageInfo;

    for (let pageNumber = 0; page.hasNextPage && pageNumber < 5; pageNumber++) {
      const more = await query<MoreCommitsResponse>(token, MORE_COMMITS_QUERY, { ...variables, after: page.endCursor });
      const sameRepo = more.user.contributionsCollection.commitContributionsByRepository.find(
        (other) => other.repository.nameWithOwner === repoCommits.repository.nameWithOwner,
      );

      if (!sameRepo) {
        break;
      }

      addCommits(language, sameRepo.contributions.nodes);
      page = sameRepo.contributions.pageInfo;
    }
  }

  // Your own repos: stars, forks and language sizes.
  let stars = 0;
  let forks = 0;
  let repoCount = 0;
  const repoLanguages: LanguageTotals = {};
  let after: string | null = null;

  for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
    const privacy = config.includePrivate ? null : 'PUBLIC';
    const response: ReposResponse = await query<ReposResponse>(token, REPOS_QUERY, { login, after, privacy });
    const repos = response.user.repositories;

    repoCount = repos.totalCount;

    for (const repo of repos.nodes) {
      stars += repo.stargazerCount;
      forks += repo.forkCount;

      for (const edge of repo.languages.edges) {
        repoLanguages[edge.node.name] ??= { weight: 0, color: edge.node.color };
        repoLanguages[edge.node.name].weight += edge.size;
      }
    }

    if (!repos.pageInfo.hasNextPage) {
      break;
    }

    after = repos.pageInfo.endCursor;
  }

  const useCommits = config.languageSource === 'commits' && Object.keys(commitLanguages).length > 0;
  const source = useCommits ? commitLanguages : repoLanguages;
  const languages: LanguageStat[] = Object.entries(source)
    .map(([name, total]) => ({ name, color: total.color, weight: total.weight }))
    .sort((a, b) => b.weight - a.weight);

  return {
    login: main.user.login,
    name: main.user.name,
    from: days[0]?.date ?? from.slice(0, 10),
    to: days[days.length - 1]?.date ?? to.slice(0, 10),
    days,
    dayLanguages,
    languages,
    totals: {
      contributions: collection.contributionCalendar.totalContributions,
      commits: collection.totalCommitContributions + collection.restrictedContributionsCount,
      pullRequests: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
      repos: repoCount,
      stars,
      forks,
    },
  };
}
