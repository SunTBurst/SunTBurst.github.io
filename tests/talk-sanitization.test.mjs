import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(projectRoot, 'src', 'content', 'talks', '__security-fixture.md');

test('built talk pages render ordinary Markdown without executable HTML or unsafe protocols', async () => {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, [
    '---',
    'title: 安全渲染测试',
    'published: 2026-08-30T20:00:00+03:00',
    'slug: security-fixture',
    '---',
    '',
    '普通 **加粗内容** 与 [站内链接](/about)。',
    '',
    '![合法单图](/images/avatar.svg)',
    '',
    '<img src="x" onerror="alert(1)">',
    '<script>window.__talk_xss = true</script>',
    '[危险链接](javascript:alert(1))',
    '',
  ].join('\n'), 'utf8');

  try {
    const result = buildProject(projectRoot);
    assert.equal(result.status, 0, `expected fixture build to succeed:\n${result.output}`);
    const talkPage = await readFile(path.join(projectRoot, 'dist', 'talk', 'security-fixture', 'index.html'), 'utf8');
    const talksPage = await readFile(path.join(projectRoot, 'dist', 'talks', 'index.html'), 'utf8');

    for (const output of [talkPage, talksPage]) {
      assert.doesNotMatch(output, /<script\b[^>]*>window\.__talk_xss/i, 'expected raw script HTML to be inert');
      assert.doesNotMatch(output, /<img\b[^>]*\bonerror\s*=/i, 'expected event-handler attributes to be absent');
      assert.doesNotMatch(output, /<a\b[^>]*href=["']javascript:/i, 'expected unsafe link protocols to be absent');
      assert.match(output, /<strong>加粗内容<\/strong>/, 'expected ordinary Markdown emphasis to render');
      assert.match(output, /<a\b[^>]*href="\/about"[^>]*>站内链接<\/a>/, 'expected an ordinary local Markdown link to render');
      assert.match(output, /<img\b[^>]*src="\/images\/avatar\.svg"[^>]*alt="合法单图"/i, 'expected one safe local talk image to render');
    }
  } finally {
    await rm(fixturePath, { force: true });
  }
});
