import assert from 'node:assert/strict';
import test from 'node:test';
import { portalConfig } from '../../src/config/portal';
import { validatePortalConfig } from '../../src/utils/portalConfig';

test('portal config has three distinct two-level exploration paths', () => {
  assert.deepEqual(validatePortalConfig(portalConfig), []);
  assert.ok(portalConfig.startHere.length >= 3);
  assert.equal(new Set(portalConfig.startHere.map((item) => item.href)).size, portalConfig.startHere.length);
  assert.ok(portalConfig.startHere.every((item) => item.href.startsWith('/') && item.nextHref.startsWith('/')));
});

test('portal config never uses invented numeric claims', () => {
  const serialized = JSON.stringify(portalConfig);
  assert.doesNotMatch(serialized, /(?:访问|在线|用户|文章)[^\n]{0,12}\d+/);
});
