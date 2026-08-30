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

test('production build excludes draft posts and talks from every public artifact', async () => {
  await mkdir(path.dirname(draftPost), { recursive: true });
  await mkdir(path.dirname(draftTalk), { recursive: true });
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

  try {
    const result = buildProject(projectRoot);
    assert.equal(result.status, 0, `expected draft fixture build to succeed:\n${result.output}`);
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'posts', 'draft-post-secret', 'index.html')), false, 'draft post route must not exist');
    assert.equal(existsSync(path.join(projectRoot, 'dist', 'talk', 'draft-talk-secret', 'index.html')), false, 'draft talk route must not exist');

    const publicArtifacts = await Promise.all([
      'index.html',
      'posts/index.html',
      'talks/index.html',
      'posts-data.json',
      'posts.xml',
      'talk.xml',
      'latest.xml',
      'rss.xml',
      'sitemap.xml',
    ].map((relativePath) => readFile(path.join(projectRoot, 'dist', ...relativePath.split('/')), 'utf8')));
    const publishedOutput = publicArtifacts.join('\n');
    assert.doesNotMatch(publishedOutput, /DRAFT_(?:POST|TALK)_(?:SECRET|BODY_SECRET)|draft-(?:post|talk)-secret/, 'draft markers must not leak into lists, search, feeds, or sitemap');
  } finally {
    await Promise.all([rm(draftPost, { force: true }), rm(draftTalk, { force: true })]);
  }
});
