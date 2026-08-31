import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

test('service migration owns targets, rate limits, and atomic mutations', () => {
  const migrationPath = path.join(root, 'supabase', 'migrations', '202608310002_comment_service_operations.sql');
  assert.equal(existsSync(migrationPath), true);
  const sql = read('supabase', 'migrations', '202608310002_comment_service_operations.sql');
  assert.match(sql, /create table public\.comment_targets/i);
  assert.match(sql, /create or replace function public\.create_pending_comment/i);
  assert.match(sql, /interval '10 minutes'/i);
  assert.match(sql, /create or replace function public\.finalize_comment_review/i);
  assert.match(sql, /create or replace function public\.moderate_comment_atomically/i);
  assert.match(sql, /create or replace function public\.delete_own_comment_atomically/i);
  assert.match(sql, /grant execute[^;]+to service_role/is);
  assert.doesNotMatch(sql, /grant execute[^;]+to (?:anon|authenticated)/is);
});

test('all four Edge Functions exist and use shared server-side authentication', () => {
  const names = ['submit-comment', 'list-comments', 'delete-comment', 'moderate-comment'];
  for (const name of names) {
    const file = path.join(root, 'supabase', 'functions', name, 'index.ts');
    assert.equal(existsSync(file), true, `${name} should exist`);
    const source = read('supabase', 'functions', name, 'index.ts');
    assert.match(source, /serveHttp/);
    assert.doesNotMatch(source, /service_role|OPENAI_API_KEY|KIMI_API_KEY|DEEPSEEK_API_KEY/);
  }

  const http = read('supabase', 'functions', '_shared', 'comments', 'http.ts');
  assert.match(http, /identity\.provider === 'github'/);
  assert.match(http, /provider_id/);
  assert.doesNotMatch(http, /user_metadata/);
  assert.match(http, /PUBLIC_PORTAL_ORIGINS/);
});

test('the Edge Function module graph resolves with Deno exact relative imports', () => {
  const functionsRoot = path.join(root, 'supabase', 'functions');
  const relativeImport = /(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/gu;

  for (const file of collectTypeScriptFiles(functionsRoot)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(relativeImport)) {
      const specifier = match[1];
      const resolved = path.resolve(path.dirname(file), specifier);
      assert.equal(
        path.extname(resolved),
        '.ts',
        `${path.relative(root, file)} must include .ts in relative import ${specifier}`,
      );
      assert.equal(
        existsSync(resolved),
        true,
        `${path.relative(root, file)} imports missing Deno module ${specifier}`,
      );
    }
  }
});

test('moderation identity is an immutable numeric allowlist', () => {
  const runtime = read('supabase', 'functions', '_shared', 'comments', 'runtime.ts');
  assert.match(runtime, /COMMENT_MODERATOR_GITHUB_IDS/);
  assert.match(runtime, /105589585/);
  assert.doesNotMatch(runtime, /login\s*===/);
});
