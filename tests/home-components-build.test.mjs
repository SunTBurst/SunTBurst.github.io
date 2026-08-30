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
const sectionIds = [
  'identity',
  'start-here',
  'knowledge-map',
  'current-focus',
  'project-shelf',
  'recent-activity',
  'random-explore',
  'environment',
];

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
    for (const preview of ['天气预览尚未配置。', '音乐预览尚未配置。', '服务状态仅展示本地配置说明。', '访问统计预览尚未配置。', '订阅方式将在本地配置后显示。']) {
      assert.match(html, new RegExp(preview));
    }
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
