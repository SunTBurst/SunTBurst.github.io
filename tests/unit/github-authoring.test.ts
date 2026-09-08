import assert from 'node:assert/strict';
import test from 'node:test';
import { githubAuthoringLinks, githubContentEditUrl } from '../../src/utils/githubAuthoring';

const repo = {
  owner: 'SunTBurst',
  name: 'SunTBurst.github.io',
  branch: 'main',
  workflow: 'deploy-pages.yml',
};

test('edit links preserve the actual nested Markdown filename and encode special characters', () => {
  assert.equal(
    githubContentEditUrl(repo, 'src/content/posts/笔记/学习 #1.md'),
    'https://github.com/SunTBurst/SunTBurst.github.io/edit/main/src/content/posts/%E7%AC%94%E8%AE%B0/%E5%AD%A6%E4%B9%A0%20%231.md',
  );
  assert.equal(
    githubContentEditUrl(repo, 'src\\content\\talks\\50%完成.md'),
    'https://github.com/SunTBurst/SunTBurst.github.io/edit/main/src/content/talks/50%25%E5%AE%8C%E6%88%90.md',
  );
});

test('edit links reject missing paths, non-content files and traversal without guessing a filename', () => {
  for (const filePath of [
    undefined, '', '../secret.md', 'C:/private.md', '/src/content/posts/example.md',
    'src/content/posts/../../secret.md', 'src/content/posts/./example.md',
    'src/content/posts//example.md', 'src/content/posts/bad\nname.md',
    'src/content/posts/image.png', 'src/config/site.ts', 'src/content/unknown/example.md',
  ]) {
    assert.equal(githubContentEditUrl(repo, filePath), null, `expected rejection for ${JSON.stringify(filePath)}`);
  }
});

test('authoring destinations open the configured repository tools without preset content or credentials', () => {
  assert.deepEqual(githubAuthoringLinks(repo), {
    newPost: 'https://github.com/SunTBurst/SunTBurst.github.io/new/main/src/content/posts',
    newTalk: 'https://github.com/SunTBurst/SunTBurst.github.io/new/main/src/content/talks',
    posts: 'https://github.com/SunTBurst/SunTBurst.github.io/tree/main/src/content/posts',
    talks: 'https://github.com/SunTBurst/SunTBurst.github.io/tree/main/src/content/talks',
    images: 'https://github.com/SunTBurst/SunTBurst.github.io/upload/main/public/images',
    appearance: 'https://github.com/SunTBurst/SunTBurst.github.io/edit/main/src/config/site.ts',
    publication: 'https://github.com/SunTBurst/SunTBurst.github.io/actions/workflows/deploy-pages.yml',
    editor: 'https://github.dev/SunTBurst/SunTBurst.github.io',
    currentVersion: '/status',
  });
});

test('alternate repository and branch configuration stays inside each URL segment', () => {
  const alternate = { owner: 'another-owner', name: 'notes', branch: 'feature/write', workflow: 'publish notes.yml' };
  assert.equal(
    githubContentEditUrl(alternate, 'src/content/knowledge/topic.md'),
    'https://github.com/another-owner/notes/edit/feature%2Fwrite/src/content/knowledge/topic.md',
  );
  const links = githubAuthoringLinks(alternate);
  assert.equal(links.newPost, 'https://github.com/another-owner/notes/new/feature%2Fwrite/src/content/posts');
  assert.equal(links.publication, 'https://github.com/another-owner/notes/actions/workflows/publish%20notes.yml');
});
