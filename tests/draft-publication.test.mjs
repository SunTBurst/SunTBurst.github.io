import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const draftPost = path.join(projectRoot, 'src', 'content', 'posts', '__draft-post.md');
const draftTalk = path.join(projectRoot, 'src', 'content', 'talks', '__draft-talk.md');
const draftKnowledge = path.join(projectRoot, 'src', 'content', 'knowledge', 'draft-knowledge-secret.md');
const draftProject = path.join(projectRoot, 'src', 'content', 'projects', 'draft-project-secret.md');
const draftUpdate = path.join(projectRoot, 'src', 'content', 'updates', 'draft-update-secret.md');
const draftFixtures = [draftPost, draftTalk, draftKnowledge, draftProject, draftUpdate];

test('production build excludes every draft collection from routes and public discovery surfaces', async () => {
  for (const fixture of draftFixtures) assert.equal(existsSync(fixture), false, `refusing to overwrite pre-existing fixture ${fixture}`);
  try {
    await Promise.all(draftFixtures.map((fixture) => mkdir(path.dirname(fixture), { recursive: true })));
    await writeFile(draftPost, [
      '---',
      'title: DRAFT_POST_SECRET',
      'published: 2026-08-30T21:00:00+03:00',
      'slug: draft-post-secret',
      'draft: true',
      '---',
      '',
      'DRAFT_POST_BODY_SECRET',
      '',
    ].join('\n'), 'utf8');
    await writeFile(draftTalk, [
      '---',
      'title: DRAFT_TALK_SECRET',
      'published: 2026-08-30T21:05:00+03:00',
      'slug: draft-talk-secret',
      'draft: true',
      '---',
      '',
      'DRAFT_TALK_BODY_SECRET',
      '',
    ].join('\n'), 'utf8');
    await writeFile(draftKnowledge, [
      '---',
      'title: DRAFT_KNOWLEDGE_SECRET',
      'summary: DRAFT_KNOWLEDGE_SUMMARY_SECRET',
      'published: 2026-08-30',
      'updated: 2026-08-30',
      'topics: [站点建设]',
      'status: seed',
      'draft: true',
      '---',
      '',
      'DRAFT_KNOWLEDGE_BODY_SECRET',
      '',
    ].join('\n'), 'utf8');
    await writeFile(draftProject, [
      '---',
      'title: DRAFT_PROJECT_SECRET',
      'summary: DRAFT_PROJECT_SUMMARY_SECRET',
      'started: 2026-08-30',
      'updated: 2026-08-30',
      'status: building',
      'tags: [站点建设]',
      'draft: true',
      '---',
      '',
      'DRAFT_PROJECT_BODY_SECRET',
      '',
    ].join('\n'), 'utf8');
    await writeFile(draftUpdate, [
      '---',
      'title: DRAFT_UPDATE_SECRET',
      'summary: DRAFT_UPDATE_SUMMARY_SECRET',
      'published: 2026-08-30',
      'kind: site',
      'href: /changelog#draft-update-secret',
      'status: in-progress',
      'draft: true',
      '---',
      '',
      'DRAFT_UPDATE_BODY_SECRET',
      '',
    ].join('\n'), 'utf8');

    const result = buildProject(projectRoot);
    assert.equal(result.status, 0, `expected draft fixture build to succeed:\n${result.output}`);
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'posts', 'draft-post-secret', 'index.html')), false, 'draft post route must not exist');
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'talk', 'draft-talk-secret', 'index.html')), false, 'draft talk route must not exist');
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'knowledge', 'draft-knowledge-secret', 'index.html')), false, 'draft knowledge route must not exist');
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'projects', 'draft-project-secret', 'index.html')), false, 'draft project route must not exist');

    const publicArtifactPaths = [
      'index.html',
      'posts/index.html',
      'talks/index.html',
      'knowledge/index.html',
      'projects/index.html',
      'changelog/index.html',
      'topics/index.html',
      'topics/site-building/index.html',
      'topics/knowledge-management/index.html',
      'topics/ai-knowledge/index.html',
      'search/index.html',
      'portal-index.json',
      'posts-data.json',
      'posts.xml',
      'talk.xml',
      'latest.xml',
      'rss.xml',
      'sitemap.xml',
    ];
    for (const relativePath of publicArtifactPaths) {
      assert.ok(existsSync(path.join(projectRoot, 'dist', ...relativePath.split('/'))), `expected public draft-audit artifact ${relativePath}`);
    }
    const publicArtifacts = await Promise.all(publicArtifactPaths.map((relativePath) => readFile(path.join(projectRoot, 'dist', ...relativePath.split('/')), 'utf8')));
    const publishedOutput = publicArtifacts.join('\n');
    assert.doesNotMatch(
      publishedOutput,
      /DRAFT_(?:POST|TALK|KNOWLEDGE|PROJECT|UPDATE)_(?:SECRET|BODY_SECRET|SUMMARY_SECRET)|draft-(?:post|talk|knowledge|project|update)-secret/,
      'draft markers must not leak into homepage, discovery pages, index, feeds, or sitemap',
    );
  } finally {
    await Promise.all(draftFixtures.map((fixture) => rm(fixture, { force: true })));
  }
});
