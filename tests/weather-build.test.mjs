import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedExternalUrls, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('weather is the only approved live external browser integration', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected weather build to succeed:\n${result.output}`);

  const weatherPath = path.join(distDir, 'weather', 'index.html');
  assert.ok(existsSync(weatherPath), 'expected /weather to be emitted');
  const weatherHtml = readFileSync(weatherPath, 'utf8');
  const homeHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(weatherHtml, /data-weather-panel/, 'expected the weather island on its dedicated route');
  assert.match(weatherHtml, /client="load"/, 'expected an interactive weather island');
  assert.doesNotMatch(homeHtml, /WeatherPanel/, 'expected the homepage not to load the weather island');
  assert.doesNotMatch(homeHtml, /api\.open-meteo\.com/, 'expected no automatic weather dependency on the homepage');

  const artifacts = collectTextArtifacts(distDir);
  const runtimeFindings = findUnexpectedRuntimeSinks(artifacts);
  assert.equal(runtimeFindings.length, 1, `expected one audited browser network sink, got ${JSON.stringify(runtimeFindings)}`);
  assert.equal(runtimeFindings[0]?.sink, 'fetch');

  const runtimeArtifact = artifacts.find(({ path: artifactPath }) => artifactPath === runtimeFindings[0]?.path);
  assert.ok(runtimeArtifact, 'expected to resolve the weather runtime artifact');
  assert.match(runtimeArtifact.text, /api\.open-meteo\.com/, 'expected the only fetch bundle to pin the approved host');
  assert.doesNotMatch(runtimeArtifact.text, /XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker\s*\.\s*register/);

  const urlFindings = findUnexpectedExternalUrls(artifacts, 'https://tsun.test');
  assert.ok(urlFindings.length >= 1, 'expected the live weather endpoint to remain visible to the URL audit');
  assert.ok(
    urlFindings.every(({ path: artifactPath, url }) => artifactPath === runtimeFindings[0]?.path && url.startsWith('https://api.open-meteo.com/v1/forecast')),
    `expected no external runtime URL beyond the approved forecast endpoint, got ${JSON.stringify(urlFindings)}`,
  );

  assert.match(weatherHtml, /不保存天气请求或设备信息/);
  const privacyHtml = readFileSync(path.join(distDir, 'privacy', 'index.html'), 'utf8');
  assert.match(privacyHtml, /Open-Meteo/);
  assert.match(privacyHtml, /只在你主动点击/);
});
