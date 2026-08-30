import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(projectRoot, 'src', 'content', 'posts', '__timezone-boundary.md');

test('page and feed dates stay on Asia/Riyadh semantics across build-machine time zones', async () => {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, [
    '---',
    'title: TIMEZONE_BOUNDARY_ENTRY',
    'published: 2026-08-30T22:30:00Z',
    'slug: timezone-boundary',
    '---',
    '',
    '用于验证日期边界。',
    '',
  ].join('\n'), 'utf8');

  try {
    for (const machineTimeZone of ['UTC', 'America/Los_Angeles']) {
      const result = buildProject(projectRoot, 'https://tsun.test', { TZ: machineTimeZone });
      assert.equal(result.status, 0, `expected build under TZ=${machineTimeZone} to succeed:\n${result.output}`);
      const page = await readFile(path.join(projectRoot, 'dist', 'posts', 'timezone-boundary', 'index.html'), 'utf8');
      const sitemap = await readFile(path.join(projectRoot, 'dist', 'sitemap.xml'), 'utf8');
      const rss = await readFile(path.join(projectRoot, 'dist', 'rss.xml'), 'utf8');

      assert.match(page, /2026-08-31 01:30:00/, `expected Riyadh wall time under TZ=${machineTimeZone}`);
      assert.match(sitemap, /timezone-boundary\/<\/loc>\s*<lastmod>2026-08-31<\/lastmod>/, `expected Riyadh sitemap date under TZ=${machineTimeZone}`);
      assert.match(rss, /<pubDate>Sun, 30 Aug 2026 22:30:00 GMT<\/pubDate>/, `expected the same instant in RSS under TZ=${machineTimeZone}`);
    }
  } finally {
    await rm(fixturePath, { force: true });
  }
});
