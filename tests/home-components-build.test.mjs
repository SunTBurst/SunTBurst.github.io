import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
const harnessSource = path.join(projectRoot, 'src', 'pages', '__portal-home-test.astro');
const harnessRoute = path.join(projectRoot, 'src', 'pages', '[...portalHomeTest].astro');
const harnessOutput = path.join(projectRoot, 'dist', '__portal-home-test');
const touchHarnessSource = path.join(projectRoot, 'src', 'pages', '__portal-home-touch-target-test.astro');
const touchHarnessRoute = path.join(projectRoot, 'src', 'pages', '[...portalHomeTouchTargetTest].astro');
const touchHarnessOutput = path.join(projectRoot, 'dist', '__portal-home-touch-target-test');
const longUnbrokenToken = 'UNBROKENHOMEPAGELINKTITLEANDPATHFORNARROWSCREENWRAPPINGCHECK';
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

function assertTouchTarget(html, marker, expectedCount) {
  const targets = [...html.matchAll(new RegExp(`<a\\b(?=[^>]*\\bdata-touch-target=(?:"${marker}"|${marker}))[^>]*>`, 'g'))].map((match) => match[0]);
  assert.equal(targets.length, expectedCount, `expected ${expectedCount} emitted ${marker} touch target(s)`);
  for (const target of targets) {
    assert.match(target, /class="[^"]*inline-flex[^"]*"/, `expected ${marker} to have an inline touch container`);
    assert.match(target, /class="[^"]*min-h-\[44px\][^"]*"/, `expected ${marker} to be at least 44px tall`);
    assert.match(target, /class="[^"]*px-[^"]*"/, `expected ${marker} to retain horizontal hit-area padding`);
    assert.match(target, /class="[^"]*focus-visible:ring-4[^"]*"/, `expected ${marker} to preserve a visible keyboard focus ring`);
    assert.match(target, /class="[^"]*motion-reduce:transition-none[^"]*"/, `expected ${marker} to disable link animation for reduced motion`);
    assert.match(target, /class="[^"]*max-w-full[^"]*"/, `expected ${marker} to stay within a narrow parent`);
    assert.match(target, /class="[^"]*min-w-0[^"]*"/, `expected ${marker} to shrink in a flex context`);
    assert.match(target, /class="[^"]*break-all[^"]*"/, `expected ${marker} text to wrap at arbitrary break points`);
  }
}

