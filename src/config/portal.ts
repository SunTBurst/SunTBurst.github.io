import type { PortalConfig } from '../types/portal';

export const portalConfig: PortalConfig = {
  identity: {
    name: 'SunTBurst',
    tagline: '把学习、实践与知识连接成一张长期生长的地图',
    timeZone: 'Asia/Riyadh',
  },
  startHere: [
    { title: '认识这个空间', description: '先了解这里为什么存在。', href: '/start', nextHref: '/about', accent: 'blue' },
    { title: '沿着知识地图走', description: '从一个真实问题进入，再沿方法继续。', href: '/knowledge', nextHref: '/knowledge/knowledge-visibility-boundary/', accent: 'emerald' },
    { title: '看看正在建设什么', description: '查看真实项目和更新记录。', href: '/projects', nextHref: '/changelog', accent: 'amber' },
  ],
  journeys: [
    {
      slug: 'first-visit',
      title: '第一次来到这里',
      duration: '约 3 分钟',
      description: '先认识这个空间，再看看它此刻在关注什么、最近发生了哪些变化。',
      outcome: '理解这个门户为什么存在，以及内容会怎样持续生长。',
      stops: [
        { label: '认识这个空间', href: '/about' },
        { label: '看看现在', href: '/now' },
        { label: '查看最近更新', href: '/changelog' },
      ],
    },
    {
      slug: 'knowledge-route',
      title: '沿知识地图漫游',
      duration: '约 5 分钟',
      description: '从公开知识入口出发，理解主题如何连接、公开与私有为什么分开。',
      outcome: '掌握内容分层、知识整理和 AI 引用三个可以直接复用的判断框架。',
      stops: [
        { label: '判断公开与私有边界', href: '/knowledge/knowledge-visibility-boundary/' },
        { label: '整理一条可复用知识', href: '/knowledge/knowledge-publishing-pipeline/' },
        { label: '检查 AI 回答约定', href: '/knowledge/ai-answer-contract/' },
      ],
    },
    {
      slug: 'builder-route',
      title: '看看它如何被建成',
      duration: '约 5 分钟',
      description: '从真实项目出发，沿站点建设主题进入已经能使用的本地工具。',
      outcome: '了解当前架构、已完成能力和下一阶段的验收边界。',
      stops: [
        { label: '查看门户项目', href: '/projects' },
        { label: '进入站点建设主题', href: '/topics/site-building' },
        { label: '打开实验室', href: '/lab' },
      ],
    },
  ],
  principles: [
    { slug: 'truthful-state', title: '状态真实', description: '把已完成、正在进行和后续计划分开写，不用计划代替成果。' },
    { slug: 'local-first', title: '本地优先', description: '公开内容由仓库文件生成；浏览器工具尽量在本地完成。' },
    { slug: 'continuous-path', title: '连续探索', description: '重要页面既回答一个问题，也为下一步留下清楚入口。' },
    { slug: 'privacy-boundary', title: '边界清楚', description: '外部服务启用前先说明用途、数据范围、退出方式和失败回退。' },
  ],
  roadmap: [
    { title: '门户内容结构', description: '首页、知识、项目、动态、更新与本地工具已经形成连续访问路径。', state: 'completed', href: '/changelog' },
    { title: '外部服务接入', description: '天气已按主动同意和最小数据原则接入；AI、评论、统计和邮件订阅仍需分别确定服务、凭据与隐私策略。', state: 'configuration', href: '/lab' },
    { title: '公开与私有知识联动', description: '独立知识平台需要 GitHub 登录、成员权限、引用溯源和公开发布流程。', state: 'planned', href: '/ai' },
  ],
  focus: ['把公开与私有知识边界写清楚', '让 AI 回答可以核对、可以拒绝'],
  topics: [
    { slug: 'site-building', title: '站点建设', description: '设计、开发、发布与运行记录。', status: 'growing' },
    { slug: 'knowledge-management', title: '知识管理', description: '收集、整理、连接与公开发布的方法。', status: 'growing' },
    { slug: 'ai-knowledge', title: 'AI 与知识库', description: '带权限和引用的检索增强问答。', status: 'growing' },
  ],
  projects: [
    { slug: 'suntburst-portal', title: 'SunTBurst 个人门户', summary: '把静态博客建设成公开门户和知识入口。', status: 'building', href: '/projects/suntburst-portal/', updated: '2026-08-31' },
  ],
};
