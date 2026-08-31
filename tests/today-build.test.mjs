import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('today page builds a stable three-stop Riyadh trail without tracking', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected daily trail build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'today', 'index.html'), 'utf8');
  assert.match(html, /data-daily-trail/);
  assert.match(html, /data-trail-state="ready"/);
  assert.equal((html.match(/data-trail-stop=/g) ?? []).length, 3);
  for (const label of ['读一条知识', '看一项实践', '打开一个工具']) assert.match(html, new RegExp(label));
  assert.match(html, /按利雅得日期/);
  assert.match(html, /不读取设备定位/);
  assert.match(html, /明天会换成另一条路线/);

  const trailScript = collectTextArtifacts(distDir).filter(({ path: artifactPath }) => /DailyTrail\..+\.js$/.test(artifactPath));
  assert.equal(trailScript.length, 1, 'expected one hydrated daily-trail bundle');
  assert.deepEqual(findUnexpectedRuntimeSinks(trailScript), [], 'expected no browser network capability in the daily trail');
  assert.doesNotMatch(trailScript[0].text, /localStorage|sessionStorage|geolocation/);

  const homeHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const labHtml = readFileSync(path.join(distDir, 'lab', 'index.html'), 'utf8');
  const startHtml = readFileSync(path.join(distDir, 'start', 'index.html'), 'utf8');
  const sitemap = readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  assert.match(homeHtml, /href="\/today"/);
  assert.match(labHtml, /href="\/today"/);
  assert.match(startHtml, /href="\/today"/);
  assert.match(sitemap, /<loc>https:\/\/tsun\.test\/today\/<\/loc>/);
});
