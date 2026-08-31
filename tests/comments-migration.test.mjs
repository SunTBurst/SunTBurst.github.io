import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = path.join(projectRoot, 'supabase', 'migrations', '202608310001_prepublication_comments.sql');

function migrationSql() {
  assert.equal(existsSync(migration), true, 'expected the prepublication comment migration');
  return readFileSync(migration, 'utf8');
}

test('comment migration creates constrained prepublication records', () => {
  const sql = migrationSql();
  assert.match(sql, /create table public\.comments/i);
  assert.match(sql, /create table public\.comment_reviews/i);
  assert.match(sql, /create table public\.comment_moderation_actions/i);
  assert.match(sql, /status in \('pending','ai_reviewing','manual_review','published','rejected','deleted'\)/i);
  assert.match(sql, /target_kind in \('post','talk','knowledge','project'\)/i);
  assert.match(sql, /char_length\(body\) between 2 and 2000/i);
  assert.match(sql, /status = 'deleted'.+body is null/is);
  assert.match(sql, /unique \(author_id, idempotency_key\)/i);
});

test('comment migration exposes reads through RLS but no browser writes', () => {
  const sql = migrationSql();
  assert.match(sql, /alter table public\.comments enable row level security/i);
  assert.match(sql, /status = 'published'/i);
  assert.match(sql, /author_id = auth\.uid\(\)/i);
  assert.match(sql, /revoke all on table public\.comments from anon, authenticated/i);
  assert.match(sql, /grant select on table public\.comments to anon, authenticated/i);
  assert.doesNotMatch(sql, /create policy[^;]+for insert/is);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]+comments[^;]+(?:anon|authenticated)/is);
  assert.doesNotMatch(sql, /grant [^;]+comment_reviews[^;]+(?:anon|authenticated)/is);
  assert.doesNotMatch(sql, /grant [^;]+comment_moderation_actions[^;]+(?:anon|authenticated)/is);
});

test('comment migration defines indexes and service-only retention cleanup', () => {
  const sql = migrationSql();
  assert.match(sql, /comments_target_publication_idx/i);
  assert.match(sql, /comments_author_created_idx/i);
  assert.match(sql, /create or replace function public\.cleanup_expired_comment_content/i);
  assert.match(sql, /interval '30 days'/i);
  assert.match(sql, /interval '90 days'/i);
  assert.match(sql, /interval '180 days'/i);
  assert.match(sql, /revoke all on function public\.cleanup_expired_comment_content\(timestamptz\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.cleanup_expired_comment_content\(timestamptz\) to service_role/i);
});
