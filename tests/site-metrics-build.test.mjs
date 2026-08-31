import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('stats and status expose build facts without visitor analytics', () => {
  const buildSha = 'b'.repeat(40);
  const result = buildProject(projectRoot, 'https://tsun.test', { PUBLIC_BUILD_SHA: buildSha });
  assert.equal(result.status, 0, `expected metrics build to succeed:\n${result.output}`);

  const statsHtml = readFileSync(path.join(distDir, 'stats', 'index.html'), 'utf8');
  const statusHtml = readFileSync(path.join(distDir, 'status', 'index.html'), 'utf8');
  const statusJsonPath = path.join(distDir, 'status.json');
  assert.ok(existsSync(statusJsonPath), 'expected machine-readable status snapshot');
  const status = JSON.parse(readFileSync(statusJsonPath, 'utf8'));
  const portalIndex = JSON.parse(readFileSync(path.join(distDir, 'portal-index.json'), 'utf8'));

  assert.match(statsHtml, /data-site-metrics/);
  assert.match(statsHtml, /不追踪访客/);
  assert.match(statsHtml, /访问量与在线人数/);
  assert.doesNotMatch(statsHtml, /(?:访问量|在线人数)[^<\n]{0,30}>?\d+/);

  assert.match(statusHtml, /data-build-status="verified-at-build"/);
  assert.match(statusHtml, new RegExp(`data-build-sha="${buildSha}"`));
  assert.equal(status.buildSha, buildSha);
  assert.equal(status.buildState, 'verified-at-build');
  assert.equal(status.metrics.indexedRoutes, portalIndex.length);
  assert.equal(status.metrics.readyTools, 13);
  assert.equal(status.metrics.previewTools, 1);
  assert.doesNotMatch(JSON.stringify(status), /api\.github\.com|GITHUB_TOKEN|github_pat_|service_role/i);
  assert.doesNotMatch(`${statsHtml}\n${statusHtml}`, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/);
});

test('Pages build receives the public commit identity', () => {
  const workflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
  assert.match(workflow, /PUBLIC_BUILD_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
});
