import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsHtmlPath = path.join(projectRoot, 'dist', 'posts', 'index.html');
const harnessSource = path.join(projectRoot, 'src', 'pages', '__task6-posts-browser-harness.astro');
const harnessRoute = path.join(projectRoot, 'src', 'pages', '[...task6PostsBrowserHarness].astro');
const harnessOutput = path.join(projectRoot, 'dist', '__task6-posts-browser-harness');

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
  assert.match(html, /<noscript\b[^>]*data-post-noscript[^>]*>[\s\S]*?<a\b(?=[^>]*data-noscript-post)(?=[^>]*href="\/posts\/[^"]+\/")[^>]*>/, 'expected a no-JavaScript list of every public article');
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, 'expected the posts browser to remain network-free');
});

test('seven serialized posts emit ordinary pagination and complete no-JavaScript links', () => {
  assert.equal(existsSync(harnessSource), false, 'expected the posts harness source to be absent before the test');
  assert.equal(existsSync(harnessRoute), false, 'expected the posts harness router to be absent before the test');
  assert.equal(existsSync(harnessOutput), false, 'expected the posts harness output to be absent before the test');

  try {
    const posts = Array.from({ length: 7 }, (_, index) => ({
      id: `fixture-${index + 1}`,
      title: `公开文章 ${index + 1}`,
      description: `用于验证本地文章浏览分页 ${index + 1}`,
      href: `/posts/fixture-${index + 1}/`,
      date: `2026-08-${String(20 - index).padStart(2, '0')}`,
      category: index % 2 === 0 ? '工程' : '笔记',
      tags: index % 2 === 0 ? ['公开', 'Astro'] : ['知识'],
    }));
    writeFileSync(
      harnessSource,
      `---
import PostBrowser from '../components/PostBrowser.svelte';
import PostNoscriptList from '../components/PostNoscriptList.astro';
const posts = ${JSON.stringify(posts)};
---

<PostBrowser posts={posts} client:load />
<PostNoscriptList posts={posts} />
`,
      'utf8',
    );
    writeFileSync(
      harnessRoute,
      `---
import Harness from './__task6-posts-browser-harness.astro';
export function getStaticPaths() {
  return [{ params: { task6PostsBrowserHarness: '__task6-posts-browser-harness' } }];
}
---

<Harness />
`,
      'utf8',
    );

    const result = buildProject(projectRoot);
    assert.equal(result.status, 0, `expected the dedicated posts harness build to succeed:\n${result.output}`);
    const htmlPath = path.join(harnessOutput, 'index.html');
    assert.equal(existsSync(htmlPath), true, 'expected the dedicated posts harness output');
    const html = readFileSync(htmlPath, 'utf8');
    assert.equal((html.match(/data-post-link/g) ?? []).length, 6, 'expected the first six serialized posts on page one');
    assert.equal((html.match(/data-noscript-post/g) ?? []).length, 7, 'expected all seven serialized posts in the no-JavaScript list');
    const pageLinks = Array.from(html.matchAll(/<a\b(?=[^>]*data-post-page-link)[^>]*>/g), ([link]) => link);
    assert.ok(pageLinks.length >= 2, 'expected ordinary pagination anchors for the two-page fixture');
    assert.ok(pageLinks.every((link) => /href="\/posts(?:\?[^"]*)?"/.test(link)), 'expected every pagination href to stay on the local posts route');
    assert.ok(pageLinks.every((link) => /min-h-\[44px\]/.test(link)), 'expected every pagination link to keep a 44px target');
    assert.ok(pageLinks.some((link) => /href="\/posts\?page=2"/.test(link)), 'expected an encoded page-two fallback href');
    assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, 'expected the posts harness to remain network-free');
  } finally {
    rmSync(harnessSource, { force: true });
    rmSync(harnessRoute, { force: true });
    rmSync(harnessOutput, { recursive: true, force: true });
  }
});
