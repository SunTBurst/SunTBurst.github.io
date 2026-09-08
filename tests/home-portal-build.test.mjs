import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

function routeExists(href) {
  const pathname = new URL(href, 'https://portal.test').pathname;
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const target = segments.length === 0
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...segments, 'index.html');
  return existsSync(target);
}

function anchorHrefs(html, touchTarget) {
  return Array.from(html.matchAll(/<a\b[^>]*>/g), ([tag]) => tag)
    .filter((tag) => new RegExp(`\\bdata-touch-target="${touchTarget}"`).test(tag))
    .map((tag) => tag.match(/\bhref="([^"]+)"/)?.[1]);
}

test('homepage presents identity, recent articles and real talks with valid local links', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected homepage portal build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const identity = html.indexOf('id="identity"');
  const posts = html.indexOf('id="recent-posts"');
  const talks = html.indexOf('id="recent-activity"');
  assert.ok(identity >= 0 && posts > identity && talks > posts, 'expected identity, articles, then real talks');
  assert.doesNotMatch(html, /id="portal-pulse"|id="portal-tools"|id="knowledge-map"|id="random-explore"/);
  assert.match(html, /SunTBurst/);
  assert.match(html, /最近随记/);
  const postLinks = anchorHrefs(html, 'recent-post');
  const talkLinks = anchorHrefs(html, 'activity-entry');
  assert.ok(postLinks.length > 0 && postLinks.length <= 4);
  assert.ok(talkLinks.length > 0 && talkLinks.length <= 3);
  assert.ok(postLinks.every((href) => href.startsWith('/posts/')));
  assert.ok(talkLinks.every((href) => href.startsWith('/talk/')), 'expected talks rather than renamed mixed activity');
  for (const href of [...postLinks, ...talkLinks, '/posts', '/about', '/talks']) {
    assert.ok(routeExists(href), `expected homepage link ${href} to resolve to built HTML`);
  }

  assert.equal((html.match(/<main\b/g) ?? []).length, 1, 'expected exactly one main landmark');
  assert.doesNotMatch(html, /PageBanner/, 'expected the portal homepage not to ship the collection PageBanner island');
  assert.doesNotMatch(html, /(?:访问量|在线人数|在线状态)[^<\n]{0,20}\d+/, 'expected no fabricated traffic or online values');
  assert.deepEqual(findUnexpectedRuntimeSinks([{ path: 'index.html', text: html }]), [], 'expected the homepage HTML to remain network-free');
  assert.doesNotMatch(html, /WeatherPanel|api\.open-meteo\.com/, 'expected the homepage not to load the opt-in weather runtime');
});
