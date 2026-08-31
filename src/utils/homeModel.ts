import { portalConfig } from '../config/portal';
import type { KnowledgeTopic, PortalIndexEntry, PortalLink, PortalProject } from '../types/portal';

export interface HomeModelInput {
  posts: PortalIndexEntry[];
  talks: PortalIndexEntry[];
  knowledge: PortalIndexEntry[];
  projects: PortalProject[];
  updates: PortalIndexEntry[];
}

export interface PortalToolItem {
  title: string;
  description: string;
  href: `/${string}`;
  state: 'ready' | 'preview';
}

export interface HomePulseItem {
  label: string;
  value: string;
  detail: string;
  href: `/${string}`;
}

export interface HomeModel {
  identity: typeof portalConfig.identity;
  startHere: PortalLink[];
  topics: KnowledgeTopic[];
  focus: string[];
  projects: PortalProject[];
  posts: PortalIndexEntry[];
  recent: PortalIndexEntry[];
  exploreEntries: PortalIndexEntry[];
  pulse: HomePulseItem[];
  tools: PortalToolItem[];
  lastUpdated: string;
  randomFallback: '/start';
}

export const portalTools: PortalToolItem[] = [
  { title: '全站搜索', description: '在浏览器内搜索公开内容，不上传关键词。', href: '/search', state: 'ready' },
  { title: '随机探索', description: '从已发布页面里随机发现一个入口。', href: '/explore', state: 'ready' },
  { title: '收藏与足迹', description: '只在当前浏览器保存你的浏览线索。', href: '/favorites', state: 'ready' },
  { title: '内容日历', description: '按日期回看文章、说说与更新。', href: '/calendar', state: 'ready' },
  { title: '时间线', description: '沿时间顺序浏览全部公开记录。', href: '/timeline', state: 'ready' },
  { title: 'RSS 订阅', description: '用你熟悉的阅读器跟踪公开更新。', href: '/rss.xml', state: 'ready' },
  { title: '利雅得天气', description: '点击后才读取实时天气，不获取设备定位。', href: '/weather', state: 'ready' },
  { title: '随机画片', description: '从本站自有的授权画片中随机换一张，不连接图片热链。', href: '/random-image', state: 'ready' },
  { title: 'GitHub 公开活动', description: '查看构建时生成的公开仓库和活动快照，浏览时不请求 GitHub API。', href: '/github', state: 'ready' },
  { title: 'AI 导览', description: '查看公开问答的范围、引用和隐私边界。', href: '/ai', state: 'preview' },
  { title: '站点数据', description: '查看不追踪访客的内容、路由和工具统计。', href: '/stats', state: 'ready' },
  { title: '构建状态', description: '查看当前部署版本、公开路由和降级边界。', href: '/status', state: 'ready' },
  { title: '邮件订阅', description: '查看双重确认、退订和数据删除流程。', href: '/subscribe', state: 'preview' },
  { title: '音乐空间', description: '查看自有音源接入与版权边界。', href: '/music', state: 'preview' },
];

const dateOnly = (value: string) => value.slice(0, 10);

export function buildHomeModel(input: HomeModelInput): HomeModel {
  const projects = input.projects.length > 0 ? input.projects : portalConfig.projects;
  const recentEditorial = [
    ...input.knowledge.map((entry) => ({ entry, priority: 0 })),
    ...input.posts.map((entry) => ({ entry, priority: 1 })),
    ...input.talks.map((entry) => ({ entry, priority: 2 })),
  ]
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt) || left.priority - right.priority)
    .slice(0, 6);
  const recentUpdates = input.updates
    .map((entry) => ({ entry, priority: 3 }))
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt))
    .slice(0, 2);
  const recent = [...recentEditorial, ...recentUpdates]
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt) || left.priority - right.priority)
    .map(({ entry }) => entry)
    .slice(0, 8);
  const projectUpdated = projects.map(({ updated }) => updated).sort((left, right) => right.localeCompare(left))[0];
  const lastUpdated = dateOnly(recent[0]?.updatedAt ?? projectUpdated ?? portalConfig.projects[0]?.updated ?? '');
  const readyToolCount = portalTools.filter(({ state }) => state === 'ready').length;
  const publishedRecordCount = input.posts.length + input.talks.length + input.knowledge.length + projects.length + input.updates.length;
  const pulse: HomePulseItem[] = [
    { label: '公开记录', value: String(publishedRecordCount), detail: '文章、知识、项目与更新', href: '/timeline' },
    { label: '知识主题', value: String(portalConfig.topics.length), detail: '沿主题继续探索', href: '/topics' },
    { label: '建设项目', value: String(projects.length), detail: '查看正在发生的实践', href: '/projects' },
    { label: '可用工具', value: String(readyToolCount), detail: '搜索、收藏与订阅入口', href: '/lab' },
  ];

  return {
    identity: portalConfig.identity,
    startHere: portalConfig.startHere,
    topics: portalConfig.topics,
    focus: portalConfig.focus,
    projects,
    posts: input.posts,
    recent,
    exploreEntries: [...input.posts, ...input.talks, ...input.knowledge, ...input.updates],
    pulse,
    tools: portalTools,
    lastUpdated,
    randomFallback: '/start',
  };
}
