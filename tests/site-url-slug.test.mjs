import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
const envPath = path.join(projectRoot, '.env');
const fixturePath = path.join(projectRoot, 'src', 'content', 'posts', 'site-url-slug-fixture.md');
const distDir = path.join(projectRoot, 'dist');
const envSiteUrl = 'https://from-dotenv.example';

const originalEnv = existsSync(envPath) ? readFileSync(envPath, 'utf8') : null;
let buildResult;

before(() => {
  writeFileSync(envPath, `PUBLIC_SITE_URL=${envSiteUrl}\n`, 'utf8');
  writeFileSync(
    fixturePath,
    [
      '---',
      'title: 自定义路径测试文章',
      'published: 2026-08-30',
      'description: 验证自定义 slug 能渲染源文章',
      'slug: frontmatter%2Dcustom%2Droute',
      'draft: false',
      '---',
      '',
      '这是自定义 slug 对应的正文标记。',
      '',
    ].join('\n'),
    'utf8',
  );
  rmSync(distDir, { recursive: true, force: true });

  const env = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    NO_COLOR: '1',
  };
  delete env.PUBLIC_SITE_URL;

  buildResult = spawnSync(process.execPath, [astroCli, 'build'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env,
  });
});

after(() => {
  rmSync(fixturePath, { force: true });
  if (originalEnv === null) {
    rmSync(envPath, { force: true });
  } else {
    writeFileSync(envPath, originalEnv, 'utf8');
  }
});

function assertBuildSucceeded() {
  const output = `${buildResult?.stdout ?? ''}\n${buildResult?.stderr ?? ''}`;
  assert.equal(buildResult?.status, 0, `expected production build to succeed:\n${output}`);
}

test('production build reads PUBLIC_SITE_URL from .env', () => {
  assertBuildSucceeded();
  const home = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(home, new RegExp(`${envSiteUrl.replaceAll('.', '\\.')}/`));
});

test('production build renders a post whose frontmatter slug differs from its filename', () => {
  assertBuildSucceeded();
  const customPost = readFileSync(
    path.join(distDir, 'posts', 'frontmatter-custom-route', 'index.html'),
    'utf8',
  );
  assert.match(customPost, /这是自定义 slug 对应的正文标记。/);
});
