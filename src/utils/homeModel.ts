import { portalConfig } from '../config/portal';
import type { KnowledgeTopic, PortalIndexEntry, PortalLink, PortalProject } from '../types/portal';

export interface HomeModelInput {
  posts: PortalIndexEntry[];
  talks: PortalIndexEntry[];
  knowledge: PortalIndexEntry[];
  projects: PortalProject[];
  updates: PortalIndexEntry[];
}

export interface EnvironmentPreviewItem {
  title: string;
  preview: string;
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
  environment: EnvironmentPreviewItem[];
  lastUpdated: string;
  randomFallback: '/start';
}

const environment: EnvironmentPreviewItem[] = [
  { title: '天气', preview: '天气预览尚未配置。' },
  { title: '音乐', preview: '音乐预览尚未配置。' },
  { title: '服务状态', preview: '服务状态仅展示本地配置说明。' },
  { title: '访问统计', preview: '访问统计预览尚未配置。' },
  { title: '订阅', preview: '订阅方式将在本地配置后显示。' },
];

const dateOnly = (value: string) => value.slice(0, 10);

export function buildHomeModel(input: HomeModelInput): HomeModel {
  const projects = input.projects.length > 0 ? input.projects : portalConfig.projects;
  const recent = [...input.updates, ...input.knowledge, ...input.posts, ...input.talks]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 8);
  const projectUpdated = projects.map(({ updated }) => updated).sort((left, right) => right.localeCompare(left))[0];
  const lastUpdated = dateOnly(recent[0]?.updatedAt ?? projectUpdated ?? portalConfig.projects[0]?.updated ?? '');

  return {
    identity: portalConfig.identity,
    startHere: portalConfig.startHere,
    topics: portalConfig.topics,
    focus: portalConfig.focus,
    projects,
    posts: input.posts,
    recent,
    exploreEntries: [...input.posts, ...input.talks, ...input.knowledge, ...input.updates],
    environment,
    lastUpdated,
    randomFallback: '/start',
  };
}
