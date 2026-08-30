import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(projectRoot, 'dist', 'portal-index.json');
const postsPath = path.join(projectRoot, 'dist', 'posts-data.json');

test('production index exposes only unique local public entries and preserves legacy post identity', () => {
  rmSync(path.join(projectRoot, 'dist'), { recursive: true, force: true });
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected portal index build to succeed:\n${result.output}`);
  assert.ok(existsSync(indexPath), 'expected static /portal-index.json to be emitted');
  assert.ok(existsSync(postsPath), 'expected legacy /posts-data.json to remain emitted');

  const entries = JSON.parse(readFileSync(indexPath, 'utf8'));
  const legacyPosts = JSON.parse(readFileSync(postsPath, 'utf8'));
  assert.ok(Array.isArray(entries), 'expected portal index JSON array');
  assert.ok(Array.isArray(legacyPosts), 'expected legacy posts JSON array');

  const hrefs = entries.map((entry) => entry.href);
  assert.equal(new Set(hrefs).size, hrefs.length, 'expected portal hrefs to be unique');
  for (const href of hrefs) assert.match(href, /^\/(?!\/)/, `expected local href, got ${href}`);

  const start = entries.find((entry) => entry.id === 'page:start');
  assert.deepEqual(
    start && { kind: start.kind, title: start.title, href: start.href },
    { kind: 'page', title: '从这里开始', href: '/start' },
    'expected permanent start entry',
  );
  const project = entries.find((entry) => entry.id === 'project:suntburst-portal');
  assert.deepEqual(
    project && { kind: project.kind, title: project.title, href: project.href },
    { kind: 'project', title: 'SunTBurst 个人门户', href: '/projects/suntburst-portal/' },
    'expected factual project entry',
  );

  const indexedPosts = new Map(entries.filter((entry) => entry.kind === 'post').map((entry) => [entry.id.replace(/^post:/, ''), entry]));
  for (const legacy of legacyPosts) {
    const indexed = indexedPosts.get(legacy.id);
    assert.deepEqual(
      indexed && { id: indexed.id.replace(/^post:/, ''), title: indexed.title, description: indexed.description, href: indexed.href },
      { id: legacy.id, title: legacy.title, description: legacy.description, href: legacy.href },
      `expected legacy post ${legacy.id} to match its index identity`,
    );
    assert.equal(legacy.kind, 'post', `expected legacy post ${legacy.id} kind`);
  }

  const serialized = JSON.stringify(entries);
  assert.doesNotMatch(serialized, /draft|private|service_role|upxuu/i, 'expected index to exclude private or upstream identifiers');
  assert.doesNotMatch(serialized, /https?:\/\/[^\s"']+\.(?:png|jpe?g|gif|webp|svg)(?:[?#][^\s"']*)?/i, 'expected index to exclude absolute attachment URLs');
});
