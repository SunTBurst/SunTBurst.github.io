import { getCollection } from 'astro:content';
import { getCmsPublications } from '../services/cms/public';
import type { CmsPublication } from '../features/cms/types';
import { cmsEnvironment, readCmsConnection } from '../features/cms/config';

const asDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};
const safeUrl = (value: unknown) => typeof value === 'string' && (/^https?:\/\//i.test(value) || (value.startsWith('/') && !value.startsWith('//')));
const safeLinks = (value: unknown) => Array.isArray(value) ? value.filter((item): item is { label: string; href: string } => !!item && typeof item === 'object' && typeof item.label === 'string' && safeUrl(item.href)) : [];
const safeSources = (value: unknown) => Array.isArray(value) ? value.filter((item): item is { title: string; url: string } => !!item && typeof item === 'object' && typeof item.title === 'string' && safeUrl(item.url)) : [];
const cmsEntry = (row: CmsPublication) => ({
  id: row.id, slug: row.slug, body: row.body || '', cms: true as const, filePath: undefined,
  data: { title: row.title || '无标题', summary: row.summary || '', published: asDate(row.published_at), updated: asDate(row.published_at),
    started: asDate(row.metadata?.started || row.published_at), status: (row.metadata?.status as string) || (row.kind === 'project' ? 'building' : 'growing'),
    topics: Array.isArray(row.metadata?.topics) ? row.metadata.topics : row.tags || [], tags: row.tags || [],
    sources: safeSources(row.metadata?.sources), links: safeLinks(row.metadata?.links), draft: false,
  },
});

async function merge(kind: 'knowledge' | 'project', local: any[]) {
  if (readCmsConnection(cmsEnvironment())) return (await getCmsPublications(kind)).map(cmsEntry);
  return local;
}

export async function getPublishedKnowledge() { return merge('knowledge', await getCollection('knowledge', ({ data }) => !data.draft)); }
export async function getPublishedProjects() { return merge('project', await getCollection('projects', ({ data }) => !data.draft)); }
export const getPublishedUpdates = () => getCollection('updates', ({ data }) => !data.draft);
