import assert from 'node:assert/strict';
import test from 'node:test';
import { isNavigationActive, navigationGroups } from '../../src/config/navigation';

test('navigation keeps the prescribed labels, group order, and unique local destinations', () => {
  assert.deepEqual(Object.keys(navigationGroups), ['primary', 'explore', 'connect']);

  const items = Object.values(navigationGroups).flat();
  assert.deepEqual(
    items.map(({ label }) => label),
    ['首页', '文章', '知识', '项目', '动态', '说说', '主题', '更新', '实验室', '友链', '关于'],
  );
  assert.equal(new Set(items.map(({ href }) => href)).size, 11);
  assert.ok(items.every(({ href }) => href.startsWith('/') && !href.startsWith('//')));
});

test('navigation matching treats home as exact and prefixes as path segments', () => {
  assert.equal(isNavigationActive('/', { href: '/', match: 'exact' }), true);
  assert.equal(isNavigationActive('/about', { href: '/', match: 'exact' }), false);
  assert.equal(isNavigationActive('/posts/a', { href: '/posts', match: 'prefix' }), true);
  assert.equal(isNavigationActive('/posts', { href: '/posts', match: 'prefix' }), true);
  assert.equal(isNavigationActive('/postscript', { href: '/posts', match: 'prefix' }), false);
});
