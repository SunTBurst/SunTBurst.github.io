import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');

test('comment section has a build-time preview gate with no composer sink', () => {
  const sectionPath = path.join(root, 'src', 'components', 'comments', 'CommentsSection.astro');
  assert.equal(existsSync(sectionPath), true);
  const section = source('src', 'components', 'comments', 'CommentsSection.astro');
  assert.match(section, /data-comments-state="preview"/);
  assert.match(section, /commentPublicConfig\.state === 'enabled'/);
  const previewBranch = section.match(/data-comments-state="preview"[\s\S]+?data-comments-preview-end/)?.[0] ?? '';
  assert.doesNotMatch(previewBranch, /textarea|publishableKey|endpoint/);
});

test('enabled panel is plain-text, bounded, and GitHub-only', () => {
  const panelPath = path.join(root, 'src', 'components', 'comments', 'CommentsPanel.svelte');
  assert.equal(existsSync(panelPath), true);
  const panel = source('src', 'components', 'comments', 'CommentsPanel.svelte');
  assert.match(panel, /maxlength="2000"/);
  assert.match(panel, /comments-policy/);
  assert.match(panel, /loginWithGitHub/);
  assert.match(panel, /client:visible|onMount/);
  assert.doesNotMatch(panel, /\{@html\}/);
  assert.doesNotMatch(panel, /api\.openai\.com|api\.moonshot\.|api\.deepseek\.com/i);
});
