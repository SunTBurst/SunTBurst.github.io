import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');

test('project provides the pinned Supabase CLI used by database verification', () => {
  const packagePath = path.join(root, 'node_modules', 'supabase', 'package.json');
  assert.equal(existsSync(packagePath), true, 'expected a project-scoped Supabase CLI dependency');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  assert.equal(packageJson.version, '2.116.0');
  const result = spawnSync(process.execPath, [path.join(path.dirname(packagePath), packageJson.bin.supabase), '--version'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout ?? ''}\n${result.stderr ?? result.error ?? ''}`);
  assert.equal(result.stdout.trim(), '2.116.0');
});

test('preview build passes the path-only public secret scanner', () => {
  const build = buildProject(root);
  assert.equal(build.status, 0, build.output);
  const cli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const scan = spawnSync(process.execPath, [cli, 'scripts/check-public-secrets.ts'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(scan.status, 0, `${scan.stdout}\n${scan.stderr}`);
  assert.match(scan.stdout, /PUBLIC_SECRET_SCAN_OK/);
  assert.doesNotMatch(scan.stdout, /sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9]/);
});

test('security scanner never prints matched secret text', () => {
  const script = read('scripts', 'check-public-secrets.ts');
  assert.doesNotMatch(script, /console\.(?:log|error)\([^\n]*(?:match\[|matched|content)/i);
  assert.match(script, /rule\.id/);
  assert.match(script, /relativePath/);
});

test('target sync is explicit, server-only, and based on the built public index', () => {
  const targetScript = path.join(root, 'scripts', 'sync-comment-targets.ts');
  assert.equal(existsSync(targetScript), true);
  const script = read('scripts', 'sync-comment-targets.ts');
  assert.match(script, /dist.+portal-index\.json/s);
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(script, /upsert/);
  assert.match(script, /active:\s*false/);
  assert.doesNotMatch(script, /sk-[A-Za-z0-9_-]{12,}/);
});

test('runbook documents external authority, key rotation, rollout, and rollback', () => {
  const runbookPath = path.join(root, 'docs', 'operations', 'comments-runbook.md');
  assert.equal(existsSync(runbookPath), true);
  const runbook = read('docs', 'operations', 'comments-runbook.md');
  for (const phrase of ['GitHub OAuth', '轮换', 'db push --dry-run', 'functions deploy', 'comments:sync-targets', 'PUBLIC_COMMENTS_STATE=preview', '回滚']) {
    assert.match(runbook, new RegExp(phrase));
  }
  assert.doesNotMatch(runbook, /sk-[A-Za-z0-9_-]{12,}/);
});
