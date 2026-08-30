import assert from 'node:assert/strict';
import test from 'node:test';
import { browsePosts, type PublicPostBrowseEntry } from '../../src/utils/postBrowserCore';

const posts: PublicPostBrowseEntry[] = [
  { id: '1', title: 'Astro 门户', description: '公开站点实践', href: '/posts/1/', date: '2026-08-07', category: '工程', tags: ['Astro', '公开'] },
  { id: '2', title: '知识整理', description: '本地知识地图', href: '/posts/2/', date: '2026-08-06', category: '笔记', tags: ['知识'] },
  { id: '3', title: '构建检查', description: 'Astro 生产输出', href: '/posts/3/', date: '2026-08-05', category: '工程', tags: ['测试', '公开'] },
  { id: '4', title: '阶段记录', description: '设计取舍', href: '/posts/4/', date: '2026-08-04', category: '随笔', tags: ['记录'] },
  { id: '5', title: '搜索设计', description: '键盘可访问', href: '/posts/5/', date: '2026-08-03', category: '工程', tags: ['测试'] },
  { id: '6', title: '内容模型', description: '集合与索引', href: '/posts/6/', date: '2026-08-02', category: '笔记', tags: ['知识'] },
  { id: '7', title: '发布说明', description: '公开版本', href: '/posts/7/', date: '2026-08-01', category: '工程', tags: ['公开'] },
];

test('post browser combines text, category, and tag filters against public entries', () => {
  const result = browsePosts(posts, { query: 'astro', category: '工程', tag: '公开', page: 1 }, 6);
  assert.deepEqual(result.items.map(({ id }) => id), ['1', '3']);
  assert.equal(result.totalItems, 2);
  assert.equal(result.totalPages, 1);
  assert.equal(result.page, 1);
});

test('post browser returns an honest empty result without inventing a zero page', () => {
  const result = browsePosts(posts, { query: '不存在', category: '', tag: '', page: 8 }, 6);
  assert.deepEqual(result.items, []);
  assert.equal(result.totalItems, 0);
  assert.equal(result.totalPages, 1);
  assert.equal(result.page, 1);
  assert.deepEqual(result.pageNumbers, [1]);
});

test('post browser clamps requested pages and limits the visible page window', () => {
  const last = browsePosts(posts, { query: '', category: '', tag: '', page: 99 }, 2);
  assert.equal(last.page, 4);
  assert.deepEqual(last.items.map(({ id }) => id), ['7']);
  assert.equal(last.hasNext, false);
  assert.equal(last.hasPrevious, true);

  const first = browsePosts(posts, { query: '', category: '', tag: '', page: -5 }, 2);
  assert.equal(first.page, 1);
  assert.deepEqual(first.items.map(({ id }) => id), ['1', '2']);

  const manyPosts = Array.from({ length: 21 }, (_, index) => ({
    ...posts[0],
    id: String(index + 1),
    href: `/posts/${index + 1}/`,
  }));
  const middle = browsePosts(manyPosts, { query: '', category: '', tag: '', page: 6 }, 2);
  assert.equal(middle.totalPages, 11);
  assert.deepEqual(middle.pageNumbers, [4, 5, 6, 7, 8]);
});
