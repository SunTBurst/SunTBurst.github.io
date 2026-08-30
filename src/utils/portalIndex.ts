import type { PortalIndexEntry } from '../types/portal';
import { getProcessedPosts, getProcessedTalks, type PostItem } from './postsFetcher';
import { getPublishedKnowledge, getPublishedProjects, getPublishedUpdates } from './portalCollections';
import { assertUniqueLocalEntries, plainTextSummary } from './portalIndexCore';
import { normalizeEntrySlug, postPath, talkPath } from './slugify';

const staticPages: PortalIndexEntry[] = [
  ['start', '从这里开始', '认识网站并选择第一条探索路线', '/start'],
  ['about', '关于', '认识 SunTBurst 和这个空间', '/about'],
  ['knowledge', '知识地图', '按主题探索公开知识', '/knowledge'],
  ['projects', '项目台', '查看真实项目与建设状态', '/projects'],
  ['now', '现在', '查看当前关注和近期建设', '/now'],
  ['changelog', '更新记录', '查看站点的真实变化', '/changelog'],
  ['archive', '归档', '按时间浏览全部公开内容', '/archive'],
  ['calendar', '日历', '按日期回看公开更新', '/calendar'],
  ['timeline', '时间线', '沿时间查看站点内容', '/timeline'],
  ['explore', '随机探索', '从真实公开路由中随机发现', '/explore'],
  ['lab', '实验室', '查看可控的小工具和实验', '/lab'],
  ['friends', '友链', '发现其他值得访问的个人空间', '/friends'],
  ['privacy', '隐私', '了解本站的数据边界', '/privacy'],
].map(([id, title, description, href]) => ({
  id: `page:${id}`,
  kind: 'page' as const,
  title,
  description,
  href: href as `/${string}`,
  updatedAt: '2026-08-30T00:00:00+03:00',
  topics: [],
}));

export function toPortalPostIndexEntry(post: PostItem): PortalIndexEntry {
  return {
    id: `post:${post.id}`,
    kind: 'post',
    title: post.title,
    description: plainTextSummary(post.description || post.content).slice(0, 180),
    href: postPath(post.slug) as `/${string}`,
    updatedAt: post.dateISO,
    topics: [post.category, ...post.tags].filter(Boolean),
  };
}

export function toLegacyPostPayload(post: PostItem) {
  const entry = toPortalPostIndexEntry(post);
  return {
    id: post.id,
    slug: post.slug,
    title: entry.title,
    date: post.date,
    description: entry.description,
    img: post.img,
    tags: post.tags,
    category: post.category,
    kind: entry.kind,
    href: entry.href,
  };
}

const localDetailPath = (base: string, entry: unknown): `/${string}` =>
  `${base}/${encodeURIComponent(normalizeEntrySlug(entry))}/` as `/${string}`;

export async function buildPortalIndex(): Promise<PortalIndexEntry[]> {
  const [posts, talks, knowledge, projects, updates] = await Promise.all([
    getProcessedPosts(),
    getProcessedTalks(),
    getPublishedKnowledge(),
    getPublishedProjects(),
    getPublishedUpdates(),
  ]);
  const entries: PortalIndexEntry[] = [
    ...staticPages,
    ...posts.map(toPortalPostIndexEntry),
    ...talks.map((talk) => ({
      id: `talk:${talk.id}`,
      kind: 'talk' as const,
      title: talk.title,
      description: plainTextSummary(talk.plainText).slice(0, 180),
      href: talkPath(talk.slug) as `/${string}`,
      updatedAt: talk.date,
      topics: talk.tags,
    })),
    ...knowledge.map((item) => ({
      id: `knowledge:${item.id}`,
      kind: 'knowledge' as const,
      title: item.data.title,
      description: plainTextSummary(item.data.summary),
      href: localDetailPath('/knowledge', item),
      updatedAt: item.data.updated.toISOString(),
      topics: item.data.topics,
    })),
    ...projects.map((item) => ({
      id: `project:${item.id}`,
      kind: 'project' as const,
      title: item.data.title,
      description: plainTextSummary(item.data.summary),
      href: localDetailPath('/projects', item),
      updatedAt: item.data.updated.toISOString(),
      topics: item.data.tags,
    })),
    ...updates.map((item) => ({
      id: `update:${item.id}`,
      kind: 'update' as const,
      title: item.data.title,
      description: plainTextSummary(item.data.summary),
      href: `/changelog#${encodeURIComponent(normalizeEntrySlug(item))}` as `/${string}`,
      updatedAt: item.data.published.toISOString(),
      topics: [item.data.kind],
    })),
  ];

  return assertUniqueLocalEntries(entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.href.localeCompare(b.href)));
}
