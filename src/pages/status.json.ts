import type { APIRoute } from 'astro';
import { loadSiteStatusSnapshot } from '../utils/siteStatusData';

export const GET: APIRoute = async () => new Response(JSON.stringify(await loadSiteStatusSnapshot()), {
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
