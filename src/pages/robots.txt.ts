import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL(siteConfig.url)).toString().replace(/\/$/, '');
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /moderation\nSitemap: ${base}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
