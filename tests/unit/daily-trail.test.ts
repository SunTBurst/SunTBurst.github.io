import assert from 'node:assert/strict';
import test from 'node:test';
import {
  riyadhDateKey,
  selectDailyTrail,
  type DailyTrailCandidate,
} from '../../src/utils/dailyTrail';

const candidate = (id: string, href: `/${string}`): DailyTrailCandidate => ({
  id,
  title: id,
  description: `${id} 的公开说明`,
  href,
});

const pools = {
  knowledge: [candidate('knowledge-a', '/knowledge/a/'), candidate('knowledge-b', '/knowledge/b/')],
  practice: [candidate('practice-a', '/projects/a/'), candidate('practice-b', '/posts/b/')],
  tools: [candidate('tool-a', '/weather'), candidate('tool-b', '/music')],
};

test('Riyadh date key changes exactly at local midnight', () => {
  assert.equal(riyadhDateKey(new Date('2026-08-30T20:59:59.000Z')), '2026-08-30');
  assert.equal(riyadhDateKey(new Date('2026-08-30T21:00:00.000Z')), '2026-08-31');
});

test('daily trail is deterministic, ordered, and draws one stop from each pool', () => {
  const first = selectDailyTrail('2026-08-31', pools);
  const second = selectDailyTrail('2026-08-31', pools);
  assert.deepEqual(second, first);
  assert.deepEqual(first.map(({ stage }) => stage), ['knowledge', 'practice', 'tool']);
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map(({ href }) => href)).size, 3);
});

test('daily trail selection ignores unsafe candidates and handles a missing pool honestly', () => {
  const trail = selectDailyTrail('2026-08-31', {
    knowledge: [candidate('unsafe', '//outside.test/path' as `/${string}`), candidate('safe', '/knowledge/safe/')],
    practice: [],
    tools: [candidate('tool', '/ai')],
  });
  assert.deepEqual(trail.map(({ id }) => id), ['safe', 'tool']);
  assert.deepEqual(trail.map(({ stage }) => stage), ['knowledge', 'tool']);
});

test('invalid date keys are rejected instead of silently inventing a daily route', () => {
  assert.throws(() => selectDailyTrail('31-08-2026', pools), /invalid daily trail date/);
});
