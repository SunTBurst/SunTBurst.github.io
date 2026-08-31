import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

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

test('homepage is the nine-section SunTBurst portal with continuous two-hop paths', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected homepage portal build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const sectionIds = [
    'identity',
    'portal-pulse',
    'start-here',
    'knowledge-map',
    'current-focus',
    'project-shelf',
    'recent-activity',
    'random-explore',
    'portal-tools',
  ];
  let previousIndex = -1;
  for (const id of sectionIds) {
    const index = html.indexOf(`id="${id}"`);
    assert.ok(index > previousIndex, `expected homepage section ${id} in the prescribed order`);
    previousIndex = index;
  }

  assert.match(html, /SunTBurst/, 'expected the unique public product identity');
  assert.match(html, /SunTBurst 个人门户/, 'expected the factual portal project');
  assert.deepEqual(
    Array.from(html.matchAll(/\bdata-start-path="([^"]+)"/g), (match) => match[1]),
    ['/start', '/knowledge', '/projects'],
    'expected the three configured exploration paths',
  );

  const firstHops = anchorHrefs(html, 'start-current');
  const secondHops = anchorHrefs(html, 'start-next');
  assert.deepEqual(firstHops, ['/start', '/knowledge', '/projects'], 'expected three ordinary first-hop links');
  assert.deepEqual(secondHops, ['/about', '/topics/site-building', '/changelog'], 'expected three ordinary second-hop links');
  for (const href of [...firstHops, ...secondHops]) {
    assert.ok(routeExists(href), `expected homepage hop ${href} to resolve to built HTML`);
  }

  assert.equal((html.match(/<main\b/g) ?? []).length, 1, 'expected exactly one main landmark');
  assert.doesNotMatch(html, /PageBanner/, 'expected the portal homepage not to ship the collection PageBanner island');
  assert.doesNotMatch(html, /(?:访问量|在线人数|在线状态)[^<\n]{0,20}\d+/, 'expected no fabricated traffic or online values');
  assert.deepEqual(findUnexpectedRuntimeSinks(collectTextArtifacts(distDir)), [], 'expected the homepage build to keep a zero-network browser bundle');
});
