import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('AI guide builds as an honest local public-knowledge retrieval tool', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected AI guide build to succeed:\n${result.output}`);

  const html = readFileSync(path.join(distDir, 'ai', 'index.html'), 'utf8');
  assert.match(html, /data-knowledge-guide/);
  assert.match(html, /data-guide-state="idle"/);
  assert.match(html, /本地检索基础版/);
  assert.match(html, /不调用大模型/);
  assert.match(html, /当前未知/);
  assert.equal((html.match(/data-guide-question=/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-feature="ai"|data-state="preview"/);

  const guideScript = collectTextArtifacts(distDir).filter(({ path: artifactPath }) => /KnowledgeGuide\..+\.js$/.test(artifactPath));
  assert.equal(guideScript.length, 1, 'expected one hydrated public-knowledge guide bundle');
  assert.deepEqual(findUnexpectedRuntimeSinks(guideScript), [], 'expected no browser network capability in the guide');

  const privacyHtml = readFileSync(path.join(distDir, 'privacy', 'index.html'), 'utf8');
  assert.match(privacyHtml, /公开知识问答/);
  assert.match(privacyHtml, /问题不会离开当前页面/);
  assert.match(privacyHtml, /不调用外部模型/);
});
