import type { PortalIndexEntry } from '../types/portal';
import { portalConfig } from '../config/portal';
import { getProcessedPosts, getProcessedTalks, type PostItem } from './postsFetcher';
import { getPublishedKnowledge, getPublishedProjects, getPublishedUpdates } from './portalCollections';
import { assertUniqueLocalEntries, plainTextSummary } from './portalIndexCore';
import { normalizeEntrySlug, postPath, talkPath } from './slugify';

const staticPages: PortalIndexEntry[] = [
  ['home', 'SunTBurst 个人门户', '从首页了解这个公开空间', '/'],
  ['start', '从这里开始', '认识网站并选择第一条探索路线', '/start'],
  ['about', '关于', '认识 SunTBurst 和这个空间', '/about'],
  ['knowledge', '知识地图', '按主题探索公开知识', '/knowledge'],
  ['projects', '项目台', '查看真实项目与建设状态', '/projects'],
  ['now', '现在', '查看当前关注和近期建设', '/now'],
  ['changelog', '更新记录', '查看站点的真实变化', '/changelog'],
  ['posts', '文章', '浏览全部公开文章', '/posts'],
  ['archive', '归档', '按时间浏览全部公开内容', '/archive'],
  ['categories', '分类', '按分类浏览公开文章', '/categories'],
  ['tags', '标签', '按标签浏览公开文章', '/tags'],
  ['calendar', '日历', '按日期回看公开更新', '/calendar'],
  ['timeline', '时间线', '沿时间查看站点内容', '/timeline'],
  ['explore', '随机探索', '从真实公开路由中随机发现', '/explore'],
  ['topics', '主题', '按主题连接不同类型的公开内容', '/topics'],
  ['search', '搜索', '搜索全部公开内容和页面', '/search'],
  ['lab', '实验室', '查看可控的小工具和实验', '/lab'],
  ['favorites', '收藏与足迹', '了解当前浏览器内的本地收藏边界', '/favorites'],
  ['weather', '利雅得天气', '主动读取利雅得实时天气', '/weather'],
  ['random-image', '随机画片', '从本站自有的授权画片中随机探索', '/random-image'],
  ['github', 'GitHub 公开活动', '查看构建期生成的公开仓库与活动快照', '/github'],
  ['ai', 'AI 导览', '了解公开 AI 导览的启用条件和当前替代入口', '/ai'],
  ['music', '声音空间', '播放浏览器本地合成的三种原创声音场景', '/music'],
  ['stats', '站点数据', '查看不追踪访客的内容与建设统计', '/stats'],
  ['status', '构建状态', '查看当前部署快照与降级边界', '/status'],
  ['subscribe', '订阅', '了解双重确认订阅的启用条件', '/subscribe'],
  ['talks', '说说', '浏览公开的简短记录', '/talks'],
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
    ...portalConfig.topics.map((topic) => ({
      id: `page:topic:${topic.slug}`,
      kind: 'page' as const,
      title: topic.title,
      description: topic.description,
      href: `/topics/${encodeURIComponent(topic.slug)}` as `/${string}`,
      updatedAt: '2026-08-30T00:00:00+03:00',
      topics: [topic.slug, topic.title],
    })),
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
