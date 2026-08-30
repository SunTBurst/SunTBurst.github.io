import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import fallback from '../src/generated/public-profiles.fallback.json' with { type: 'json' };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('GitHub public activity is emitted from a redacted build-time snapshot', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected public profile build to succeed:\n${result.output}`);

  assert.equal(fallback.schemaVersion, 1);
  assert.equal(fallback.source, 'github');
  assert.equal(fallback.profile.login, 'SunTBurst');
  assert.ok(fallback.repositories.length >= 1);
  assert.ok(fallback.activity.length >= 1);
  assert.doesNotMatch(JSON.stringify(fallback), /email|location|payload|commits|token|github_pat_/i);

  const target = path.join(distDir, 'github', 'index.html');
  assert.ok(existsSync(target), 'expected /github route');
  const html = readFileSync(target, 'utf8');
  assert.match(html, /data-public-profile-source="github"/);
  assert.match(html, /href="https:\/\/github\.com\/SunTBurst"/);
  assert.doesNotMatch(html, /api\.github\.com|GITHUB_TOKEN|github_pat_|\bfetch\s*\(/i);
  assert.doesNotMatch(html, /PRIVATE-LIKE-COMMIT-BODY|must-not-leak/i);
});

test('deployment refreshes the public snapshot before the static build without exposing the token', () => {
  const workflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
  const script = readFileSync(path.join(projectRoot, 'scripts', 'generate-public-profiles.ts'), 'utf8');

  assert.match(workflow, /pnpm profile:refresh/);
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.ok(workflow.indexOf('pnpm profile:refresh') < workflow.indexOf('pnpm build'));
  assert.doesNotMatch(workflow, /permissions:[\s\S]{0,160}contents:\s*write/);
  assert.match(script, /api\.github\.com\/users\/\$\{username\}/);
  assert.doesNotMatch(script, /console\.(?:log|error)[^\n]*(?:token|authorization)/i);
});
