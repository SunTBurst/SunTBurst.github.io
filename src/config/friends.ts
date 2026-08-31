export interface FriendLink {
  title: string;
  description: string;
  href: string;
  avatar?: string;
}

export interface CuratedBookmark {
  title: string;
  description: string;
  href: string;
  category: '建站基础' | '内容与开放标准' | '知识管理';
}

// 只在真实建立联系后添加，不能用模板站点或自有账号填充数量。
export const friendLinks: FriendLink[] = [];

export const FRIEND_LINK_ISSUE_URL = 'https://github.com/SunTBurst/SunTBurst.github.io/issues/new?template=friend-link.yml';

export const curatedBookmarks: CuratedBookmark[] = [
  {
    title: 'Astro 中文文档',
    description: '了解这个门户使用的内容驱动框架、群岛架构和静态构建方式。',
    href: 'https://docs.astro.build/zh-cn/concepts/why-astro/',
    category: '建站基础',
  },
  {
    title: 'GitHub Pages 文档',
    description: '理解这个网站如何从公开仓库构建、托管并通过 HTTPS 访问。',
    href: 'https://docs.github.com/zh/pages/getting-started-with-github-pages/what-is-github-pages',
    category: '建站基础',
  },
  {
    title: 'MDN Web 无障碍',
    description: '从语义、键盘操作和可感知内容出发，让网页对更多人真正可用。',
    href: 'https://developer.mozilla.org/zh-CN/docs/Web/Accessibility',
    category: '建站基础',
  },
  {
    title: 'Markdown 基础语法',
    description: '用稳定、可迁移的纯文本格式编写文章、知识卡片和项目记录。',
    href: 'https://www.markdownguide.org/basic-syntax/',
    category: '内容与开放标准',
  },
  {
    title: 'RSS 2.0 规范',
    description: '了解公开订阅源的基本结构，以及无需邮箱也能跟踪更新的方式。',
    href: 'https://www.rssboard.org/rss-specification',
    category: '内容与开放标准',
  },
  {
    title: 'Obsidian 帮助文档',
    description: '探索本地 Markdown 笔记、链接和知识组织的常用方法。',
    href: 'https://obsidian.md/help/',
    category: '知识管理',
  },
];
