import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function htmlPath(href) {
  const parts = new URL(href, 'https://portal.test').pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return parts.length ? path.join(dist, ...parts, 'index.html') : path.join(dist, 'index.html');
}

function readRoute(href) {
  const file = htmlPath(href);
  assert.equal(existsSync(file), true, `missing ${href}`);
  return readFileSync(file, 'utf8');
}

test('all four public detail kinds emit honest comment previews', () => {
  const result = buildProject(root);
  assert.equal(result.status, 0, `comment route build failed:\n${result.output}`);
  const entries = JSON.parse(readFileSync(path.join(dist, 'portal-index.json'), 'utf8'));
  const kinds = ['post', 'talk', 'knowledge', 'project'];
  for (const kind of kinds) {
    const entry = entries.find((item) => item.kind === kind);
    assert.ok(entry, `missing ${kind} fixture`);
    const html = readRoute(entry.href);
    assert.match(html, new RegExp(`data-comments-target="${kind}:${entry.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /data-comments-state="preview"/);
    assert.doesNotMatch(html, /<textarea\b[^>]*id="comment-body"/);
  }
});

test('policy is public while moderation remains noindex and inert in preview', () => {
  const policy = readRoute('/comments-policy');
  for (const phrase of ['GitHub', 'AI 审核', '人工审核', '纯文本', '保留期限', '删除']) {
    assert.match(policy, new RegExp(phrase));
  }
  const moderation = readRoute('/moderation');
  assert.match(moderation, /name="robots" content="noindex,nofollow"/);
  assert.match(moderation, /data-moderation-state="preview"/);
  assert.doesNotMatch(moderation, /data-moderation-queue|审核通过|拒绝公开/);
});

test('comment rules are discoverable without claiming the backend is live', () => {
  const index = JSON.parse(readFileSync(path.join(dist, 'portal-index.json'), 'utf8'));
  assert.ok(index.some((item) => item.href === '/comments-policy'));
  const lab = readRoute('/lab');
  assert.match(lab, /data-lab-tool="preview"[^>]*href="\/comments-policy"|href="\/comments-policy"[^>]*data-lab-tool="preview"/);
});
