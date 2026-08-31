import { normalizeTarget } from '../_shared/comments/contracts';
import { HttpError, json, optionalActor, serveHttp, serviceClient } from '../_shared/comments/http';
import { COMMENT_MODERATOR_GITHUB_IDS } from '../_shared/comments/runtime';

const PUBLIC_FIELDS = 'id,parent_id,author_login_snapshot,body,status,published_at,created_at';

serveHttp(['GET'], async (request, origin) => {
  const client = serviceClient();
  const actor = await optionalActor(request, client);
  const url = new URL(request.url);

  if (url.searchParams.get('mode') === 'queue') {
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
    kind: url.searchParams.get('kind') ?? '',
    path: url.searchParams.get('path') ?? '',
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
      .in('status', ['pending', 'ai_reviewing', 'manual_review', 'rejected'])
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error('own_comment_read_failed');
    own = data ?? [];
  }

  const combined = new Map<string, unknown>();
  for (const row of [...(published ?? []), ...own] as Array<{ id: string }>) combined.set(row.id, row);
  return json(origin, { comments: [...combined.values()] });
});
