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
    { href: '/posts', label: '文章', match: 'prefix' },
    { href: '/talks', label: '随记', match: 'prefix' },
    { href: '/about', label: '关于', match: 'prefix' },
  ],
  explore: [
    { href: '/knowledge', label: '知识', match: 'prefix' },
    { href: '/projects', label: '项目', match: 'prefix' },
    { href: '/topics', label: '专题', match: 'prefix' },
    { href: '/archive', label: '归档', match: 'prefix' },
    { href: '/now', label: '近况', match: 'prefix' },
    { href: '/changelog', label: '更新记录', match: 'prefix' },
    { href: '/favorites', label: '收藏', match: 'prefix' },
    { href: '/explore', label: '随机看看', match: 'prefix' },
    { href: '/lab', label: '工具', match: 'prefix' },
  ],
  connect: [
    { href: '/friends', label: '友链', match: 'prefix' },
  ],
} as const satisfies NavigationGroups;

export function isNavigationActive(pathname: string, item: Pick<NavigationItem, 'href' | 'match'>): boolean {
  return item.match === 'exact' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
