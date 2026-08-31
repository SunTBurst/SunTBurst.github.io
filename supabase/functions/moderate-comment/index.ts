import { moderateComment, type ModerationAction, type ModeratedStatus } from '../_shared/comments/moderate';
import { json, readJsonObject, requireActor, serveHttp, serviceClient } from '../_shared/comments/http';
import { COMMENT_MODERATOR_GITHUB_IDS } from '../_shared/comments/runtime';

serveHttp(['POST'], async (request, origin) => {
  const client = serviceClient();
  const actor = await requireActor(request, client);
  const body = await readJsonObject(request);
  const result = await moderateComment({
    commentId: typeof body.commentId === 'string' ? body.commentId : '',
    action: typeof body.action === 'string' ? body.action as ModerationAction : 'approve',
    reasonCode: typeof body.reasonCode === 'string' ? body.reasonCode : '',
    reasonNote: body.reasonNote === null ? null : typeof body.reasonNote === 'string' ? body.reasonNote : null,
  }, actor, {
    moderatorGithubIds: COMMENT_MODERATOR_GITHUB_IDS,
    deleteOwnAtomically: async () => { throw new Error('unsupported_operation'); },
    moderateAtomically: async (input) => {
      const { data, error } = await client.rpc('moderate_comment_atomically', {
        p_comment_id: input.commentId,
        p_action: input.action,
        p_next_status: input.nextStatus,
        p_actor_id: input.moderatorUserId,
        p_actor_github_id: input.moderatorGithubId,
        p_reason_code: input.reasonCode,
        p_reason_note: input.reasonNote,
      });
      if (error) throw new Error('moderation_failed');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error('moderation_failed');
      return { id: row.id, status: row.status as ModeratedStatus };
    },
  });
  return json(origin, { comment: result });
});
