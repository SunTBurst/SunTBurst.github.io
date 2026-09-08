import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const knowledgeSlugs = [
  'knowledge-visibility-boundary',
  'knowledge-publishing-pipeline',
  'ai-answer-contract',
];

function readRoute(href) {
  const pathname = new URL(href, 'https://portal.test').pathname;
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const target = segments.length === 0 ? path.join(distDir, 'index.html') : path.join(distDir, ...segments, 'index.html');
  assert.ok(existsSync(target), `expected built route ${href}`);
  return readFileSync(target, 'utf8');
}

test('public knowledge forms a useful three-step path instead of an empty topic frame', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected knowledge build to succeed:\n${result.output}`);

  const pages = Object.fromEntries(knowledgeSlugs.map((slug) => [slug, readRoute(`/knowledge/${slug}/`)]));
  for (const [slug, html] of Object.entries(pages)) {
    const otherSlugs = knowledgeSlugs.filter((candidate) => candidate !== slug);
    assert.ok(otherSlugs.some((candidate) => html.includes(`/knowledge/${candidate}/`)), `expected ${slug} to point to another knowledge step`);
    assert.match(html, /这是公开发布快照/, `expected ${slug} to retain the public/private boundary`);
    const bodyHeadingIndex = html.indexOf('id="knowledge-body-title"');
    const firstShiftedHeadingIndex = html.indexOf('<h3');
    assert.ok(bodyHeadingIndex > 0 && bodyHeadingIndex < firstShiftedHeadingIndex, `expected ${slug} to bridge its h1 and Markdown h3 headings with a body h2`);
  }

  for (const heading of ['先判断内容属于哪一层', '四个判断问题', '从私有材料到公开快照']) {
    assert.match(pages['knowledge-visibility-boundary'], new RegExp(heading), `expected boundary section ${heading}`);
  }
  for (const heading of ['整理不是搬运', '六步整理路径', '最小知识卡片']) {
    assert.match(pages['knowledge-publishing-pipeline'], new RegExp(heading), `expected pipeline section ${heading}`);
  }
  for (const heading of ['一份回答契约', '权限先于相似度', '不确定时如何回答']) {
    assert.match(pages['ai-answer-contract'], new RegExp(heading), `expected AI contract section ${heading}`);
  }

  const knowledgeIndex = readRoute('/knowledge');
  for (const slug of knowledgeSlugs) assert.match(knowledgeIndex, new RegExp(`/knowledge/${slug}/`), `expected knowledge index entry ${slug}`);
  assert.equal((knowledgeIndex.match(/data-knowledge-path-step=/g) ?? []).length, 3, 'expected a three-step guided knowledge path');

  const aiTopic = readRoute('/topics/ai-knowledge');
  assert.doesNotMatch(aiTopic, /尚无匹配的已发布内容/, 'expected the AI topic to contain real public knowledge');
  assert.match(aiTopic, /AI 回答的引用、权限与不确定性/);
  assert.match(aiTopic, /公开与私有：知识应该放在哪里/);

  const start = readRoute('/start');
  const knowledgeJourney = start.match(/<li\b[^>]*data-visitor-journey="knowledge-route"[^>]*>([\s\S]*?)<\/li>\s*<\/ol>/)?.[1] ?? '';
  for (const slug of knowledgeSlugs) assert.match(knowledgeJourney, new RegExp(`/knowledge/${slug}/`), `expected journey stop ${slug}`);

  const home = readRoute('/');
  assert.match(home, /href="\/knowledge"/, 'expected knowledge to remain discoverable from the compact homepage navigation');
});
