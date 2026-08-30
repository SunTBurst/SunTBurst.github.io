import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(projectRoot, 'src', 'content', 'posts', '__invalid-missing-published.md');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

test('Astro content sync rejects a post without published', async () => {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, ['---', 'title: 临时无效文章', '---', '', '仅用于校验。', ''].join('\n'), 'utf8');

  try {
    const result = spawnSync(process.execPath, [astroCli, 'sync'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, `expected Astro sync to reject the invalid fixture, but it exited 0:\n${output}`);
    assert.match(output, /published/i, `expected validation output to name the published field:\n${output}`);
  } finally {
    await rm(fixturePath, { force: true });
  }
});
