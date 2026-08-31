import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { env, optionalEnv, serve } from './runtime';

export interface AuthenticatedCommentActor {
  userId: string;
  githubId: number;
  login: string;
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

function allowedOrigins(): Set<string> {
  const values = (optionalEnv('PUBLIC_PORTAL_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) throw new Error('Missing server configuration: PUBLIC_PORTAL_ORIGINS');
  return new Set(values);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    vary: 'Origin',
  };
}

export function json(origin: string, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function githubActor(user: User): AuthenticatedCommentActor {
  const identity = user.identities?.find((identity) => identity.provider === 'github');
  const identityWithProviderId = identity as (typeof identity & { provider_id?: string }) | undefined;
  const rawGithubId = identityWithProviderId?.provider_id ?? identity?.identity_data?.id;
  const githubId = typeof rawGithubId === 'number' ? rawGithubId : Number(rawGithubId);
  const rawLogin = identity?.identity_data?.user_name ?? identity?.identity_data?.login;
  const login = typeof rawLogin === 'string' ? rawLogin.trim() : '';
  if (!identity || !Number.isSafeInteger(githubId) || githubId <= 0) throw new HttpError(403, 'github_identity_required');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(login)) {
    throw new HttpError(403, 'github_identity_invalid');
  }
  return { userId: user.id, githubId, login };
}

export async function optionalActor(
  request: Request,
  client: SupabaseClient,
): Promise<AuthenticatedCommentActor | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'invalid_session');
  return githubActor(data.user);
}

export async function requireActor(
  request: Request,
  client: SupabaseClient,
): Promise<AuthenticatedCommentActor> {
  const actor = await optionalActor(request, client);
  if (!actor) throw new HttpError(401, 'authentication_required');
  return actor;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 16_384) throw new HttpError(413, 'request_too_large');
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'invalid_json');
  return value as Record<string, unknown>;
}

export function serveHttp(
  methods: readonly string[],
  handler: (request: Request, origin: string) => Promise<Response>,
): void {
  serve(async (request) => {
    const origin = request.headers.get('origin') ?? '';
    let origins: Set<string>;
    try {
      origins = allowedOrigins();
    } catch {
      return new Response(JSON.stringify({ error: 'service_not_configured' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (!origins.has(origin)) {
      return new Response(JSON.stringify({ error: 'origin_forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (request.method === 'OPTIONS') return json(origin, { ok: true });
    if (!methods.includes(request.method)) return json(origin, { error: 'method_not_allowed' }, 405);
    try {
      return await handler(request, origin);
    } catch (error) {
      if (error instanceof HttpError) return json(origin, { error: error.code }, error.status);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('comment_rate_limit')) return json(origin, { error: 'rate_limited' }, 429);
      if (message.includes('public comment target')) return json(origin, { error: 'target_not_found' }, 404);
      if (message.includes('forbidden')) return json(origin, { error: 'forbidden' }, 403);
      return json(origin, { error: 'request_failed' }, 400);
    }
  });
}
