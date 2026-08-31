import { deleteOwnComment } from '../_shared/comments/moderate';
import { json, readJsonObject, requireActor, serveHttp, serviceClient } from '../_shared/comments/http';
import { COMMENT_MODERATOR_GITHUB_IDS } from '../_shared/comments/runtime';

serveHttp(['POST'], async (request, origin) => {
  const client = serviceClient();
  const actor = await requireActor(request, client);
  const body = await readJsonObject(request);
  const commentId = typeof body.commentId === 'string' ? body.commentId : '';
  const result = await deleteOwnComment(commentId, actor, {
    moderatorGithubIds: COMMENT_MODERATOR_GITHUB_IDS,
    moderateAtomically: async () => { throw new Error('unsupported_operation'); },
    deleteOwnAtomically: async (id, userId) => {
      const { data, error } = await client.rpc('delete_own_comment_atomically', {
        p_comment_id: id,
        p_author_id: userId,
      });
      if (error) throw new Error('comment_delete_failed');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error('comment_delete_failed');
      return { id: row.id, status: 'deleted' };
    },
  });
  return json(origin, { comment: result });
});
