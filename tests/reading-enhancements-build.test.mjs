import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

function buildPortal() {
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
  assert.equal(result.status, 0, `expected project build to succeed:\n${output}`);
  return output;
}

function assertSafeShareFeatures(htmlPath, routeName) {
  assert.ok(existsSync(htmlPath), `expected emitted html for ${routeName}`);
  const html = readFileSync(htmlPath, 'utf8');
  assert.match(html, /id=\"reading-progress\"/);
  assert.match(html, /id=\"back-to-top\"/);
  assert.match(html, /aria-label=\"返回顶部\"/);
  assert.match(html, /data-share-menu/);
  assert.doesNotMatch(html, /api\.qrserver|qrcode/i);
}

test('article enhancement controls are present in article and talk detail pages', () => {
  buildPortal();
  assertSafeShareFeatures(path.join(projectRoot, 'dist', 'posts', 'hello-world', 'index.html'), '/posts/hello-world');
  assertSafeShareFeatures(path.join(projectRoot, 'dist', 'talk', 'first-note', 'index.html'), '/talk/first-note');
});

test('reading progress uses only internal math and no browser API sinks', () => {
  buildPortal();
  const html = readFileSync(path.join(projectRoot, 'dist', 'posts', 'hello-world', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest\(|WebSocket\(/);
  assert.doesNotMatch(html, /api\.qrserver|qrcode/i);
});
