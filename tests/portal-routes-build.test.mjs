import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

const fixedRoutes = [
  '/',
  '/start',
  '/knowledge',
  '/knowledge/personal-portal-map/',
  '/knowledge/knowledge-visibility-boundary/',
  '/knowledge/knowledge-publishing-pipeline/',
  '/knowledge/ai-answer-contract/',
  '/projects',
  '/projects/suntburst-portal/',
  '/now',
  '/changelog',
  '/posts',
  '/archive',
  '/categories',
  '/tags',
  '/calendar',
  '/timeline',
  '/explore',
  '/topics',
  '/topics/site-building',
  '/topics/knowledge-management',
  '/topics/ai-knowledge',
  '/search',
  '/lab',
  '/favorites',
  '/weather',
  '/random-image',
  '/github',
  '/ai',
  '/music',
  '/stats',
  '/status',
  '/subscribe',
  '/talks',
  '/about',
  '/friends',
  '/privacy',
];

function hrefToHtmlPath(href) {
  const pathname = new URL(href, 'https://portal.test').pathname;
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return segments.length === 0
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...segments, 'index.html');
}

function readRoute(href) {
  const target = hrefToHtmlPath(href);
  assert.ok(existsSync(target), `missing ${href}`);
  return readFileSync(target, 'utf8');
}

