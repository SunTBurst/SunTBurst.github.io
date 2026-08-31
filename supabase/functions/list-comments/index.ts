import { normalizeTarget } from '../_shared/comments/contracts.ts';
import { HttpError, json, optionalActor, readJsonObject, serveHttp, serviceClient } from '../_shared/comments/http.ts';
import { COMMENT_MODERATOR_GITHUB_IDS } from '../_shared/comments/runtime.ts';

const PUBLIC_FIELDS = 'id,parent_id,author_login_snapshot,body,status,published_at,created_at';

serveHttp(['GET', 'POST'], async (request, origin) => {
  const client = serviceClient();
  const actor = await optionalActor(request, client);
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await readJsonObject(request) : null;
  const bodyTarget = body?.target && typeof body.target === 'object' && !Array.isArray(body.target)
    ? body.target as Record<string, unknown>
    : null;
  const mode = body?.mode ?? url.searchParams.get('mode');

  if (mode === 'queue') {
    if (!actor || !COMMENT_MODERATOR_GITHUB_IDS.has(actor.githubId)) throw new HttpError(403, 'forbidden');
    const { data, error } = await client
      .from('comments')
      .select('id,target_kind,target_path,parent_id,author_login_snapshot,body,status,created_at,comment_reviews(provider,model,decision,reason_codes,result_type,created_at)')
      .eq('status', 'manual_review')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw new Error('queue_read_failed');
    return json(origin, { comments: data ?? [] });
  }

  const target = normalizeTarget({
    kind: typeof bodyTarget?.kind === 'string' ? bodyTarget.kind : url.searchParams.get('kind') ?? '',
    path: typeof bodyTarget?.path === 'string' ? bodyTarget.path : url.searchParams.get('path') ?? '',
  });
  const { data: published, error: publicError } = await client
    .from('comments')
    .select(PUBLIC_FIELDS)
    .eq('target_kind', target.kind)
    .eq('target_path', target.path)
    .eq('status', 'published')
    .order('published_at', { ascending: true })
    .limit(200);
  if (publicError) throw new Error('comment_read_failed');

  let own: unknown[] = [];
  if (actor) {
    const { data, error } = await client
      .from('comments')
      .select(PUBLIC_FIELDS)
      .eq('target_kind', target.kind)
      .eq('target_path', target.path)
      .eq('author_id', actor.userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error('own_comment_read_failed');
    own = (data ?? []).map((row) => ({ ...row, own: true }));
  }

  const combined = new Map<string, unknown>();
  for (const row of (published ?? []).map((item) => ({ ...item, own: false }))) combined.set(row.id, row);
  for (const row of own as Array<{ id: string }>) combined.set(row.id, row);
  return json(origin, { comments: [...combined.values()] });
});
