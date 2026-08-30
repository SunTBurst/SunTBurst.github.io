import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertUniqueLocalEntries,
  normalizeSearchText,
  pickRandomEntry,
  plainTextSummary,
} from '../../src/utils/portalIndexCore';
import type { PortalIndexEntry } from '../../src/types/portal';

const entries: PortalIndexEntry[] = [
  { id: 'page:start', kind: 'page', title: '开始', description: '入口', href: '/start', updatedAt: '2026-08-30', topics: [] },
  { id: 'project:portal', kind: 'project', title: '门户', description: '建设', href: '/projects/suntburst-portal/', updatedAt: '2026-08-30', topics: ['站点'] },
];

test('random selection only returns real entries at empty and numeric boundaries', () => {
  assert.equal(pickRandomEntry(entries, -1)?.href, '/start');
  assert.equal(pickRandomEntry(entries, 0)?.href, '/start');
  assert.equal(pickRandomEntry(entries, 0.5)?.href, '/projects/suntburst-portal/');
  assert.equal(pickRandomEntry(entries, 1)?.href, '/projects/suntburst-portal/');
  assert.equal(pickRandomEntry([], 0.5), null);
});

test('search normalization is stable for Chinese and Latin text', () => {
  assert.equal(normalizeSearchText('  AI 与 Knowledge  '), 'ai 与 knowledge');
});

test('local entry validation rejects protocol-relative hrefs', () => {
  assert.throws(
    () => assertUniqueLocalEntries([{ ...entries[0], href: '//host/path' }]),
    /non-local portal href: \/\/host\/path/,
  );
});

test('local entry validation rejects duplicate hrefs', () => {
  assert.throws(
    () => assertUniqueLocalEntries([{ ...entries[0] }, { ...entries[0], id: 'page:other' }]),
    /duplicate portal href: \/start/,
  );
});

test('body summary removes markdown and HTML into readable plain text', () => {
  assert.equal(
    plainTextSummary('# 标题\n\n这是 **公开** 内容。\n\n![封面](https://example.test/image.png)\n\n`代码`'),
    '标题 这是 公开 内容。 代码',
  );
});

test('body summary omits absolute attachment URLs', () => {
  assert.equal(
    plainTextSummary('图片 https://files.example.test/attachment.webp 结束'),
    '图片 结束',
  );
});
