import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

const invalidFixtures = [
  {
    collection: 'knowledge',
    filename: '__invalid-knowledge-source.md',
    expectedField: /sources/i,
    contents: [
      '---',
      'title: 临时无效知识条目',
      'summary: 仅用于校验知识集合。',
      'published: 2026-08-30',
      'updated: 2026-08-30',
      'sources:',
      '  - title: 无效来源',
      '    url: not-a-url',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
  {
    collection: 'projects',
    filename: '__invalid-project-status.md',
    expectedField: /status/i,
    contents: [
      '---',
      'title: 临时无效项目条目',
      'summary: 仅用于校验项目集合。',
      'started: 2026-08-30',
      'updated: 2026-08-30',
      'status: launched',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
  {
    collection: 'updates',
    filename: '__invalid-update-draft.md',
    expectedField: /draft/i,
    contents: [
      '---',
      'title: 临时无效更新条目',
      'summary: 仅用于校验更新集合。',
      'published: 2026-08-30',
      'kind: site',
      'href: /changelog',
      'status: completed',
      'draft: private',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
] as const;

test('Astro sync rejects invalid portal collection fixtures', async () => {
  for (const fixture of invalidFixtures) {
    const fixturePath = path.join(projectRoot, 'src', 'content', fixture.collection, fixture.filename);
    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, fixture.contents, 'utf8');

    try {
      const result = spawnSync(process.execPath, [astroCli, 'sync'], {
        cwd: projectRoot,
        encoding: 'utf8',
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
      });
      const output = `${result.stdout}\n${result.stderr}`;

      assert.notEqual(
        result.status,
        0,
        `expected Astro sync to reject the invalid ${fixture.collection} fixture, but it exited 0:\n${output}`,
      );
      assert.match(
        output,
        fixture.expectedField,
        `expected validation output to name ${fixture.collection}.${fixture.expectedField.source}:\n${output}`,
      );
    } finally {
      await rm(fixturePath, { force: true });
    }
  }
});

const draftFixtures = [
  {
    collection: 'knowledge',
    filename: '__draft-knowledge.md',
    title: 'DRAFT_KNOWLEDGE_SECRET',
    contents: [
      '---',
      'title: DRAFT_KNOWLEDGE_SECRET',
      'summary: 仅用于校验草稿过滤。',
      'published: 2026-08-30',
      'updated: 2026-08-30',
      'draft: true',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
  {
    collection: 'projects',
    filename: '__draft-project.md',
    title: 'DRAFT_PROJECT_SECRET',
    contents: [
      '---',
      'title: DRAFT_PROJECT_SECRET',
      'summary: 仅用于校验草稿过滤。',
      'started: 2026-08-30',
      'updated: 2026-08-30',
      'status: building',
      'draft: true',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
  {
    collection: 'updates',
    filename: '__draft-update.md',
    title: 'DRAFT_UPDATE_SECRET',
    contents: [
      '---',
      'title: DRAFT_UPDATE_SECRET',
      'summary: 仅用于校验草稿过滤。',
      'published: 2026-08-30',
      'kind: site',
      'href: /changelog',
      'status: completed',
      'draft: true',
      '---',
      '',
      '仅用于校验。',
      '',
    ].join('\n'),
  },
] as const;

test('published portal helpers exclude entries marked draft', async () => {
  const fixturePaths = draftFixtures.map((fixture) =>
    path.join(projectRoot, 'src', 'content', fixture.collection, fixture.filename),
  );
  const fixturePage = path.join(projectRoot, 'src', 'pages', 'portal-helper-test.astro');

  await Promise.all(draftFixtures.map(async (fixture, index) => {
    await mkdir(path.dirname(fixturePaths[index]), { recursive: true });
    await writeFile(fixturePaths[index], fixture.contents, 'utf8');
  }));
  await writeFile(fixturePage, [
    '---',
    "import { getPublishedKnowledge, getPublishedProjects, getPublishedUpdates } from '../utils/portalCollections';",
    'const [knowledge, projects, updates] = await Promise.all([',
    '  getPublishedKnowledge(),',
    '  getPublishedProjects(),',
    '  getPublishedUpdates(),',
    ']);',
    'const titles = [...knowledge, ...projects, ...updates].map((entry) => entry.data.title);',
    '---',
    '<pre>{JSON.stringify(titles)}</pre>',
    '',
  ].join('\n'), 'utf8');

  try {
    const build = spawnSync(process.execPath, [astroCli, 'build'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
    });
    assert.equal(build.status, 0, `expected Astro build to accept valid draft fixtures:\n${build.stdout}\n${build.stderr}`);
    const output = await readFile(path.join(projectRoot, 'dist', 'portal-helper-test', 'index.html'), 'utf8');

    for (const fixture of draftFixtures) {
      assert.doesNotMatch(output, new RegExp(fixture.title), `${fixture.collection} draft must not be published`);
    }
  } finally {
    await Promise.all([
      ...fixturePaths.map((fixturePath) => rm(fixturePath, { force: true })),
      rm(fixturePage, { force: true }),
    ]);
  }
});
