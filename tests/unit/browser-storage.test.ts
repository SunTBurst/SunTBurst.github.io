import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearLocalPortalData,
  FAVORITES_STORAGE_KEY,
  FOOTPRINTS_STORAGE_KEY,
  HISTORY_ENABLED_KEY,
  normalizeStoredItem,
  parseStoredItems,
  removeStoredItem,
  setHistoryEnabled,
  upsertStoredItem,
  writeStoredItems,
  type StorageLike,
} from '../../src/utils/browserStorage';

type StorageEntry = {
  [key: string]: string | undefined;
};

function createStorageFixture() {
  const store: StorageEntry = {};
  const storage: StorageLike = {
    getItem: (key) => (key in store ? store[key] ?? null : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
  return { storage, store };
}

test('parser ignores non-json and non-local routes', () => {
  assert.deepEqual(parseStoredItems(null), []);
  assert.deepEqual(parseStoredItems('not-json'), []);
  assert.deepEqual(parseStoredItems('[{"href":"https://evil.test","title":"x","kind":"page","savedAt":1}]'), []);
  assert.deepEqual(
    parseStoredItems('[{"href":"/good","title":"x","kind":"page","savedAt":1},{"href":"//bad","title":"x","kind":"page","savedAt":2}]'),
    [{ href: '/good', title: 'x', kind: 'page', savedAt: 1 }],
  );
});

test('storage parser de-duplicates and caps at 100 items', () => {
  const payload = Array.from({ length: 105 }, (_, index) => ({
    href: `/p/${index}`,
    title: `title-${index}`,
    kind: 'page',
    savedAt: index,
  }));
  assert.equal(parseStoredItems(JSON.stringify(payload)).length, 100);

  const parsed = parseStoredItems(JSON.stringify([{ href: '/p/1', title: 'A', kind: 'post', savedAt: 1 }, { href: '/p/1', title: 'A', kind: 'post', savedAt: 1 }]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].href, '/p/1');
});

test('upsertStoredItem preserves max size and replaces duplicates', () => {
  let items = Array.from({ length: 100 }, (_, index) => ({
    href: `/dup/${index}`,
    title: `title-${index}`,
    kind: 'page',
    savedAt: index,
  }));
  items = upsertStoredItem(items, { href: '/dup/50', title: 'updated', kind: 'page', savedAt: 200 });
  assert.equal(items.length, 100);
  assert.equal(items[0].href, '/dup/50');
  assert.equal(items[0].savedAt, 200);

  items = upsertStoredItem(items, { href: '/new-item', title: 'new', kind: 'post', savedAt: 201 });
  assert.equal(items.length, 100);
});

test('history flag only touches dedicated key', () => {
  const { storage, store } = createStorageFixture();
  store['legacy'] = 'legacy';

  assert.equal(setHistoryEnabled(storage, true), true);
  assert.equal(store[HISTORY_ENABLED_KEY], '1');
  assert.equal(store['legacy'], 'legacy');
});

test('clearLocalPortalData removes only local task keys', () => {
  const { storage, store } = createStorageFixture();
  store[FAVORITES_STORAGE_KEY] = '[]';
  store[FOOTPRINTS_STORAGE_KEY] = '[]';
  store[HISTORY_ENABLED_KEY] = '1';
  store['legacy'] = 'do-not-touch';

  assert.equal(clearLocalPortalData(storage), true);
  assert.equal(FAVORITES_STORAGE_KEY in store, false);
  assert.equal(FOOTPRINTS_STORAGE_KEY in store, false);
  assert.equal(HISTORY_ENABLED_KEY in store, false);
  assert.equal(store['legacy'], 'do-not-touch');
});

test('reader/writer round trip and metadata normalization', () => {
  const { storage, store } = createStorageFixture();
  const item = {
    href: '/valid',
    title: '  hello  ',
    kind: 'page',
    savedAt: Date.now(),
    searchText: '正文不应进入收藏',
    content: '<p>原始正文也不应进入收藏</p>',
  };
  assert.equal(upsertStoredItem([], item)[0].title, 'hello');
  assert.equal(writeStoredItems(storage, FAVORITES_STORAGE_KEY, [item]), true);
  assert.deepEqual(normalizeStoredItem(item), {
    href: '/valid',
    title: 'hello',
    kind: 'page',
    savedAt: item.savedAt,
  });
  const raw = store[FAVORITES_STORAGE_KEY];
  assert.equal(typeof raw, 'string');
  assert.equal(raw?.startsWith('['), true);

  const readBack = parseStoredItems(raw ?? null);
  assert.equal(readBack.length, 1);
  assert.equal(readBack[0].title, 'hello');
  assert.deepEqual(removeStoredItem(readBack, '/valid'), []);
});
