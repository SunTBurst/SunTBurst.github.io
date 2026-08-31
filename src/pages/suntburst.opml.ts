import type { APIContext } from 'astro';
import { siteConfig } from '../config/site';
import { buildSubscriptionOpml } from '../utils/subscription';

export function GET(context: APIContext) {
  const siteUrl = (context.site ?? new URL(siteConfig.url)).toString();
  const opml = buildSubscriptionOpml({
    siteUrl,
    title: `${siteConfig.title} RSS`,
    description: siteConfig.subtitle,
  });
  return new Response(opml, {
    headers: {
      'Content-Type': 'text/x-opml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="suntburst.opml"',
    },
  });
}
