import { getProcessedPosts } from '../utils/postsFetcher';
import { toLegacyPostPayload } from '../utils/portalIndex';

export async function GET() {
  const posts = await getProcessedPosts();
  const payload = posts.map(toLegacyPostPayload);

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
