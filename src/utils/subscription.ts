interface SubscriptionOpmlInput {
  siteUrl: string;
  title: string;
  description: string;
}

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export function subscriptionUrls(siteUrl: string) {
  const root = new URL(siteUrl);
  return {
    homeUrl: root.toString(),
    feedUrl: new URL('/rss.xml', root).toString(),
    opmlUrl: new URL('/suntburst.opml', root).toString(),
  };
}

export function buildSubscriptionOpml(input: SubscriptionOpmlInput): string {
  const { homeUrl, feedUrl } = subscriptionUrls(input.siteUrl);
  const title = escapeXml(input.title);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>${title}</title>`,
    '  </head>',
    '  <body>',
    `    <outline text="${title}" title="${title}" description="${escapeXml(input.description)}" type="rss" xmlUrl="${escapeXml(feedUrl)}" htmlUrl="${escapeXml(homeUrl)}"/>`,
    '  </body>',
    '</opml>',
  ].join('\n');
}
