import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSubscriptionOpml,
  subscriptionUrls,
} from '../../src/utils/subscription';

test('subscription URLs normalize the site root and remain on the same origin', () => {
  assert.deepEqual(subscriptionUrls('https://portal.test/base/'), {
    homeUrl: 'https://portal.test/base/',
    feedUrl: 'https://portal.test/rss.xml',
    opmlUrl: 'https://portal.test/suntburst.opml',
  });
});

test('OPML exports one escaped RSS outline without leaking markup', () => {
  const opml = buildSubscriptionOpml({
    siteUrl: 'https://portal.test/',
    title: 'Sun & <Portal> "Feed"',
    description: '公开更新',
  });
  assert.match(opml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(opml, /<opml version="2\.0">/);
  assert.match(opml, /Sun &amp; &lt;Portal&gt; &quot;Feed&quot;/);
  assert.match(opml, /xmlUrl="https:\/\/portal\.test\/rss\.xml"/);
  assert.match(opml, /htmlUrl="https:\/\/portal\.test\/"/);
  assert.equal((opml.match(/type="rss"/g) ?? []).length, 1);
  assert.doesNotMatch(opml, /<Portal>/);
});