test('PortalHome builds a meaningful zero-content portal without external runtime dependencies', () => {
  assert.equal(existsSync(harnessSource), false, 'expected the dedicated homepage harness route to be absent before the test');
  assert.equal(existsSync(harnessRoute), false, 'expected the dedicated homepage harness router to be absent before the test');

  try {
    writeFileSync(
      harnessSource,
      `---
import PortalHome from '../components/home/PortalHome.astro';
import { buildHomeModel } from '../utils/homeModel';

const model = buildHomeModel({ posts: [], talks: [], knowledge: [], projects: [], updates: [] });
---

<PortalHome model={model} />
`,
      'utf8',
    );
    writeFileSync(
      harnessRoute,
      `---
import PortalHomeTestPage from './__portal-home-test.astro';

export function getStaticPaths() {
  return [{ params: { portalHomeTest: '__portal-home-test' } }];
}
---

<PortalHomeTestPage />
`,
      'utf8',
    );

    const result = spawnSync(process.execPath, [astroCli, 'build'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        NO_COLOR: '1',
        PUBLIC_SITE_URL: 'https://tsun.test',
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, `expected PortalHome harness build to succeed:\n${output}`);

    const htmlPath = path.join(harnessOutput, 'index.html');
    assert.ok(existsSync(htmlPath), 'expected the dedicated portal homepage output');
    const html = readFileSync(htmlPath, 'utf8');
    assert.deepEqual(
      [...html.matchAll(/<section\b[^>]*\bid=(?:"([^"]+)"|([^\s>]+))/g)].map((match) => match[1] ?? match[2]),
      sectionIds,
      'expected the complete portal section sequence',
    );
    assert.equal((html.match(/data-start-path=/g) ?? []).length, 3, 'expected three start-path markers');
    assert.match(html, /data-start-path=(?:"\/start"|\/start)/);
    assert.match(html, /data-start-path=(?:"\/knowledge"|\/knowledge)/);
    assert.match(html, /data-start-path=(?:"\/projects"|\/projects)/);
    assert.match(html, /SunTBurst/);
    assert.match(html, /SunTBurst 个人门户/);
    assert.match(html, /href=(?:"\/posts"|\/posts)/);
    assert.match(html, /文章集合/);
    for (const href of ['/search', '/explore', '/today', '/favorites', '/calendar', '/timeline', '/rss.xml', '/weather', '/random-image', '/github', '/ai', '/stats', '/status', '/subscribe', '/comments-policy', '/music']) {
      assert.match(html, new RegExp(`href=(?:"${href}"|${href})`), `expected homepage tool link ${href}`);
    }
    assert.equal((html.match(/data-knowledge-topic=/g) ?? []).length, 3, 'expected every knowledge topic to be a link');
    assert.equal((html.match(/data-portal-tool=/g) ?? []).length, 16, 'expected all ready and preview tools to remain discoverable');
    assert.match(html, /公开记录/);
    assert.match(html, /可用工具/);
    assert.doesNotMatch(html, /预览尚未配置|尚未配置。/);
    assert.doesNotMatch(html, /(?:访问|在线|用户|文章)[^<\n]{0,16}\d+/);
    assert.doesNotMatch(html, /upxuu|private|service_role/i);
    assert.doesNotMatch(html, /(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    assert.doesNotMatch(html, /https?:\/\//);
  } finally {
    rmSync(harnessSource, { force: true });
    rmSync(harnessRoute, { force: true });
    rmSync(harnessOutput, { recursive: true, force: true });
  }
});

test('PortalHome emits full-size touch targets for every editorial content link', () => {
  assert.equal(existsSync(touchHarnessSource), false, 'expected the touch-target harness source to be absent before the test');
  assert.equal(existsSync(touchHarnessRoute), false, 'expected the touch-target harness router to be absent before the test');

  try {
    writeFileSync(
      touchHarnessSource,
      `---
import PortalHome from '../components/home/PortalHome.astro';
import { buildHomeModel } from '../utils/homeModel';

const post = {
  id: 'post:touch-target',
  kind: 'post',
  title: '${longUnbrokenToken}',
  description: '用于验证真实构建产物中的内容链接触达范围。',
  href: '/posts/${longUnbrokenToken.toLowerCase()}',
  updatedAt: '2026-08-31',
  topics: [],
};
const model = buildHomeModel({ posts: [post], talks: [], knowledge: [], projects: [], updates: [] });
---

<PortalHome model={model} />
`,
      'utf8',
    );
    writeFileSync(
      touchHarnessRoute,
      `---
import PortalHomeTouchTargetTestPage from './__portal-home-touch-target-test.astro';

export function getStaticPaths() {
  return [{ params: { portalHomeTouchTargetTest: '__portal-home-touch-target-test' } }];
}
---

<PortalHomeTouchTargetTestPage />
`,
      'utf8',
    );

    const result = spawnSync(process.execPath, [astroCli, 'build'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        NO_COLOR: '1',
        PUBLIC_SITE_URL: 'https://tsun.test',
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, `expected touch-target harness build to succeed:\n${output}`);

    const htmlPath = path.join(touchHarnessOutput, 'index.html');
    assert.ok(existsSync(htmlPath), 'expected the dedicated touch-target homepage output');
    const html = readFileSync(htmlPath, 'utf8');
    assert.match(html, new RegExp(longUnbrokenToken), 'expected the long unbroken fixture title in the emitted page');
    assertTouchTarget(html, 'start-current', 3);
    assertTouchTarget(html, 'start-next', 3);
    assertTouchTarget(html, 'project-primary', 1);
    assertTouchTarget(html, 'activity-entry', 1);
    assertTouchTarget(html, 'random-entry', 1);
    assertTouchTarget(html, 'recent-post', 1);
  } finally {
    rmSync(touchHarnessSource, { force: true });
    rmSync(touchHarnessRoute, { force: true });
    rmSync(touchHarnessOutput, { recursive: true, force: true });
  }
});
