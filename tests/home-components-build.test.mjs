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
const sectionIds = ['identity', 'recent-posts'];
const fabricatedMetric = /(?:访问|在线|用户|文章)[^<\n]{0,16}\d+/;
const visibleText = (html) => html
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<\/(?:a|p|div|section|nav|li|h[1-6])\s*>/gi, '\n')
  .replace(/<[^>]*>/g, ' ');

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
      'expected a minimal empty homepage sequence',
    );
    assert.match(html, /SunTBurst/);
    assert.match(html, /暂时没有公开文章/);
    for (const href of ['/posts', '/talks', '/about']) {
      assert.ok(html.includes(`href="${href}"`), `expected empty-state link ${href}`);
    }
    assert.doesNotMatch(html, /id="recent-activity"|id="portal-pulse"|id="portal-tools"/);
    assert.doesNotMatch(html, /预览尚未配置|尚未配置。/);
    assert.doesNotMatch(visibleText(html), fabricatedMetric);
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
const talk = { ...post, id: 'talk:touch-target', kind: 'talk', href: '/talk/real-note' };
const model = buildHomeModel({ posts: [post], talks: [talk], knowledge: [], projects: [], updates: [] });
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
    assertTouchTarget(html, 'activity-entry', 1);
    assertTouchTarget(html, 'recent-post', 1);
    assert.ok(html.indexOf('id="identity"') < html.indexOf('id="recent-posts"'));
    assert.ok(html.indexOf('id="recent-posts"') < html.indexOf('id="recent-activity"'));
    assert.match(html, /href="\/talk\/real-note"/);
    assert.match(html, /最近随记/);
    assert.doesNotMatch(html, /id="portal-pulse"|id="portal-tools"/);

  } finally {
    rmSync(touchHarnessSource, { force: true });
    rmSync(touchHarnessRoute, { force: true });
    rmSync(touchHarnessOutput, { recursive: true, force: true });
  }
});


test('homepage metric guard checks visible text without mistaking attributes for invented numbers', () => {
  assert.doesNotMatch(visibleText('<nav aria-label="暂无文章时的入口" class="mt-2"><a>关于</a></nav>'), fabricatedMetric);
  assert.doesNotMatch(visibleText('<a>浏览文章 <span>→</span></a><p>最近更新：<time>2026-08-31</time></p>'), fabricatedMetric);
  assert.match(visibleText('<p>访问量 <strong>1200</strong></p>'), fabricatedMetric);
  assert.match(visibleText('<p>在线用户 20</p>'), fabricatedMetric);
});
