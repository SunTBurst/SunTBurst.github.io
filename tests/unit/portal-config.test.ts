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

test('portal config rejects protocol-relative exploration paths', () => {
  const invalidHrefConfig = {
    ...portalConfig,
    startHere: [{ ...portalConfig.startHere[0], href: '//example.com' as const }, ...portalConfig.startHere.slice(1)],
  };
  const invalidNextHrefConfig = {
    ...portalConfig,
    startHere: [{ ...portalConfig.startHere[0], nextHref: '//subdomain.upxuu.com' as const }, ...portalConfig.startHere.slice(1)],
  };

  assert.deepEqual(validatePortalConfig(invalidHrefConfig), ['invalid local path: 认识这个空间']);
  assert.deepEqual(validatePortalConfig(invalidNextHrefConfig), ['invalid local path: 认识这个空间']);
});
