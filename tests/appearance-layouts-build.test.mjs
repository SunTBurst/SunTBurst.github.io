import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const harnessRoute = path.join(projectRoot, 'src', 'pages', '[...appearanceLayoutsHarness].astro');
const harnessOutput = path.join(projectRoot, 'dist', '__appearance-layouts');
const presets = ['paper', 'compact', 'cards'];

function markedAnchors(html, marker) {
  return Array.from(html.matchAll(new RegExp(`<a\\b(?=[^>]*\\b${marker}(?:[\\s=>]))[^>]*>`, 'g')), ([anchor]) => ({
    href: anchor.match(/\bhref="([^"]+)"/)?.[1],
    anchor,
  }));
}

test('three layouts retain every fixture entry in reading order and keep controls outside the content grids', () => {
  // This catches a layout accidentally hiding/duplicating entries, moving controls
  // into a content grid, or replacing ordinary content links with presentation UI.
  assert.equal(existsSync(harnessRoute), false);
  assert.equal(existsSync(harnessOutput), false);
  const entries = [1, 2, 3].map((index) => ({
    id: `layout-post-${index}`,
    kind: 'post',
    title: `完整文章标题 ${index} WITHALONGUNBROKENTOKENTOCHECKWRAPPING`,
    description: `完整摘要 ${index}，切换布局后仍应保留全部内容。`,
    href: `/posts/layout-post-${index}/`,
    updatedAt: `2026-09-0${4 - index}`,
    topics: ['布局测试'],
  }));
  const talkEntries = entries.map((entry, index) => ({
    ...entry, id: `layout-talk-${index + 1}`, kind: 'talk',
    title: `完整随记标题 ${index + 1}`, href: `/talk/layout-talk-${index + 1}`,
  }));
  const posts = entries.map((entry) => ({
    ...entry, date: entry.updatedAt, category: '布局测试', tags: ['完整内容'],
    searchText: entry.description,
  }));
  const talks = talkEntries.map((entry, index) => ({
    ...entry, slug: `layout-talk-${index + 1}`, date: entry.updatedAt,
    sanitizedHtml: index === 0
      ? '<p>长随记，用于在浏览器检查布局切换后的折叠状态。</p>'.repeat(100)
      : `<p>随记正文 ${index + 1}，不会因布局选择而丢失。</p>`,
    plainText: `随记正文 ${index + 1}`, images: [], tags: ['完整内容'],
    location: '', weather: '', mood: '', device: '',
  }));

  try {
    writeFileSync(harnessRoute, `---
import PortalHome from '../components/home/PortalHome.astro';
import PostBrowser from '../components/PostBrowser.svelte';
import TalksFeed from '../components/TalksFeed.svelte';
import { buildHomeModel } from '../utils/homeModel';
import '../index.css';
import '../styles/layout-presets.css';
export function getStaticPaths() {
  return ['paper', 'compact', 'cards'].map(layout => ({
    params: { appearanceLayoutsHarness: '__appearance-layouts/' + layout }, props: { layout },
  }));
}
const { layout } = Astro.props;
const model = buildHomeModel({ posts: ${JSON.stringify(entries)}, talks: ${JSON.stringify(talkEntries)}, knowledge: [], projects: [], updates: [] });
const posts = ${JSON.stringify(posts)};
const talks = ${JSON.stringify(talks)};
---
<html lang="zh-CN" data-layout={layout} data-palette="paper">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>布局验收样本</title></head>
  <body><main>
    <PortalHome model={model} />
    <section data-layout-page="posts"><PostBrowser posts={posts} client:load /></section>
    <section data-layout-page="talks"><div data-layout-talks-main><TalksFeed talks={talks} client:load /></div></section>
  </main></body>
</html>
`, 'utf8');

    const result = buildProject(projectRoot);
    assert.equal(result.status, 0, `expected appearance layout fixtures to build:\n${result.output}`);
    const expected = {
      'data-touch-target="recent-post"': ['/posts/layout-post-1/', '/posts/layout-post-2/', '/posts/layout-post-3/'],
      'data-touch-target="activity-entry"': ['/talk/layout-talk-1', '/talk/layout-talk-2', '/talk/layout-talk-3'],
      'data-post-link': ['/posts/layout-post-1/', '/posts/layout-post-2/', '/posts/layout-post-3/'],
      'data-talk-link': ['/talk/layout-talk-1', '/talk/layout-talk-2', '/talk/layout-talk-3'],
    };
    for (const preset of presets) {
      const html = readFileSync(path.join(harnessOutput, preset, 'index.html'), 'utf8');
      assert.match(html, new RegExp(`<html\\b[^>]*data-layout="${preset}"`));
      for (const [marker, hrefs] of Object.entries(expected)) {
        const anchors = markedAnchors(html, marker);
        assert.deepEqual(anchors.map(({ href }) => href), hrefs, `${preset}: preserve ${marker} order and destinations`);
        assert.ok(anchors.every(({ anchor }) => /min-h-\[44px\]/.test(anchor)), `${preset}: keep usable link targets`);
      }
      assert.match(html, /data-layout-home/);
      assert.match(html, /data-layout-home-sections/);
      assert.equal((html.match(/\bdata-layout-post-card(?:[\s=>])/g) ?? []).length, 3);
      assert.equal((html.match(/\bdata-layout-talk-card(?:[\s=>])/g) ?? []).length, 3);
      assert.ok(html.indexOf('id="identity"') < html.indexOf('id="recent-posts"'));
      assert.ok(html.indexOf('id="recent-posts"') < html.indexOf('id="recent-activity"'));
      assert.ok(html.indexOf('data-layout-post-filters') < html.indexOf('data-layout-post-list'));
      assert.ok(html.indexOf('data-layout-talk-controls') < html.indexOf('data-layout-talk-list'));
      assert.match(html, /name="q"/);
      assert.match(html, /name="category"/);
      assert.match(html, /name="tag"/);
      for (const index of [1, 2, 3]) {
        assert.ok(html.includes(`完整摘要 ${index}，切换布局后仍应保留全部内容。`));
        assert.ok(html.includes(`完整随记标题 ${index}`));
      }
    }
    const talksHtml = readFileSync(path.join(projectRoot, 'dist', 'talks', 'index.html'), 'utf8');
    assert.match(talksHtml, /data-layout-talks-sidebar/);
    assert.match(talksHtml, /CalendarWidget|内容日历|日历/, 'the actual talks route retains its calendar/sidebar content');
  } finally {
    rmSync(harnessRoute, { force: true });
    rmSync(harnessOutput, { recursive: true, force: true });
  }
});
