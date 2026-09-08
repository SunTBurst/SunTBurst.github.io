import assert from 'node:assert/strict';
import test from 'node:test';
import { isNavigationActive, navigationGroups } from '../../src/config/navigation';

test('navigation keeps the prescribed labels, group order, and unique local destinations', () => {
  assert.deepEqual(Object.keys(navigationGroups), ['primary', 'explore', 'connect']);

  const items = Object.values(navigationGroups).flat();
  assert.deepEqual(
    items.map(({ label }) => label),
    ['文章', '随记', '关于', '知识', '项目', '专题', '归档', '近况', '更新记录', '收藏', '随机看看', '工具', '友链'],
  );
  assert.equal(new Set(items.map(({ href }) => href)).size, 13);
  assert.ok(items.every(({ href }) => href.startsWith('/') && !href.startsWith('//')));
});

test('navigation matching treats home as exact and prefixes as path segments', () => {
  assert.equal(isNavigationActive('/', { href: '/', match: 'exact' }), true);
  assert.equal(isNavigationActive('/about', { href: '/', match: 'exact' }), false);
  assert.equal(isNavigationActive('/posts/a', { href: '/posts', match: 'prefix' }), true);
  assert.equal(isNavigationActive('/posts', { href: '/posts', match: 'prefix' }), true);
  assert.equal(isNavigationActive('/postscript', { href: '/posts', match: 'prefix' }), false);
});
