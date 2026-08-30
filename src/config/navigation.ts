export type NavigationMatch = 'exact' | 'prefix';

export interface NavigationItem {
  href: string;
  label: string;
  match: NavigationMatch;
}

export type NavigationGroups = {
  primary: readonly NavigationItem[];
  explore: readonly NavigationItem[];
  connect: readonly NavigationItem[];
};

export const navigationGroups = {
  primary: [
    { href: '/', label: '首页', match: 'exact' },
    { href: '/posts', label: '文章', match: 'prefix' },
    { href: '/knowledge', label: '知识', match: 'prefix' },
    { href: '/projects', label: '项目', match: 'prefix' },
    { href: '/now', label: '动态', match: 'prefix' },
  ],
  explore: [
    { href: '/talks', label: '说说', match: 'prefix' },
    { href: '/topics', label: '主题', match: 'prefix' },
    { href: '/changelog', label: '更新', match: 'prefix' },
    { href: '/lab', label: '实验室', match: 'prefix' },
  ],
  connect: [
    { href: '/friends', label: '友链', match: 'prefix' },
    { href: '/about', label: '关于', match: 'prefix' },
  ],
} as const satisfies NavigationGroups;

export function isNavigationActive(pathname: string, item: Pick<NavigationItem, 'href' | 'match'>): boolean {
  return item.match === 'exact' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
