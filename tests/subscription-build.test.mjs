import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

test('main RSS covers every public editorial record and OPML imports it', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected subscription build to succeed:\n${result.output}`);

  const entries = JSON.parse(readFileSync(path.join(distDir, 'portal-index.json'), 'utf8'));
  const expectedRecords = entries.filter(({ kind }) => kind !== 'page');
  const rss = readFileSync(path.join(distDir, 'rss.xml'), 'utf8');
  const items = Array.from(rss.matchAll(/<item>[\s\S]*?<\/item>/g), ([item]) => item);
  assert.equal(items.length, expectedRecords.length, 'expected one RSS item per public editorial record');
  for (const prefix of ['「说说」', '「知识」', '「项目」', '「更新」']) assert.match(rss, new RegExp(prefix));
  const guids = Array.from(rss.matchAll(/<guid>([^<]+)<\/guid>/g), (match) => match[1]);
  assert.equal(new Set(guids).size, guids.length, 'expected every RSS item to have a unique public URL');
  assert.doesNotMatch(rss, /draft|private|service_role/i);

  const opml = readFileSync(path.join(distDir, 'suntburst.opml'), 'utf8');
  assert.match(opml, /<opml version="2\.0">/);
  assert.match(opml, /xmlUrl="https:\/\/tsun\.test\/rss\.xml"/);
  assert.equal((opml.match(/type="rss"/g) ?? []).length, 1);
});

test('subscription center exposes working local options and keeps email honest', () => {
  const html = readFileSync(path.join(distDir, 'subscribe', 'index.html'), 'utf8');
  assert.match(html, /data-subscription-center/);
  assert.match(html, /data-subscription-option="rss"/);
  assert.match(html, /data-subscription-option="opml"/);
  assert.match(html, /data-feature="subscribe"/);
  assert.match(html, /data-state="preview"/);
  assert.match(html, /复制 RSS 地址/);
  assert.match(html, /href="\/rss\.xml"/);
  assert.match(html, /href="\/suntburst\.opml"/);
  assert.match(html, /知识、项目和站点更新/);
  assert.match(html, /暂不收集邮箱/);
  assert.doesNotMatch(html, /<form\b|type="email"/i, 'expected no unusable email form');

  const copyScript = collectTextArtifacts(distDir).filter(({ path: artifactPath }) => /FeedCopy\..+\.js$/.test(artifactPath));
  assert.equal(copyScript.length, 1, 'expected one hydrated RSS copy control');
  assert.deepEqual(findUnexpectedRuntimeSinks(copyScript), [], 'expected copying a feed URL to have no network capability');

  const privacyHtml = readFileSync(path.join(distDir, 'privacy', 'index.html'), 'utf8');
  assert.match(privacyHtml, /RSS 与 OPML/);
  assert.match(privacyHtml, /本站不接收邮箱/);
});
