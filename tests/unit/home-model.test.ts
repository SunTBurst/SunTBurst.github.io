import assert from 'node:assert/strict';
import test from 'node:test';
import { portalConfig } from '../../src/config/portal';
import { buildHomeModel } from '../../src/utils/homeModel';
import type { PortalIndexEntry } from '../../src/types/portal';

const entry = (id: string, updatedAt: string): PortalIndexEntry => ({
  id,
  kind: 'update',
  title: id,
  description: `${id} 的公开记录`,
  href: `/${id}`,
  updatedAt,
  topics: [],
});

test('homepage model stays meaningful with every editorial collection empty', () => {
  const model = buildHomeModel({ posts: [], talks: [], knowledge: [], projects: [], updates: [] });

  assert.ok(model.startHere.length >= 3);
  assert.equal(new Set(model.startHere.map(({ href }) => href)).size, model.startHere.length);
  assert.deepEqual(model.topics, portalConfig.topics);
  assert.equal(model.projects[0]?.title, 'SunTBurst 个人门户');
  assert.equal(model.randomFallback, '/start');
  assert.equal(model.lastUpdated, '2026-08-30');
  assert.equal(model.recent.length, 0);
  assert.doesNotMatch(JSON.stringify(model), /(?:访问|在线|用户|文章)[^\n]{0,12}\d+/);
});

test('homepage model derives the update label from the newest published entry', () => {
  const model = buildHomeModel({
    posts: [entry('older-post', '2026-08-31')],
    talks: [entry('latest-talk', '2026-09-02')],
    knowledge: [],
    projects: [],
    updates: [entry('middle-update', '2026-09-01')],
  });

  assert.equal(model.lastUpdated, '2026-09-02');
});

test('homepage model sorts recent activity by date, keeps equal dates stable, and limits it to eight entries', () => {
  const model = buildHomeModel({
    posts: [entry('post-same-date', '2026-09-03'), entry('post-old', '2026-08-30')],
    talks: [entry('talk-newest', '2026-09-04')],
    knowledge: [entry('knowledge-same-date', '2026-09-03')],
    projects: [],
    updates: [
      entry('update-same-date', '2026-09-03'),
      entry('update-seven', '2026-09-02'),
      entry('update-six', '2026-09-01'),
      entry('update-five', '2026-08-31'),
      entry('update-four', '2026-08-29'),
      entry('update-three', '2026-08-28'),
      entry('update-two', '2026-08-27'),
    ],
  });

  assert.deepEqual(
    model.recent.map(({ id }) => id),
    ['talk-newest', 'update-same-date', 'knowledge-same-date', 'post-same-date', 'update-seven', 'update-six', 'update-five', 'post-old'],
  );
  assert.equal(model.recent.length, 8);
});
