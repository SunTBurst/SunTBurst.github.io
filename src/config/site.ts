export const appearanceConfig = {
  // 新访客默认外观。配色：paper/ocean/forest/coffee/graphite；版式：paper/compact/cards。
  defaultPalette: 'paper',
  defaultLayout: 'paper',
  // 页面浅色背景、普通卡片背景、文章阅读区背景。
  backgroundColor: '#f7f5ef',
  surfaceColor: '#fffdf8',
  articleColor: '#fffdf8',
  // 首页装饰图片仅填写本站 /images/ 路径；留空不显示。
  homeImage: '',
} as const;

export const githubAuthoringConfig = {
  owner: 'SunTBurst',
  name: 'SunTBurst.github.io',
  branch: 'main',
  workflow: 'deploy-pages.yml',
} as const;

const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://suntburst.github.io';

export const siteConfig = {
  title: 'SunTBurst 个人门户',
  subtitle: '把学习、实践与知识连接成一张长期生长的地图',
  author: 'SunTBurst',
  url: siteUrl,
  avatar: '/images/avatar.svg',
  timeZone: 'Asia/Riyadh',
} as const;

export const navigation = [
  { href: '/', label: '首页' },
  { href: '/posts', label: '文章' },
  { href: '/knowledge', label: '知识' },
  { href: '/projects', label: '项目' },
  { href: '/now', label: '动态' },
  { href: '/talks', label: '随记' },
  { href: '/tags', label: '标签' },
  { href: '/about', label: '关于' },
  { href: '/friends', label: '友链' },
] as const;

export const contentConfig = {
  license: {
    name: '转载前请注明出处',
    url: '/privacy',
  },
} as const;

export const i18nConfig = {
  home: {
    title: siteConfig.title,
    description: siteConfig.subtitle,
  },
  search: {
    placeholder: '搜索本地文章',
    clear: '清除',
    noResults: '没有找到匹配的文章',
    jumpTo: '跳转到页码',
    go: '前往',
  },
  archive: {
    title: '文章归档',
    description: '按时间浏览全部文章',
    emptyText: '暂时还没有文章',
    emptySubtext: '新的记录会出现在这里',
    timelineTitle: '时间线',
  },
  category: {
    titleSuffix: ' - 分类',
    descriptionTemplate: '分类“{name}”下的文章',
  },
  tag: {
    titleSuffix: ' - 标签',
    descriptionTemplate: '标签“{name}”下的文章',
  },
  post: {
    readingTime: '预计阅读',
    readingTimeUnit: '分钟',
    copyrightTitle: '作者',
    publishedTitle: '发布时间',
    licenseTitle: '转载说明',
    relatedPosts: '相关文章',
    prevPost: '上一篇',
    nextPost: '下一篇',
    noMorePrev: '没有更早的文章了',
    noMoreNext: '没有更新的文章了',
    tocTitle: '目录',
    tocEmpty: '本文暂无目录',
  },
  talks: {
    title: '随记',
    description: '简短记录此刻的想法',
  },
  talk: {
    detailFallbackTitle: '一条随记',
  },
  notFound: {
    title: '页面未找到',
    bigText: '404',
    message: '这里没有你要找的页面。',
    backHome: '返回首页',
    browseArchive: '浏览归档',
  },
} as const;
