export interface PublicGitHubRepository {
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  updatedAt: string;
  language: string | null;
  stars: number;
  forks: number;
  isFork: boolean;
}

export interface PublicProfileActivity {
  id: string;
  type: string;
  summary: string;
  repository: string;
  htmlUrl: string;
  occurredAt: string;
}

export interface PublicProfileSnapshot {
  schemaVersion: 1;
  source: 'github';
  generatedAt: string;
  profile: {
    login: string;
    displayName: string | null;
    bio: string | null;
    htmlUrl: string;
    publicRepositories: number | null;
    followers: number | null;
  };
  repositories: PublicGitHubRepository[];
  activity: PublicProfileActivity[];
}

const cleanText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
};

const nullableCount = (value: unknown): number | null =>
  Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;

const isoDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

function githubUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('公开资料必须使用 GitHub 链接');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
    throw new Error('公开资料必须使用 GitHub 链接');
  }
  return url.toString().replace(/\/$/, '');
}

function repositoryName(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return null;
  if (value.toLowerCase() === 'imupxuu/xuhome') return null;
  return value;
}

const eventLabels: Record<string, string> = {
  PushEvent: '更新了',
  CreateEvent: '创建了公开内容于',
  ForkEvent: '派生了',
  WatchEvent: '收藏了',
  IssuesEvent: '更新了议题于',
  PullRequestEvent: '更新了合并请求于',
  ReleaseEvent: '发布了版本于',
};

export function normalizeGitHubPublicProfile(
  rawProfile: unknown,
  rawRepositories: unknown,
  rawEvents: unknown,
  generatedAt: string,
): PublicProfileSnapshot {
  if (!rawProfile || typeof rawProfile !== 'object') throw new Error('GitHub 公开资料格式无效');
  const profile = rawProfile as Record<string, unknown>;
  const login = cleanText(profile.login, 80);
  const generated = isoDate(generatedAt);
  if (!login || !/^[A-Za-z0-9-]+$/.test(login) || !generated) throw new Error('GitHub 公开资料格式无效');

  const repositories = (Array.isArray(rawRepositories) ? rawRepositories : [])
    .flatMap((item): PublicGitHubRepository[] => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Record<string, unknown>;
      if (value.private === true) return [];
      const fullName = repositoryName(value.full_name);
      const name = cleanText(value.name, 100);
      const updatedAt = isoDate(value.updated_at);
      if (!fullName || !name || !updatedAt) return [];
      let htmlUrl: string;
      try {
        htmlUrl = githubUrl(value.html_url);
      } catch {
        return [];
      }
      return [{
        name,
        fullName,
        description: cleanText(value.description, 180) ?? '这个公开仓库暂未填写简介。',
        htmlUrl,
        updatedAt,
        language: cleanText(value.language, 40),
        stars: nullableCount(value.stargazers_count) ?? 0,
        forks: nullableCount(value.forks_count) ?? 0,
        isFork: value.fork === true,
      }];
    })
    .slice(0, 6);

  const seenActivity = new Set<string>();
  const activity = (Array.isArray(rawEvents) ? rawEvents : [])
    .flatMap((item): PublicProfileActivity[] => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Record<string, unknown>;
      const repo = value.repo && typeof value.repo === 'object'
        ? repositoryName((value.repo as Record<string, unknown>).name)
        : null;
      const occurredAt = isoDate(value.created_at);
      const type = cleanText(value.type, 60);
      const id = cleanText(value.id, 100);
      if (!repo || !occurredAt || !type || !id) return [];
      const action = eventLabels[type] ?? '产生了公开活动于';
      return [{
        id: `github:${id}`,
        type,
        summary: `${action} ${repo}`,
        repository: repo,
        htmlUrl: `https://github.com/${repo}`,
        occurredAt,
      }];
    })
    .filter((item) => {
      const key = `${item.type}:${item.repository}:${item.occurredAt.slice(0, 10)}`;
      if (seenActivity.has(key)) return false;
      seenActivity.add(key);
      return true;
    })
    .slice(0, 8);

  return {
    schemaVersion: 1,
    source: 'github',
    generatedAt: generated,
    profile: {
      login,
      displayName: cleanText(profile.name, 100),
      bio: cleanText(profile.bio, 240),
      htmlUrl: githubUrl(profile.html_url),
      publicRepositories: nullableCount(profile.public_repos),
      followers: nullableCount(profile.followers),
    },
    repositories,
    activity,
  };
}

export function parsePublicProfileSnapshot(input: unknown): PublicProfileSnapshot {
  if (!input || typeof input !== 'object') throw new Error('公开资料快照格式无效');
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== 1 || value.source !== 'github' || !isoDate(value.generatedAt)) {
    throw new Error('公开资料快照格式无效');
  }
  const profile = value.profile;
  if (!profile || typeof profile !== 'object') throw new Error('公开资料快照格式无效');
  const profileValue = profile as Record<string, unknown>;
  const login = cleanText(profileValue.login, 80);
  if (!login) throw new Error('公开资料快照格式无效');

  const normalized = normalizeGitHubPublicProfile(
    {
      login,
      name: profileValue.displayName,
      bio: profileValue.bio,
      html_url: profileValue.htmlUrl,
      public_repos: profileValue.publicRepositories,
      followers: profileValue.followers,
    },
    Array.isArray(value.repositories)
      ? value.repositories.map((repo) => {
          const item = repo as Record<string, unknown>;
          return {
            name: item.name,
            full_name: item.fullName,
            description: item.description,
            html_url: item.htmlUrl,
            updated_at: item.updatedAt,
            language: item.language,
            stargazers_count: item.stars,
            forks_count: item.forks,
            fork: item.isFork,
            private: false,
          };
        })
      : [],
    Array.isArray(value.activity)
      ? value.activity.map((event) => {
          const item = event as Record<string, unknown>;
          return {
            id: typeof item.id === 'string' ? item.id.replace(/^github:/, '') : item.id,
            type: item.type,
            repo: { name: item.repository },
            created_at: item.occurredAt,
          };
        })
      : [],
    value.generatedAt as string,
  );

  normalized.profile.publicRepositories = nullableCount(profileValue.publicRepositories);
  normalized.profile.followers = nullableCount(profileValue.followers);
  return normalized;
}

export function isPublicProfileSnapshotStale(snapshot: PublicProfileSnapshot, now = new Date(), maxAgeHours = 24): boolean {
  return now.getTime() - Date.parse(snapshot.generatedAt) > maxAgeHours * 60 * 60 * 1000;
}
