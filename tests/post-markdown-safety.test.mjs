import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { collectTextArtifacts, findUnexpectedRuntimeSinks } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(projectRoot, 'src', 'content', 'posts', 'post-markdown-safety-fixture.md');
const distDir = path.join(projectRoot, 'dist');
const builtFixturePath = path.join(distDir, 'posts', 'post-markdown-safety-fixture', 'index.html');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

const fixture = `---
title: "Post Markdown safety fixture"
published: 2026-08-30T12:00:00+03:00
draft: false
---

POST_MARKDOWN_SAFETY_VISIBLE

<script>fetch(endpoint)</script>

<button onclick="fetch(endpoint)">unsafe handler</button>

\`\`\`js
fetch(endpoint)
\`\`\`
`;

test('post Markdown keeps code examples but cannot emit executable raw HTML', () => {
  rmSync(distDir, { recursive: true, force: true });
  writeFileSync(fixturePath, fixture, 'utf8');

  try {
    const result = spawnSync(process.execPath, [astroCli, 'build'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        NO_COLOR: '1',
        PUBLIC_SITE_URL: 'https://tsun.test',
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 0, `expected fixture build to succeed:\n${output}`);
    assert.ok(existsSync(builtFixturePath), 'expected the temporary post route to be emitted');

    const html = readFileSync(builtFixturePath, 'utf8');
    assert.match(html, /POST_MARKDOWN_SAFETY_VISIBLE/, 'expected ordinary Markdown content to remain');
    assert.doesNotMatch(html, /<script[^>]*>\s*fetch\(endpoint\)\s*<\/script>/i, 'expected raw script HTML to be inert');
    assert.doesNotMatch(html, /\bonclick\s*=\s*["'][^"']*fetch\(endpoint\)/i, 'expected raw event handlers to be inert');
    const codeBlock = html.match(/<pre[^>]*data-language=["']js["'][^>]*>[\s\S]*?<\/pre>/i);
    assert.ok(codeBlock, 'expected the fenced JavaScript example to remain rendered as code');
    assert.match(
      codeBlock[0].replace(/<[^>]+>/g, ''),
      /fetch\(endpoint\)/,
      'expected the fenced JavaScript example text to remain intact',
    );
    assert.deepEqual(
      findUnexpectedRuntimeSinks(collectTextArtifacts(distDir)),
      [],
      'expected the built site to contain no executable browser network capability',
    );
  } finally {
    rmSync(fixturePath, { force: true });
  }
});
