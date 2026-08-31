import { getPublishedPosts, getPublishedTalks } from '../utils/contentCollections';
import { getPublishedKnowledge, getPublishedProjects, getPublishedUpdates } from '../utils/portalCollections';
import { siteConfig } from '../config/site';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import type { APIContext } from 'astro';
import { rssDate } from '../utils/dateFormat';
import { renderTalkContent } from '../utils/talkContent';
import { normalizeEntrySlug, postPath, talkPath } from '../utils/slugify';

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
  return str.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
    '',
  );
}

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*`_\[\]()\->|~]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderItem(title: string, url: string, desc: string, pubDate: string, content: string, author: string): string {
  return [
    '  <item>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(url)}</link>`,
    `    <guid>${escapeXml(url)}</guid>`,
    `    <description>${escapeXml(desc)}</description>`,
    `    <pubDate>${pubDate}</pubDate>`,
    `    <dc:creator><![CDATA[${author}]]></dc:creator>`,
    `    <content:encoded><![CDATA[${content}]]></content:encoded>`,
    '  </item>',
  ].join('\n');
}

function renderMarkdownContent(markdown: string): string {
  return sanitizeHtml(parser.render(stripInvalidXmlChars(markdown)), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });
}

export async function GET(context: APIContext) {
  const [posts, talks, knowledge, projects, updates] = await Promise.all([
    getPublishedPosts(),
    getPublishedTalks(),
    getPublishedKnowledge(),
    getPublishedProjects(),
    getPublishedUpdates(),
  ]);

  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');
  const author = siteConfig.author;

  const items = [
    ...posts.map((post) => {
      const body = typeof post.body === 'string' ? post.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const slug = normalizeEntrySlug(post);
      const desc = post.data.description || stripMarkdown(body).substring(0, 50);
      const url = `${siteUrl}${postPath(slug)}`;
      const pubDate = rssDate(post.data.published);
      const content = renderMarkdownContent(cleaned);
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(post.data.title, url, desc, pubDate, content, author),
      };
    }),
    ...talks.map((talk) => {
      const body = typeof talk.body === 'string' ? talk.body : '';
      const cleaned = stripInvalidXmlChars(body);
      const rendered = renderTalkContent(cleaned);
      const slug = normalizeEntrySlug(talk);
      const url = `${siteUrl}${talkPath(slug)}`;
      const pubDate = rssDate(talk.data.published);
      const desc = rendered.plainText.slice(0, 200);
      const content = rendered.sanitizedHtml;
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(`「说说」${talk.data.title || '随手记'}`, url, desc, pubDate, content, author),
      };
    }),
    ...knowledge.map((entry) => {
      const pubDate = rssDate(entry.data.updated);
      const slug = encodeURIComponent(normalizeEntrySlug(entry));
      const url = `${siteUrl}/knowledge/${slug}/`;
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(`「知识」${entry.data.title}`, url, entry.data.summary, pubDate, renderMarkdownContent(entry.body ?? ''), author),
      };
    }),
    ...projects.map((entry) => {
      const pubDate = rssDate(entry.data.updated);
      const slug = encodeURIComponent(normalizeEntrySlug(entry));
      const url = `${siteUrl}/projects/${slug}/`;
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(`「项目」${entry.data.title}`, url, entry.data.summary, pubDate, renderMarkdownContent(entry.body ?? ''), author),
      };
    }),
    ...updates.map((entry) => {
      const pubDate = rssDate(entry.data.published);
      const slug = encodeURIComponent(normalizeEntrySlug(entry));
      const url = `${siteUrl}/changelog#${slug}`;
      return {
        pubDate,
        sortTime: new Date(pubDate).getTime(),
        html: renderItem(`「更新」${entry.data.title}`, url, entry.data.summary, pubDate, renderMarkdownContent(entry.body ?? ''), author),
      };
    }),
  ]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((item) => item.html)
    .join('\n');

  const now = new Date();
  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
    '>',
    '  <channel>',
    `    <title>${escapeXml(siteConfig.title)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(siteConfig.subtitle || '')}</description>`,
    `    <language>zh-CN</language>`,
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(rss, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
