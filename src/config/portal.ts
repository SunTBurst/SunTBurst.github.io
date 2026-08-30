import type { PortalConfig } from '../types/portal';

export const portalConfig: PortalConfig = {
  identity: {
    name: 'SunTBurst',
    tagline: '把学习、实践与知识连接成一张长期生长的地图',
    timeZone: 'Asia/Riyadh',
  },
  startHere: [
    { title: '认识这个空间', description: '先了解这里为什么存在。', href: '/start', nextHref: '/about', accent: 'blue' },
    { title: '沿着知识地图走', description: '按主题而不是发布时间探索。', href: '/knowledge', nextHref: '/topics/site-building', accent: 'emerald' },
    { title: '看看正在建设什么', description: '查看真实项目和更新记录。', href: '/projects', nextHref: '/changelog', accent: 'amber' },
  ],
  focus: ['建设可长期维护的个人门户', '连接公开博客与隔离的私有知识平台'],
  topics: [
    { slug: 'site-building', title: '站点建设', description: '设计、开发、发布与运行记录。', status: 'growing' },
    { slug: 'knowledge-management', title: '知识管理', description: '收集、整理、连接与公开发布的方法。', status: 'mapping' },
    { slug: 'ai-knowledge', title: 'AI 与知识库', description: '带权限和引用的检索增强问答。', status: 'mapping' },
  ],
  projects: [
    { slug: 'suntburst-portal', title: 'SunTBurst 个人门户', summary: '把静态博客建设成公开门户和知识入口。', status: 'building', href: '/projects#suntburst-portal', updated: '2026-08-30' },
  ],
};
