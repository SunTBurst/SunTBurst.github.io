import assert from 'node:assert/strict';
import test from 'node:test';
import { cmsPublishedDate, cmsProjectStartedDate, cmsUpdatedDate } from '../../src/utils/cmsDates';

test('CMS published date preserves a valid imported publication date', () => {
  const metadata = { published: '2026-08-30T09:00:00+03:00' };
  assert.equal(cmsPublishedDate(metadata, '2026-09-22T12:00:00Z').toISOString(), '2026-08-30T06:00:00.000Z');
});

test('CMS dates fall back to the database publication time when imported values are invalid', () => {
  const fallback = '2026-09-22T12:00:00Z';
  assert.equal(cmsPublishedDate({ published: 'not-a-date' }, fallback).toISOString(), '2026-09-22T12:00:00.000Z');
  assert.equal(cmsUpdatedDate({ updated: 'not-a-date' }, fallback).toISOString(), '2026-09-22T12:00:00.000Z');
  assert.equal(cmsProjectStartedDate({ started: 'not-a-date' }, fallback).toISOString(), '2026-09-22T12:00:00.000Z');
});

test('CMS knowledge and projects retain their imported lifecycle dates', () => {
  const metadata = { published: '2026-08-30', updated: '2026-08-31', started: '2026-08-29' };
  const fallback = '2026-09-22T12:00:00Z';
  assert.equal(cmsUpdatedDate(metadata, fallback).toISOString(), '2026-08-31T00:00:00.000Z');
  assert.equal(cmsProjectStartedDate(metadata, fallback).toISOString(), '2026-08-29T00:00:00.000Z');
});
