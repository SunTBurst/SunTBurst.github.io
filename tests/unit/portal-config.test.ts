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

test('portal config provides three continuous local visitor journeys', () => {
  assert.equal(portalConfig.journeys.length, 3);
  assert.ok(portalConfig.journeys.every(({ stops }) => stops.length === 3));
  assert.ok(portalConfig.journeys.flatMap(({ stops }) => stops).every(({ href }) => href.startsWith('/') && !href.startsWith('//')));
  assert.equal(new Set(portalConfig.journeys.map(({ slug }) => slug)).size, portalConfig.journeys.length);
});

test('portal config never uses invented numeric claims', () => {
  const serialized = JSON.stringify(portalConfig);
  assert.doesNotMatch(serialized, /(?:访问|在线|用户|文章)[^\n]{0,12}\d+/);
});

test('portal project fallback uses its canonical emitted detail route', () => {
  assert.equal(portalConfig.projects[0]?.href, '/projects/suntburst-portal/');
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

test('portal config rejects unsafe or incomplete visitor journeys', () => {
  const unsafeJourneyConfig = {
    ...portalConfig,
    journeys: [
      {
        ...portalConfig.journeys[0],
        stops: [{ label: '外部入口', href: '//example.com' as const }, ...portalConfig.journeys[0].stops.slice(1)],
      },
      ...portalConfig.journeys.slice(1),
    ],
  };
  const shortJourneyConfig = {
    ...portalConfig,
    journeys: [{ ...portalConfig.journeys[0], stops: portalConfig.journeys[0].stops.slice(0, 2) }, ...portalConfig.journeys.slice(1)],
  };

  assert.deepEqual(validatePortalConfig(unsafeJourneyConfig), ['invalid journey stop: 第一次来到这里']);
  assert.deepEqual(validatePortalConfig(shortJourneyConfig), ['journey must have at least three stops: 第一次来到这里']);
});
