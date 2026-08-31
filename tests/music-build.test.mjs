import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('music space builds as an explicit, local-only soundscape player', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected music space build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'music', 'index.html'), 'utf8');
  assert.match(html, /data-soundscape-player/);
  assert.match(html, /data-soundscape-state="idle"/);
  assert.equal((html.match(/data-soundscape-preset=/g) ?? []).length, 3);
  assert.match(html, /开始播放/);
  assert.match(html, /停止播放/);
  assert.match(html, /type="range"/);
  assert.match(html, /本地合成/);
  assert.match(html, /不会自动播放/);
  assert.doesNotMatch(html, /<audio\b|\bautoplay\b/i);

  const musicScript = collectTextArtifacts(distDir).filter(({ path: artifactPath }) => /SoundscapePlayer\..+\.js$/.test(artifactPath));
  assert.equal(musicScript.length, 1, 'expected one hydrated soundscape-player bundle');
  assert.deepEqual(findUnexpectedRuntimeSinks(musicScript), [], 'expected the player to have no browser network capability');

  const privacyHtml = readFileSync(path.join(distDir, 'privacy', 'index.html'), 'utf8');
  assert.match(privacyHtml, /本地声音空间/);
  assert.match(privacyHtml, /不发送网络请求/);
  assert.match(privacyHtml, /不记录播放行为/);
});
