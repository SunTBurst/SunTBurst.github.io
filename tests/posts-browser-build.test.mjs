import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsHtmlPath = path.join(projectRoot, 'dist', 'posts', 'index.html');

test('posts route mounts a local accessible browser with ordinary article links and no network sink', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected posts browser build to succeed:\n${result.output}`);

  const html = readFileSync(postsHtmlPath, 'utf8');
  assert.match(html, /<astro-island\b(?=[^>]*component-url="[^"]*PostBrowser)(?=[^>]*client="load")[^>]*>/, 'expected the posts browser to hydrate with client:load');
  assert.match(html, /data-post-browser/, 'expected the in-page browser shell');
  assert.match(html, /<input\b(?=[^>]*name="q")(?=[^>]*type="search")[^>]*>/, 'expected a visible local post search');
  assert.match(html, /<select\b[^>]*name="category"/, 'expected a category filter');
  assert.match(html, /<select\b[^>]*name="tag"/, 'expected a tag filter');
  assert.match(html, /<a\b(?=[^>]*data-post-link)(?=[^>]*href="\/posts\/[^"]+\/")[^>]*>/, 'expected ordinary local article links in the server output');
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, 'expected the posts browser to remain network-free');
});
