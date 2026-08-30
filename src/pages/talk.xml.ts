import rss from '@astrojs/rss';
import { getPublishedTalks } from '../utils/contentCollections';
import { renderTalkContent } from '../utils/talkContent';
import { siteConfig } from '../config/site';
import type { APIContext } from 'astro';

function stripInvalidXmlChars(str: string): string {
  return str.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
    '',
  );
}

export async function GET(context: APIContext) {
  const talks = await getPublishedTalks();

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');
  const author = siteConfig.author;

  const items = talks
    .map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const rendered = renderTalkContent(cleaned);
      const slug = (talk.data.slug || talk.slug || talk.id || '').trim();
      const permalink = `${siteUrl}/talk/${slug}/`;
      return {
        title: talk.data.title || '随手记',
        pubDate: talk.data.published,
        description: rendered.plainText.slice(0, 150),
        link: permalink,
        guid: permalink,
        content: rendered.sanitizedHtml,
        customData: `<dc:creator><![CDATA[${author}]]></dc:creator>`,
      };
    })
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

  return rss({
    title: `${siteConfig.title} - 说说`,
    description: `${siteConfig.title} 说说 RSS`,
    site: siteUrl,
    items,
    trailingSlash: false,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      content: 'http://purl.org/rss/1.0/modules/content/',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    customData: [
      '<language>zh-CN</language>',
      `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `<atom:link href="${siteUrl}/talk.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
  });
}
