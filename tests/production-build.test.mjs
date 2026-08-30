import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as externalUrlAudit from './helpers/external-url-audit.mjs';

const { collectTextArtifacts, findUnexpectedExternalUrls } = externalUrlAudit;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const srcDir = path.join(projectRoot, 'src');
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

test('production build emits the local SunTBurst portal with network-free feature previews', () => {
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
  assert.match(home, /SunTBurst 个人门户/, 'expected the built homepage to carry the SunTBurst identity');
  assert.match(home, /https:\/\/tsun\.test\//, 'expected PUBLIC_SITE_URL to control generated absolute URLs');
  assert.match(home, /id="identity"/, 'expected the portal identity section');
  assert.match(home, /id="environment"/, 'expected the honest environment preview section');

  const welcomePost = readDist('posts/hello-world/index.html');
  assert.match(welcomePost, /欢迎来到 SunTBurst 个人门户/, 'expected the local welcome post route under the product identity');

  const firstTalk = readDist('talk/first-note/index.html');
  assert.match(firstTalk, /先从一条简短的记录开始/, 'expected the original local talk route');
  assert.match(firstTalk, /随手记/, 'expected an untitled talk to receive a natural display title');

  readDist('about/index.html');
  readDist('friends/index.html');
  readDist('tags/index.html');
  for (const feature of ['ai', 'music', 'stats', 'status', 'subscribe']) {
    const preview = readDist(`${feature}/index.html`);
    assert.match(preview, new RegExp(`data-feature="${feature}"`), `expected ${feature} preview identity`);
    assert.match(preview, /data-state="preview"/, `expected ${feature} preview state`);
  }
  const builtOutput = readTextArtifacts(distDir).join('\n');
  assert.doesNotMatch(builtOutput, /\bTSun\b/, 'expected SunTBurst to remain the only current public product identity');
  assert.doesNotMatch(
    builtOutput,
    /upxuu|waline|umami|clarity|blogapi|randomImage|weatherApi|serverURL|vercel|cloudflare/i,
    'expected built pages to contain no upstream or external-service identity',
  );

  const artifacts = collectTextArtifacts(distDir);
  assert.equal(
    typeof externalUrlAudit.findUnexpectedRuntimeSinks,
    'function',
    'expected the artifact audit to expose the zero-network-sink check',
  );
  assert.deepEqual(
    externalUrlAudit.findUnexpectedRuntimeSinks(artifacts),
    [],
    'expected emitted JavaScript to contain no browser network capabilities',
  );
  assert.deepEqual(
    externalUrlAudit.findUnexpectedRuntimeSinks(collectTextArtifacts(srcDir)),
    [],
    'expected browser source to contain no network capabilities',
  );
  assert.deepEqual(
    findUnexpectedExternalUrls(artifacts, 'https://tsun.test'),
    [],
    'expected every built text artifact to contain no unknown external runtime URLs',
  );

  for (const disabledRoute of ['api', 'comments', 'server-status', 'statistics']) {
    assert.equal(existsSync(path.join(distDir, disabledRoute)), false, `expected disabled route /${disabledRoute} not to be emitted`);
  }
});
