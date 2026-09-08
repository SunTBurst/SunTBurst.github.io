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

test('production build emits the local SunTBurst portal with one consent-based weather integration', () => {
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
  assert.match(home, /最近文章/, 'expected real recent articles on the homepage');
  assert.match(home, /最近随记/, 'expected an independent recent-talk section');
  assert.doesNotMatch(home, /id="(?:portal-pulse|portal-tools|knowledge-map|project-shelf)"/, 'expected a focused homepage with secondary sections available on their own routes');
  assert.match(home, /href="\/write\/?"/, 'expected the authoring tools to remain discoverable from the footer');

  const welcomePost = readDist('posts/hello-world/index.html');
  assert.match(welcomePost, /欢迎来到 SunTBurst 个人门户/, 'expected the local welcome post route under the product identity');
  assert.equal((welcomePost.match(/<h1\b/g) ?? []).length, 1, 'expected the article title to appear in a single page heading');
  assert.match(welcomePost, /https:\/\/github\.com\/SunTBurst\/SunTBurst\.github\.io\/edit\/main\/src\/content\/posts\/hello-world\.md/, 'expected article editing to target the existing GitHub source');

  const writingTools = readDist('write/index.html');
  assert.match(writingTools, /name="robots"\s+content="noindex(?:,[^"]*)?"/, 'expected a public noindex authoring tools page');
  assert.match(writingTools, /https:\/\/github\.com\/SunTBurst\/SunTBurst\.github\.io\/actions\/workflows\/deploy-pages\.yml/, 'expected the existing deployment workflow link');
  for (const destination of [
    'new/main/src/content/posts', 'new/main/src/content/talks',
    'tree/main/src/content/posts', 'tree/main/src/content/talks',
    'upload/main/public/images', 'edit/main/src/config/site.ts',
  ]) {
    assert.ok(writingTools.includes(`href="https://github.com/SunTBurst/SunTBurst.github.io/${destination}"`), `expected rendered authoring destination ${destination}`);
  }
  assert.ok(writingTools.includes('href="https://github.dev/SunTBurst/SunTBurst.github.io"'));
  const publicIndex = JSON.parse(readDist('portal-index.json'));
  assert.equal(publicIndex.some((entry) => /^\/write\/?$/.test(entry.href)), false, 'expected authoring tools outside the shared search and exploration index');
  for (const entry of [...publicIndex, ...JSON.parse(readDist('posts-data.json'))]) {
    assert.equal(['body', 'content', 'searchText', 'searchTextById'].some((field) => field in entry), false, 'expected common discovery payloads to retain metadata only');
  }
  for (const feed of ['rss.xml', 'sitemap.xml']) {
    assert.doesNotMatch(readDist(feed), /https:\/\/tsun\.test\/write(?:\/|<)/, `expected authoring tools outside ${feed}`);
  }

  const firstTalk = readDist('talk/first-note/index.html');
  assert.match(firstTalk, /先从一条简短的记录开始/, 'expected the original local talk route');
  assert.match(firstTalk, /随手记/, 'expected an untitled talk to receive a natural display title');

  readDist('about/index.html');
  readDist('friends/index.html');
  readDist('tags/index.html');
  for (const feature of ['subscribe']) {
    const preview = readDist(`${feature}/index.html`);
    assert.match(preview, new RegExp(`data-feature="${feature}"`), `expected ${feature} preview identity`);
    assert.match(preview, /data-state="preview"/, `expected ${feature} preview state`);
  }
  const builtOutput = readTextArtifacts(distDir).join('\n');
  assert.doesNotMatch(builtOutput, /\bTSun\b/, 'expected SunTBurst to remain the only current public product identity');
  assert.doesNotMatch(
    builtOutput,
    /upxuu|waline|umami|clarity|blogapi|randomImageApi|weatherApi|serverURL|vercel|cloudflare/i,
    'expected built pages to contain no upstream or external-service identity',
  );

  const artifacts = collectTextArtifacts(distDir);
  assert.equal(
    typeof externalUrlAudit.findUnexpectedRuntimeSinks,
    'function',
    'expected the artifact audit to expose the zero-network-sink check',
  );
  const builtRuntimeFindings = externalUrlAudit.findUnexpectedRuntimeSinks(artifacts);
  assert.equal(builtRuntimeFindings.length, 1, 'expected one emitted browser network capability');
  assert.equal(builtRuntimeFindings[0]?.sink, 'fetch');
  assert.match(builtRuntimeFindings[0]?.path ?? '', /^_astro\/WeatherPanel\..+\.js$/);

  assert.deepEqual(
    externalUrlAudit.findUnexpectedRuntimeSinks(collectTextArtifacts(srcDir)),
    [{ path: 'components/WeatherPanel.svelte', sink: 'fetch' }],
    'expected weather to be the only browser source with a network capability',
  );

  const externalUrls = findUnexpectedExternalUrls(artifacts, 'https://tsun.test');
  assert.ok(externalUrls.length >= 1, 'expected the weather endpoint to stay visible to the external URL audit');
  assert.ok(
    externalUrls.every(({ path: artifactPath, url }) => artifactPath === builtRuntimeFindings[0]?.path && url.startsWith('https://api.open-meteo.com/v1/forecast')),
    `expected no unknown external runtime URL, got ${JSON.stringify(externalUrls)}`,
  );

  for (const disabledRoute of ['api', 'comments', 'server-status', 'statistics']) {
    assert.equal(existsSync(path.join(distDir, disabledRoute)), false, `expected disabled route /${disabledRoute} not to be emitted`);
  }
});
