import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

let buildOutput = '';

test.before(() => {
  const result = buildProject(projectRoot);
  buildOutput = result.output;
  assert.equal(result.status, 0, `expected production build to succeed:\n${buildOutput}`);
});

test('built card entrance styles reveal initially transparent content', () => {
  const article = readFileSync(path.join(distDir, 'posts', 'hello-world', 'index.html'), 'utf8');
  assert.match(
    article,
    /animate-card-entrance opacity-0/,
    'expected the existing article metadata to exercise an initially transparent card',
  );

  const css = readdirSync(path.join(distDir, '_astro'))
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(path.join(distDir, '_astro', file), 'utf8'))
    .join('\n');

  assert.match(
    css,
    /\.animate-card-entrance\{[^}]*animation:[^}]*card-entrance[^}]*\}/,
    'expected built CSS to animate cards to their visible state',
  );
  assert.match(
    css,
    /@keyframes card-entrance\{[^@]*to\{[^}]*opacity:1[^}]*\}/,
    'expected the card entrance animation to finish fully visible',
  );
  assert.match(
    css,
    /@media\(prefers-reduced-motion:reduce\)\{[^@]*\.animate-card-entrance\{[^}]*animation:none[^}]*opacity:1!important[^}]*\}/,
    'expected reduced-motion users to receive visible cards without animation',
  );
});

test('pagination redirects stop at the page count required by published posts', () => {
  const routes = [
    ['homepage', 'page'],
    ['category', path.join('category', '随笔', 'page')],
    ['tag', path.join('tag', '开始', 'page')],
  ];

  for (const [label, relativeRoute] of routes) {
    const pageOne = path.join(distDir, relativeRoute, '1', 'index.html');
    const pageTwo = path.join(distDir, relativeRoute, '2');
    assert.ok(existsSync(pageOne), `expected ${label} page 1 redirect for the single published post`);
    assert.equal(
      existsSync(pageTwo),
      false,
      `expected ${label} not to emit page 2 for the single published post`,
    );
  }
});
