export interface GitHubAuthoringConfig {
  owner: string;
  name: string;
  branch: string;
  workflow: string;
}

const encodePath = (value: string) => value.split('/').map(encodeURIComponent).join('/');
const repoBase = (repo: GitHubAuthoringConfig) =>
  `https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

/** Use the collection's real filePath; an entry id or public slug may differ from its filename. */
export function githubContentEditUrl(repo: GitHubAuthoringConfig, filePath?: string): string | null {
  if (!filePath) return null;
  const normalized = filePath.replaceAll('\\', '/');
  if (!/^src\/content\/(posts|talks|knowledge|projects|updates)\/.+\.md$/u.test(normalized)) return null;
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  if (normalized.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  return `${repoBase(repo)}/edit/${encodeURIComponent(repo.branch)}/${encodePath(normalized)}`;
}

export function githubAuthoringLinks(repo: GitHubAuthoringConfig) {
  const base = repoBase(repo);
  const branch = encodeURIComponent(repo.branch);
  return {
    newPost: `${base}/new/${branch}/src/content/posts`,
    newTalk: `${base}/new/${branch}/src/content/talks`,
    posts: `${base}/tree/${branch}/src/content/posts`,
    talks: `${base}/tree/${branch}/src/content/talks`,
    images: `${base}/upload/${branch}/public/images`,
    appearance: `${base}/edit/${branch}/src/config/site.ts`,
    publication: `${base}/actions/workflows/${encodeURIComponent(repo.workflow)}`,
    editor: `https://github.dev/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
    currentVersion: '/status',
  };
}
