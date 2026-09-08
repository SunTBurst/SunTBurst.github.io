import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

function tagsWithMarker(html, marker) {
  return [...html.matchAll(new RegExp(`<(?:a|button|span)\\b(?=[^>]*\\b${marker})[^>]*>`, 'g'))].map((match) => match[0]);
}

test('portal provides a keyboard bypass and keeps active navigation text at AA contrast', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected accessibility build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const skipLink = html.match(/<a\b(?=[^>]*data-skip-link)(?=[^>]*href="#main-content")[^>]*>\s*跳到正文\s*<\/a>/)?.[0];
  assert.ok(skipLink, 'expected a visible-on-focus skip link to the main landmark');
  assert.match(skipLink, /class="[^"]*focus:[^"]*"/, 'expected the skip link to become visible on keyboard focus');
  assert.ok(html.indexOf(skipLink) < html.indexOf('data-portal-shell'), 'expected the skip link before the repeated navigation');

  const postsHtml = readFileSync(path.join(distDir, 'posts', 'index.html'), 'utf8');
  const activeHome = postsHtml.match(/<a\b(?=[^>]*data-desktop-primary)(?=[^>]*aria-current="page")[^>]*>/)?.[0] ?? '';
  assert.match(activeHome, /bg-\[#0369a1\]/, 'expected the active 14px navigation label to use an AA-compliant blue');
  assert.doesNotMatch(activeHome, /bg-\[#0284c7\][^>]*text-white/, 'expected the lower-contrast active color to be absent');
});

test('retained calendar and article metadata remain perceivable and comfortably operable', () => {
  const html = readFileSync(path.join(distDir, 'posts', 'hello-world', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /data-calendar-widget/, 'expected a focused article column without a calendar sidebar');
  const calendarHtml = readFileSync(path.join(distDir, 'talks', 'index.html'), 'utf8');
  const calendar = calendarHtml.match(/<(?:section|div)\b[^>]*data-calendar-widget[^>]*>/)?.[0] ?? '';
  assert.ok(calendar, 'expected the retained talks page calendar landmark');
  assert.doesNotMatch(calendar, /aria-hidden="true"/, 'expected the interactive calendar to remain exposed to assistive technology');

  const monthButtons = tagsWithMarker(calendarHtml, 'data-calendar-month');
  assert.equal(monthButtons.length, 2, 'expected previous and next month controls');
  for (const button of monthButtons) {
    assert.match(button, /min-h-\[44px\]/, 'expected a 44px-high month control');
    assert.match(button, /min-w-\[44px\]/, 'expected a 44px-wide month control');
    assert.match(button, /aria-label="(?:上一个月|下一个月)"/, 'expected a Chinese accessible name');
  }

  assert.equal(tagsWithMarker(calendarHtml, 'data-calendar-day').length > 27, true, 'expected non-interactive semantic day cells');
  assert.equal(tagsWithMarker(calendarHtml, 'data-calendar-day-button').length, 0, 'expected empty dates not to create dozens of tab stops');

  const taxonomyLinks = tagsWithMarker(html, 'data-post-taxonomy');
  assert.equal(taxonomyLinks.length, 2, 'expected the category and tag links from the fixture');
  for (const link of taxonomyLinks) {
    assert.match(link, /min-h-\[44px\]/, 'expected article taxonomy links to have a 44px hit area');
    assert.match(link, /inline-flex/, 'expected article taxonomy links to expose their full hit area');
  }

  for (const marker of ['data-post-canonical', 'data-post-license']) {
    const link = tagsWithMarker(html, marker)[0] ?? '';
    assert.match(link, /min-h-\[44px\]/, `expected ${marker} to have a 44px hit area`);
    assert.match(link, /text-\[#075985\]/, `expected ${marker} to use high-contrast link text`);
  }
});


test('article labels keep dark foregrounds on intentionally light badge and canonical surfaces', () => {
  const source = readFileSync(path.join(projectRoot, 'src', 'pages', 'posts', '[id].astro'), 'utf8');
  const links = [...source.matchAll(/<a\s[^>]*\bdata-post-(?:taxonomy|canonical)\s[^>]*>/g)].map((match) => match[0]);
  assert.equal(links.length, 3);
  for (const link of links) {
    assert.doesNotMatch(link, /dark:text-\[#bae6fd\]/);
  }
  assert.match(links[0], /bg-\[#fde68a\][^>]*text-\[#075985\]/);
  assert.match(links[2], /text-\[#075985\]/);
});
