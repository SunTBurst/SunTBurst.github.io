import { getCollection } from 'astro:content';
import { getCmsPublications } from '../services/cms/public';
import type { CmsPublication } from '../features/cms/types';
import { cmsEnvironment, readCmsConnection } from '../features/cms/config';
import { cmsPublishedDate } from './cmsDates';
const cmsEntry = (row: CmsPublication) => ({
  id: row.id,
  slug: row.slug,
  body: row.body || '',
  data: {
    title: row.title || '无标题', published: cmsPublishedDate(row.metadata || {}, row.published_at), description: row.summary || '',
    summary: row.summary || '', image: row.image || undefined, tags: row.tags || [], category: row.category || undefined,
    slug: row.slug, draft: false, cms: true, metadata: row.metadata || {}, location: row.metadata?.location || '', weather: row.metadata?.weather || '', mood: row.metadata?.mood || '', device: row.metadata?.device || '',
  }, cms: true as const, filePath: undefined,
});

async function merge(kind: 'post' | 'talk', local: any[]) {
  if (readCmsConnection(cmsEnvironment())) return (await getCmsPublications(kind)).map(cmsEntry);
  return local;
}

export async function getPublishedPosts() {
  return merge('post', await getCollection('posts', ({ data }) => !data.draft));
}

export async function getPublishedTalks() {
  return merge('talk', await getCollection('talks', ({ data }) => !data.draft));
}
