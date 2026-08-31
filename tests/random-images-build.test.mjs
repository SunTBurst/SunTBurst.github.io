import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import manifest from '../src/data/media/random-images.json' with { type: 'json' };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('licensed random images are local, dimensioned, credited, and emitted', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected random image build to succeed:\n${result.output}`);
  assert.equal(manifest.length, 3, 'expected a useful initial curated image pool');

  for (const image of manifest) {
    assert.match(image.src, /^\/images\/random\/[a-z0-9-]+\.jpg$/);
    assert.equal(image.width, 1200);
    assert.equal(image.height, 800);
    assert.ok(image.alt.length >= 8);
    assert.match(image.license, /自有使用权/);
    assert.match(image.credit, /SunTBurst/);
    const builtAsset = path.join(distDir, ...image.src.split('/').filter(Boolean));
    assert.ok(existsSync(builtAsset), `expected ${image.src} in production output`);
    assert.ok(statSync(builtAsset).size < 400_000, `expected ${image.src} to stay web-sized`);
  }

  const html = readFileSync(path.join(distDir, 'random-image', 'index.html'), 'utf8');
  assert.match(html, /data-random-image-panel/);
  assert.match(html, new RegExp(manifest[0].src));
  assert.match(html, new RegExp(manifest[0].alt));
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/);
});
