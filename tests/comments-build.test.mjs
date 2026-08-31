import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');

function readTree(directory) {
  return readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTree(target);
    return /\.(?:html|js|json|css|xml|txt)$/i.test(entry.name) ? readFileSync(target, 'utf8') : '';
  }).flat().join('\n');
}

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

test('preview bundle emits no comment client, endpoint, or SDK', () => {
  const result = buildProject(root);
  assert.equal(result.status, 0, result.output);
  const output = readTree(path.join(root, 'dist'));
  assert.doesNotMatch(output, /submit-comment|list-comments|supabase-js|\.supabase\.co/i);
});

test('enabled fixture emits one approved Supabase origin and no AI provider origin', () => {
  const result = buildProject(root, 'https://tsun.test', {
    PUBLIC_COMMENTS_STATE: 'enabled',
    PUBLIC_SUPABASE_URL: 'https://portal-ref.supabase.co',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_only',
    PUBLIC_COMMENT_REVIEW_PROVIDER: 'deepseek',
  });
  assert.equal(result.status, 0, result.output);
  const output = readTree(path.join(root, 'dist'));
  assert.match(output, /portal-ref\.supabase\.co/);
  assert.match(output, /submit-comment/);
  assert.doesNotMatch(output, /api\.openai\.com|api\.moonshot\.|api\.deepseek\.com|SERVICE_ROLE/i);
});