test('production build emits every fixed and indexed public HTML route with honest previews', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected route inventory build to succeed:\n${result.output}`);

  for (const route of fixedRoutes) readRoute(route);

  const entries = JSON.parse(readFileSync(path.join(distDir, 'portal-index.json'), 'utf8'));
  for (const entry of entries) {
    assert.match(entry.href, /^\/(?!\/)/, `expected local portal href for ${entry.id}`);
    readRoute(entry.href);
  }

  const detailEntries = entries.filter(({ kind }) => kind === 'knowledge' || kind === 'project');
  assert.ok(detailEntries.length >= 2, 'expected published knowledge and project details in the portal index');
  for (const entry of detailEntries) readRoute(entry.href);

  for (const feature of ['ai', 'music', 'subscribe']) {
    const html = readRoute(`/${feature}`);
    assert.match(html, new RegExp(`data-feature="${feature}"`), `expected ${feature} feature identity`);
    assert.match(html, /data-state="preview"/, `expected ${feature} to remain an honest preview`);
  }

  const searchHtml = readRoute('/search');
  assert.match(searchHtml, /id="portal-search-keyboard-help"/, 'expected visible keyboard guidance for real result-link focus');
  assert.match(searchHtml, /<input\b(?=[^>]*id="portal-search")(?=[^>]*aria-describedby="portal-search-keyboard-help")[^>]*>/, 'expected search input to expose its keyboard guidance');
  const resultLinks = Array.from(searchHtml.matchAll(/<a\b(?=[^>]*data-search-result)(?=[^>]*id="portal-search-result-\d+")(?=[^>]*href="\/(?!\/)[^"]+")[^>]*>/g), ([link]) => link);
  assert.ok(resultLinks.length > 0, 'expected focusable ordinary links with stable result identities');
  assert.ok(resultLinks.every((link) => /min-h-\[44px\]/.test(link)), 'expected every search result link to keep a 44px target');

  const labHtml = readRoute('/lab');
  const readyLabHrefs = Array.from(labHtml.matchAll(/<a\b(?=[^>]*data-lab-tool="ready")(?=[^>]*href="([^"]+)")[^>]*>/g), (match) => match[1]);
  assert.deepEqual(
    readyLabHrefs,
    ['/search', '/explore', '/favorites', '/calendar', '/timeline', '/rss.xml', '/weather', '/random-image', '/github', '/stats', '/status'],
    'expected the lab to explain every tool counted as available on the homepage',
  );

  const weatherHtml = readRoute('/weather');
  assert.match(weatherHtml, /data-weather-state="idle"/, 'expected weather to wait for explicit visitor action');
  assert.match(weatherHtml, /点击后才会向 Open-Meteo 发送请求/, 'expected an explicit external-request disclosure');
  assert.match(weatherHtml, /查看利雅得实时天气/, 'expected an explicit activation control');
  assert.doesNotMatch(weatherHtml, /api\.open-meteo\.com/, 'expected the static page not to embed or preload the weather endpoint');

  const randomImageHtml = readRoute('/random-image');
  assert.match(randomImageHtml, /data-random-image-panel/, 'expected the licensed random-image tool');
  assert.equal((randomImageHtml.match(/data-curated-image=/g) ?? []).length, 1, 'expected one dimensioned image to load at a time');
  assert.match(randomImageHtml, /width="1200"/);
  assert.match(randomImageHtml, /height="800"/);
  assert.match(randomImageHtml, /换一张/);
  assert.match(randomImageHtml, /本站自有使用权/);
  assert.doesNotMatch(randomImageHtml, /https?:\/\/(?:picsum|images\.unsplash|source\.unsplash)/i, 'expected no unknown image hotlink');

  const githubHtml = readRoute('/github');
  assert.match(githubHtml, /data-public-profile-source="github"/);
  assert.match(githubHtml, /数据快照/);
  assert.match(githubHtml, /SunTBurst\.github\.io/);
  assert.doesNotMatch(githubHtml, /api\.github\.com|GITHUB_TOKEN|github_pat_|must-not-leak/i);
  const previewLabHrefs = Array.from(labHtml.matchAll(/<a\b(?=[^>]*data-lab-tool="preview")(?=[^>]*href="([^"]+)")[^>]*>/g), (match) => match[1]);
  assert.deepEqual(
    previewLabHrefs,
    ['/ai', '/subscribe', '/music'],
    'expected the lab to keep every planned external capability discoverable without claiming it is live',
  );

  const statsHtml = readRoute('/stats');
  assert.match(statsHtml, /data-site-metrics/);
  assert.match(statsHtml, /不追踪访客/);
  assert.doesNotMatch(statsHtml, /data-state="preview"|data-feature="stats"/);

  const statusHtml = readRoute('/status');
  assert.match(statusHtml, /data-build-status="verified-at-build"/);
  assert.match(statusHtml, /构建时已验证/);
  assert.doesNotMatch(statusHtml, /data-state="preview"|data-feature="status"/);

  const startHtml = readRoute('/start');
  assert.equal((startHtml.match(/data-visitor-journey=/g) ?? []).length, 3, 'expected three purposeful visitor journeys');
  const journeyStops = Array.from(startHtml.matchAll(/<a\b(?=[^>]*data-journey-stop)(?=[^>]*href="([^"]+)")[^>]*>/g), (match) => match[1]);
  assert.deepEqual(
    journeyStops,
    ['/about', '/now', '/changelog', '/knowledge/knowledge-visibility-boundary/', '/knowledge/knowledge-publishing-pipeline/', '/knowledge/ai-answer-contract/', '/projects', '/topics/site-building', '/lab'],
    'expected each journey to provide three ordinary local stops in editorial order',
  );
  for (const href of journeyStops) readRoute(href);

  const aboutHtml = readRoute('/about');
  assert.equal((aboutHtml.match(/data-editorial-principle=/g) ?? []).length, 4, 'expected four explicit editorial principles');
  assert.match(aboutHtml, /这个空间如何生长/);
  assert.match(aboutHtml, /公开与私有的边界/);

  const nowHtml = readRoute('/now');
  assert.equal((nowHtml.match(/data-current-focus(?:=|\s|>)/g) ?? []).length, 2, 'expected the current focus to remain explicit');
  assert.equal((nowHtml.match(/data-roadmap-item=/g) ?? []).length, 3, 'expected three honest next-stage items');
  assert.match(nowHtml, /已完成/);
  assert.match(nowHtml, /需要配置/);

  const projectHtml = readRoute('/projects/suntburst-portal/');
  for (const heading of ['为什么建设这个门户', '已经具备什么', '当前结构', '下一步如何验收']) {
    assert.match(projectHtml, new RegExp(heading), `expected project detail section ${heading}`);
  }
  assert.match(projectHtml, /data-project-status="building"[^>]*>建设中</, 'expected a natural project status label');

  const knowledgeHtml = readRoute('/knowledge/personal-portal-map/');
  for (const heading of ['公开层如何组织', '私有层为什么分开', 'AI 接入前置条件', '如何使用这张地图']) {
    assert.match(knowledgeHtml, new RegExp(heading), `expected knowledge detail section ${heading}`);
  }
  assert.match(knowledgeHtml, /data-knowledge-status="growing"[^>]*>持续生长</, 'expected a natural knowledge status label');

  const changelogHtml = readRoute('/changelog');
  assert.match(changelogHtml, /门户探索与阅读体验完成升级/, 'expected the latest verified site change to be visible');
  assert.match(changelogHtml, /data-update-kind="site"[^>]*>站点</, 'expected a natural update kind label');
  assert.match(changelogHtml, /data-update-status="completed"[^>]*>已完成</, 'expected a natural update status label');

  const topicsHtml = readRoute('/topics');
  assert.equal((topicsHtml.match(/data-topic-status=/g) ?? []).length, 3, 'expected every topic status to be translated at the display boundary');
  assert.doesNotMatch(topicsHtml, />\s*(?:mapping|growing|established)\s*</, 'expected no raw topic status in visitor-facing text');

  for (const unknownRoute of ['/knowledge/not-published/', '/projects/not-published/', '/topics/not-configured/']) {
    assert.equal(existsSync(hrefToHtmlPath(unknownRoute)), false, `expected unknown route ${unknownRoute} not to be generated`);
  }
});
