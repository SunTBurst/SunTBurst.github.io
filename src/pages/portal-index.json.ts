import type { APIRoute } from 'astro';
import { buildPortalIndex } from '../utils/portalIndex';

export const GET: APIRoute = async () => new Response(JSON.stringify(await buildPortalIndex()), {
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
