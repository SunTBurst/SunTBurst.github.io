import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('friends page stays useful before the first real reciprocal link exists', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected friend directory build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'friends', 'index.html'), 'utf8');
  assert.match(html, /友链与书签/);
  assert.match(html, /data-friend-state="empty"/);
  assert.match(html, /不虚构互换关系/);
  assert.doesNotMatch(html, /这里暂时还是空的/);
  assert.equal((html.match(/data-curated-bookmark=/g) ?? []).length, 6);
  assert.equal((html.match(/data-bookmark-category=/g) ?? []).length, 3);
  assert.match(html, /href="https:\/\/github\.com\/SunTBurst\/SunTBurst\.github\.io\/issues\/new\?template=friend-link\.yml"/);
  assert.match(html, /GitHub Issue 是公开页面/);
  assert.doesNotMatch(html, /<form\b|<input\b|<textarea\b/i, 'expected no fake local application form');

  const externalCards = Array.from(html.matchAll(/<a\b(?=[^>]*data-curated-bookmark)(?=[^>]*href="https:\/\/)(?=[^>]*target="_blank")(?=[^>]*rel="noopener noreferrer")[^>]*>/g));
  assert.equal(externalCards.length, 6, 'expected every curated bookmark to open safely as an external resource');
});

test('repository provides a public, privacy-aware GitHub friend-link issue form', () => {
  const templatePath = path.join(projectRoot, '.github', 'ISSUE_TEMPLATE', 'friend-link.yml');
  assert.ok(existsSync(templatePath), 'expected a GitHub issue form for friend-link applications');
  const template = readFileSync(templatePath, 'utf8');
  assert.match(template, /^name: 友链申请/m);
  for (const field of ['site_name', 'site_url', 'summary', 'topics']) {
    assert.match(template, new RegExp(`id: ${field}`), `expected issue field ${field}`);
  }
  assert.match(template, /请勿填写邮箱、手机号或其他非公开个人信息/);
  assert.match(template, /required: true/);
  assert.match(template, /公开 Issue/);
});
