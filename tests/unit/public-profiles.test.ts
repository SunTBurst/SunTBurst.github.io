import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublicProfileSnapshotStale,
  normalizeGitHubPublicProfile,
  parsePublicProfileSnapshot,
} from '../../src/utils/publicProfiles';

const profile = {
  login: 'SunTBurst',
  name: 'TSun',
  bio: 'Public profile',
  html_url: 'https://github.com/SunTBurst',
  public_repos: 6,
  followers: 1,
  email: 'must-not-leak@example.test',
  location: 'must-not-leak',
};

const repos = [
  {
    name: 'SunTBurst.github.io',
    full_name: 'SunTBurst/SunTBurst.github.io',
    html_url: 'https://github.com/SunTBurst/SunTBurst.github.io',
    description: 'Personal portal',
    updated_at: '2026-08-31T04:43:16Z',
    language: 'Astro',
    stargazers_count: 2,
    forks_count: 0,
    fork: false,
    private: false,
  },
];

const events = [
  {
    id: 'event-1',
    type: 'PushEvent',
    repo: { name: 'SunTBurst/SunTBurst.github.io' },
    created_at: '2026-08-31T04:43:16Z',
    payload: { commits: [{ message: 'PRIVATE-LIKE-COMMIT-BODY-MUST-NOT-LEAK' }] },
  },
  {
    id: 'event-2',
    type: 'WatchEvent',
    repo: { name: 'ImUpXuu/xuhome' },
    created_at: '2026-08-30T08:18:09Z',
  },
];

test('GitHub public snapshot keeps only the declared display model', () => {
  const snapshot = normalizeGitHubPublicProfile(profile, repos, events, '2026-08-31T05:00:00Z');
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.profile.login, 'SunTBurst');
  assert.equal(snapshot.profile.publicRepositories, 6);
  assert.equal(snapshot.repositories[0]?.name, 'SunTBurst.github.io');
  assert.equal(snapshot.activity[0]?.summary, '更新了 SunTBurst/SunTBurst.github.io');
  assert.doesNotMatch(serialized, /must-not-leak|PRIVATE-LIKE-COMMIT-BODY|payload|commits|email|location|upxuu|xuhome/i);
});

test('GitHub snapshot rejects non-GitHub public links and private repositories', () => {
  assert.throws(
    () => normalizeGitHubPublicProfile({ ...profile, html_url: 'https://example.test/SunTBurst' }, repos, events, '2026-08-31T05:00:00Z'),
    /GitHub 链接/,
  );
  const snapshot = normalizeGitHubPublicProfile(profile, [{ ...repos[0], private: true }], events, '2026-08-31T05:00:00Z');
  assert.equal(snapshot.repositories.length, 0);
});

test('profile snapshot becomes stale without turning missing data into zero', () => {
  const snapshot = normalizeGitHubPublicProfile(profile, repos, events, '2026-08-31T05:00:00Z');

  assert.equal(isPublicProfileSnapshotStale(snapshot, new Date('2026-09-01T04:59:59Z')), false);
  assert.equal(isPublicProfileSnapshotStale(snapshot, new Date('2026-09-01T05:00:01Z')), true);
  const unknownCount = parsePublicProfileSnapshot({
    ...snapshot,
    profile: { ...snapshot.profile, followers: null },
  });
  assert.equal(unknownCount.profile.followers, null);
});

test('snapshot parser rejects raw or incomplete payloads', () => {
  assert.throws(() => parsePublicProfileSnapshot({}), /公开资料快照/);
  assert.throws(() => parsePublicProfileSnapshot({
    schemaVersion: 1,
    source: 'github',
    generatedAt: 'not-a-date',
    profile: {},
    repositories: [],
    activity: [],
  }), /公开资料快照/);
});
