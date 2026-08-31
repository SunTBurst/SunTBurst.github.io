import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FRIEND_LINK_ISSUE_URL,
  curatedBookmarks,
  friendLinks,
} from '../../src/config/friends';

test('friend directory never invents a reciprocal relationship', () => {
  assert.deepEqual(friendLinks, []);
});

test('curated bookmarks are distinct HTTPS resources with an explicit category', () => {
  assert.ok(curatedBookmarks.length >= 6);
  assert.equal(new Set(curatedBookmarks.map(({ title }) => title)).size, curatedBookmarks.length);
  assert.equal(new Set(curatedBookmarks.map(({ href }) => href)).size, curatedBookmarks.length);

  for (const bookmark of curatedBookmarks) {
    assert.match(bookmark.href, /^https:\/\//);
    assert.ok(bookmark.title.length >= 2);
    assert.ok(bookmark.description.length >= 12);
    assert.ok(['建站基础', '内容与开放标准', '知识管理'].includes(bookmark.category));
  }
});

test('friend applications use the repository public issue form', () => {
  assert.equal(
    FRIEND_LINK_ISSUE_URL,
    'https://github.com/SunTBurst/SunTBurst.github.io/issues/new?template=friend-link.yml',
  );
});
