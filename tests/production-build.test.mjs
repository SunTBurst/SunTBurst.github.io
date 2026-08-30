import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { findUnexpectedExternalUrls } from './helpers/external-url-audit.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

function readDist(relativePath) {
  const target = path.join(distDir, ...relativePath.split('/'));
  assert.ok(existsSync(target), `expected build output ${relativePath}`);
  return readFileSync(target, 'utf8');
}

function readTextArtifacts(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTextArtifacts(target);
    if (!/\.(?:css|html|js|json|svg|txt|xml)$/.test(entry.name)) return [];
    return [readFileSync(target, 'utf8')];
  });
}

function collectTextArtifacts(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTextArtifacts(target, root);
    if (!/\.(?:html|js|xml)$/.test(entry.name)) return [];
    return [{ path: path.relative(root, target).replaceAll('\\', '/'), text: readFileSync(target, 'utf8') }];
  });
}

test('production build emits the local TSun blog without upstream services', () => {
  rmSync(distDir, { recursive: true, force: true });

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

  assert.equal(result.status, 0, `expected production build to succeed:\n${output}`);

  const home = readDist('index.html');
  assert.match(home, /TSun 的博客/, 'expected the built homepage to carry the TSun identity');
  assert.match(home, /https:\/\/tsun\.test\//, 'expected PUBLIC_SITE_URL to control generated absolute URLs');

  const welcomePost = readDist('posts/hello-world/index.html');
  assert.match(welcomePost, /欢迎来到 TSun 的博客/, 'expected the original local welcome post route');

  const firstTalk = readDist('talk/first-note/index.html');
  assert.match(firstTalk, /先从一条简短的记录开始/, 'expected the original local talk route');
  assert.match(firstTalk, /随手记/, 'expected an untitled talk to receive a natural display title');

  readDist('about/index.html');
  readDist('friends/index.html');
  const builtOutput = readTextArtifacts(distDir).join('\n');
  assert.doesNotMatch(
    builtOutput,
    /upxuu|waline|umami|clarity|blogapi|randomImage|weatherApi|serverURL|vercel|cloudflare/i,
    'expected built pages to contain no upstream or external-service identity',
  );

  assert.deepEqual(
    findUnexpectedExternalUrls(collectTextArtifacts(distDir), 'https://tsun.test'),
    [],
    'expected built HTML, JavaScript, and XML to contain no unknown external runtime URLs',
  );

  for (const disabledRoute of ['ai', 'api', 'comments', 'music', 'server-status', 'statistics', 'status']) {
    assert.equal(existsSync(path.join(distDir, disabledRoute)), false, `expected disabled route /${disabledRoute} not to be emitted`);
  }
});
