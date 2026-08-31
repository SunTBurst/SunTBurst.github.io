import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

function hrefToHtmlPath(href) {
  const pathname = new URL(href, 'https://portal.test').pathname;
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return segments.length === 0
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...segments, 'index.html');
}

function tagsWithAttribute(html, attribute) {
  return Array.from(html.matchAll(/<(?:a|button)\b[^>]*>/g), ([tag]) => tag).filter((tag) => tag.includes(attribute));
}

test('portal shell exposes grouped desktop navigation, hydrated mobile links, and usable global tools', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected navigation build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const shellMatch = html.match(/<header\b[^>]*data-portal-shell[^>]*>([\s\S]*?)<\/header>/);
  assert.ok(shellMatch, 'expected one mounted portal shell');
  const shell = shellMatch[1];

  const primaryLabels = Array.from(shell.matchAll(/<a\b[^>]*data-desktop-primary[^>]*>([\s\S]*?)<\/a>/g), (match) => match[1].replace(/<[^>]+>/g, '').trim());
  assert.deepEqual(primaryLabels, ['首页', '文章', '知识', '项目', '动态'], 'expected exactly five desktop primary links');

  const exploreMenu = shell.match(/<details\b[^>]*data-explore-menu[^>]*>([\s\S]*?)<\/details>/)?.[1] ?? '';
  assert.match(exploreMenu, /<summary\b[^>]*>\s*探索\s*<\/summary>/, 'expected a native keyboard-operable Explore summary');
  for (const label of ['说说', '主题', '更新', '实验室', '友链', '关于']) {
    assert.match(exploreMenu, new RegExp(`>\\s*${label}\\s*</a>`), `expected ${label} in the Explore menu`);
  }

  assert.match(shell, /aria-label="打开主菜单"/, 'expected the mounted mobile drawer trigger');
  assert.match(shell, /<astro-island\b(?=[^>]*component-url="[^"]*MobileNav)(?=[^>]*client="load")[^>]*>/, 'expected MobileNav to hydrate with client:load');
  assert.match(shell, /<nav\b(?=[^>]*aria-label="主要导航")(?=[^>]*class="[^"]*hidden[^"]*xl:flex)[^>]*>/, 'expected desktop primary navigation to start at xl');
  assert.match(shell, /<details\b(?=[^>]*data-explore-menu)(?=[^>]*class="[^"]*hidden[^"]*xl:block)[^>]*>/, 'expected the Explore menu to use the same xl desktop boundary');
  assert.match(shell, /<div\b(?=[^>]*data-desktop-tools)(?=[^>]*class="[^"]*hidden[^"]*xl:block)[^>]*>/, 'expected desktop tools to use the same xl boundary');
  assert.match(shell, /<div\b(?=[^>]*data-mobile-shell)(?=[^>]*class="[^"]*xl:hidden)[^>]*>/, 'expected the mobile drawer to remain visible below xl');
  assert.match(shell, /<nav\b(?=[^>]*data-mobile-quick-nav)(?=[^>]*class="[^"]*xl:hidden)[^>]*>/, 'expected mobile quick links to remain visible below xl');

  const expectedTools = {
    search: '/search',
    random: '/explore',
    favorites: '/favorites',
    knowledge: '/knowledge',
    ai: '/ai',
  };
  for (const [tool, href] of Object.entries(expectedTools)) {
    const tags = tagsWithAttribute(shell, `data-portal-tool="${tool}"`);
    assert.equal(tags.length, 1, `expected one ${tool} global tool`);
    assert.match(tags[0], /^<a\b/, `expected ${tool} to retain an ordinary-link fallback`);
    assert.match(tags[0], new RegExp(`\\bhref="${href}"`), `expected ${tool} fallback ${href}`);
  }
  const themeTags = tagsWithAttribute(shell, 'data-portal-tool="theme"');
  assert.equal(themeTags.length, 1, 'expected one theme global tool');
  assert.match(themeTags[0], /^<button\b/, 'expected theme to remain a real button');

  const localHrefs = Array.from(shell.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)[^" ]*"[^>]*>/g), (match) => match[1]);
  assert.ok(localHrefs.length > 0, 'expected ordinary local shell links');
  for (const href of new Set(localHrefs)) {
    assert.ok(existsSync(hrefToHtmlPath(href)), `expected shell link ${href} to resolve to built HTML`);
  }

  const footerMatch = html.match(/<footer\b[^>]*data-portal-footer[^>]*>([\s\S]*?)<\/footer>/);
  assert.ok(footerMatch, 'expected a reusable portal footer');
  const footer = footerMatch[1];
  const footerLinks = Array.from(footer.matchAll(/<a\b(?=[^>]*data-footer-link)(?=[^>]*href="([^"]+)")[^>]*>([\s\S]*?)<\/a>/g), (match) => ({
    href: match[1],
    label: match[2].replace(/<[^>]+>/g, '').trim(),
  }));
  assert.deepEqual(
    footerLinks,
    [
      { href: '/start', label: '从这里开始' },
      { href: '/search', label: '全站搜索' },
      { href: '/explore', label: '随机探索' },
      { href: '/knowledge', label: '知识地图' },
      { href: '/projects', label: '项目台' },
      { href: '/timeline', label: '内容时间线' },
      { href: '/changelog', label: '更新记录' },
      { href: '/about', label: '关于这个空间' },
      { href: '/privacy', label: '隐私边界' },
    ],
    'expected the footer to offer nine editorial next steps',
  );
  for (const { href } of footerLinks) {
    assert.ok(existsSync(hrefToHtmlPath(href)), `expected footer link ${href} to resolve to built HTML`);
  }

  for (const route of ['/start', '/about', '/now', '/knowledge', '/projects', '/topics', '/lab', '/changelog', '/timeline']) {
    const landingHtml = readFileSync(hrefToHtmlPath(route), 'utf8');
    assert.doesNotMatch(landingHtml, /component-url="[^"]*PageBanner/, `expected ${route} to start with its own page content`);
    assert.match(landingHtml, /<footer\b[^>]*data-portal-footer/, `expected ${route} to end with the portal footer`);
  }
});
