import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

const fixedRoutes = [
  '/',
  '/start',
  '/knowledge',
  '/knowledge/personal-portal-map/',
  '/projects',
  '/projects/suntburst-portal/',
  '/now',
  '/changelog',
  '/posts',
  '/archive',
  '/categories',
  '/tags',
  '/calendar',
  '/timeline',
  '/explore',
  '/topics',
  '/topics/site-building',
  '/topics/knowledge-management',
  '/topics/ai-knowledge',
  '/search',
  '/lab',
  '/favorites',
  '/ai',
  '/music',
  '/stats',
  '/status',
  '/subscribe',
  '/talks',
  '/about',
  '/friends',
  '/privacy',
];

function hrefToHtmlPath(href) {
  const pathname = new URL(href, 'https://portal.test').pathname;
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return segments.length === 0
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...segments, 'index.html');
}

function readRoute(href) {
  const target = hrefToHtmlPath(href);
  assert.ok(existsSync(target), `missing ${href}`);
  return readFileSync(target, 'utf8');
}

test('production build emits every fixed and indexed public HTML route with honest previews', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected route inventory build to succeed:\n${result.output}`);

  for (const route of fixedRoutes) readRoute(route);

  const entries = JSON.parse(readFileSync(path.join(distDir, 'portal-index.json'), 'utf8'));
  for (const entry of entries) {
    assert.match(entry.href, /^\/(?!\/)/, `expected local portal href for ${entry.id}`);
    readRoute(entry.href);
  }

  const detailEntries = entries.filter(({ kind }) => kind === 'knowledge' || kind === 'project');
  assert.ok(detailEntries.length >= 2, 'expected published knowledge and project details in the portal index');
  for (const entry of detailEntries) readRoute(entry.href);

  for (const feature of ['ai', 'music', 'stats', 'status', 'subscribe']) {
    const html = readRoute(`/${feature}`);
    assert.match(html, new RegExp(`data-feature="${feature}"`), `expected ${feature} feature identity`);
    assert.match(html, /data-state="preview"/, `expected ${feature} to remain an honest preview`);
  }

  for (const unknownRoute of ['/knowledge/not-published/', '/projects/not-published/', '/topics/not-configured/']) {
    assert.equal(existsSync(hrefToHtmlPath(unknownRoute)), false, `expected unknown route ${unknownRoute} not to be generated`);
  }
});
