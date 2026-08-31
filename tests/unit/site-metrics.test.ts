import assert from 'node:assert/strict';
import test from 'node:test';
import type { PortalIndexEntry } from '../../src/types/portal';
import { buildSiteMetrics, buildSiteStatusSnapshot } from '../../src/utils/siteMetrics';

const entries: PortalIndexEntry[] = [
  { id: 'page:home', kind: 'page', title: '首页', description: '', href: '/', updatedAt: '2026-08-30', topics: [] },
  { id: 'post:one', kind: 'post', title: '文章', description: '', href: '/posts/one', updatedAt: '2026-08-31', topics: [] },
  { id: 'knowledge:one', kind: 'knowledge', title: '知识', description: '', href: '/knowledge/one', updatedAt: '2026-08-29', topics: [] },
  { id: 'project:one', kind: 'project', title: '项目', description: '', href: '/projects/one', updatedAt: '2026-08-28', topics: [] },
  { id: 'update:one', kind: 'update', title: '更新', description: '', href: '/changelog#one', updatedAt: '2026-08-31T12:00:00Z', topics: [] },
];

const tools = [
  { title: '搜索', description: '', href: '/search' as const, state: 'ready' as const },
  { title: 'AI', description: '', href: '/ai' as const, state: 'preview' as const },
];

test('site metrics count only real indexed entries and tool states', () => {
  const metrics = buildSiteMetrics(entries, tools);

  assert.equal(metrics.indexedRoutes, 5);
  assert.equal(metrics.publicRecords, 4);
  assert.deepEqual(metrics.byKind, {
    page: 1,
    post: 1,
    talk: 0,
    knowledge: 1,
    project: 1,
    update: 1,
  });
  assert.equal(metrics.readyTools, 1);
  assert.equal(metrics.previewTools, 1);
  assert.equal(metrics.latestPublishedAt, '2026-08-31T12:00:00Z');
});

test('status snapshot uses unknown for an unavailable build SHA', () => {
  const metrics = buildSiteMetrics(entries, tools);
  const local = buildSiteStatusSnapshot(metrics, 'local', '2026-08-31T12:30:00Z', 'fallback');
  const deployed = buildSiteStatusSnapshot(metrics, 'a'.repeat(40), '2026-08-31T12:30:00Z', 'build-cache');

  assert.equal(local.buildSha, null);
  assert.equal(local.buildState, 'verified-at-build');
  assert.equal(local.githubSnapshot, 'fallback');
  assert.equal(deployed.buildSha, 'a'.repeat(40));
  assert.equal(deployed.githubSnapshot, 'build-cache');
  assert.equal(deployed.metrics, metrics);
});

test('site metrics keep a missing publication time unknown', () => {
  const metrics = buildSiteMetrics([], []);
  assert.equal(metrics.latestPublishedAt, null);
  assert.equal(metrics.publicRecords, 0);
});
