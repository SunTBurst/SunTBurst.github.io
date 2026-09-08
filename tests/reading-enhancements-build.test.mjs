import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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


test('article layouts show a single title, heading-based TOCs and safe original-file edit links', () => {
  const fixture = path.join(projectRoot, 'src', 'content', 'posts', 'reading-no-heading-fixture.md');
  const longFixture = path.join(projectRoot, 'src', 'content', 'posts', 'reading-long-fixture.md');
  assert.equal(existsSync(fixture), false);
  assert.equal(existsSync(longFixture), false);
  try {
    writeFileSync(fixture, '---\ntitle: "无标题短文验收"\npublished: 2026-08-30T09:00:00+03:00\nslug: reading-no-heading-fixture\ndescription: "目录空状态验收"\n---\n\n这是一篇没有正文标题的短文。\n');
    writeFileSync(longFixture, '---\ntitle: "长文目录验收"\npublished: 2026-08-30T09:00:00+03:00\nslug: reading-long-fixture\ndescription: "层级目录验收"\n---\n\n## 第一节\n\n正文。\n\n### 小节\n\n正文。\n\n## 第二节\n\n正文。\n');
    buildPortal();
    const shortHtml = readFileSync(path.join(projectRoot, 'dist', 'posts', 'reading-no-heading-fixture', 'index.html'), 'utf8');
    assert.doesNotMatch(shortHtml, /data-mobile-toc|data-desktop-toc|id="toc-container"/);
    assert.equal((shortHtml.match(/<h1\b/g) ?? []).length, 1);
    assert.doesNotMatch(shortHtml, /component-url="[^"]*PageBanner|data-calendar-widget/);
    assert.match(shortHtml, /data-post-edit/);
    assert.match(shortHtml, /https:\/\/github.com\/SunTBurst\/SunTBurst.github.io\/edit\/main\/src\/content\/posts\/reading-no-heading-fixture.md/);

    const longHtml = readFileSync(path.join(projectRoot, 'dist', 'posts', 'reading-long-fixture', 'index.html'), 'utf8');
    assert.match(longHtml, /data-mobile-toc/);
    assert.match(longHtml, /data-desktop-toc/);
    assert.equal((longHtml.match(/<h1\b/g) ?? []).length, 1);
    assert.match(longHtml, /max-w-\[780px\]/);
    assert.match(longHtml, /data-palette="paper" data-layout="paper"/);
    assert.match(longHtml, /--site-background:\s*#f7f5ef/);
    assert.match(longHtml, /--article-background:\s*#fffdf8/);
    const mobileToc = longHtml.match(/<details\b[^>]*data-mobile-toc[^>]*>([\s\S]*?)<\/details>/)?.[1] ?? '';
    const desktopToc = longHtml.match(/<aside\b[^>]*data-desktop-toc[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? '';
    const hrefs = (value) => [...value.matchAll(/href="#([^" ]+)"/g)].map((match) => match[1]);
    assert.ok(hrefs(mobileToc).length > 0);
    assert.deepEqual(hrefs(mobileToc), hrefs(desktopToc));
    for (const id of hrefs(mobileToc)) assert.ok(longHtml.includes(`id="${id}"`));
  } finally {
    rmSync(fixture, { force: true });
    rmSync(longFixture, { force: true });
    rmSync(path.join(projectRoot, 'dist', 'posts', 'reading-long-fixture'), { recursive: true, force: true });
    rmSync(path.join(projectRoot, 'dist', 'posts', 'reading-no-heading-fixture'), { recursive: true, force: true });
  }
});

test('article enhancements use one shared TOC observer and avoid duplicate copy controls', () => {
  const page = readFileSync(path.join(projectRoot, 'src', 'pages', 'posts', '[id].astro'), 'utf8');
  const enhancements = readFileSync(path.join(projectRoot, 'src', 'components', 'ArticleEnhancements.astro'), 'utf8');
  assert.doesNotMatch(page, /new IntersectionObserver/);
  assert.doesNotMatch(page, /<h3[^>]*>\{post.title\}<\/h3>/);
  assert.match(page, />文章信息<\/h3>/);
  for (const button of ['copy-btn', 'expand-btn', 'collapse-btn']) {
    assert.match(page, new RegExp(`class="${button}[^"]*min-h-\\[44px\\]`));
  }
  assert.match(page, /aria-label="复制代码" class="copy-btn[^"]*min-w-\[44px\]/);
  assert.match(page, /<article data-custom-code-blocks/);
  assert.match(enhancements, /pre.closest\('\[data-custom-code-blocks\], \[data-code-block\]'\)/);
  assert.ok(enhancements.indexOf("const codeText = pre.textContent") < enhancements.indexOf('pre.appendChild(copyBtn)'));
  assert.match(enhancements, /navigator.clipboard.writeText\(codeText\)/);
});
