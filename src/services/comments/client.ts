import type { CommentTarget } from '../../features/comments/domain';

export interface BrowserComment {
  id: string;
  parentId: string | null;
  authorLogin: string;
  body: string | null;
  status: 'pending' | 'ai_reviewing' | 'manual_review' | 'published' | 'rejected' | 'deleted';
  createdAt: string;
  publishedAt: string | null;
  own: boolean;
}

export interface BrowserSession {
  user?: { id?: string };
  [key: string]: unknown;
}

interface FunctionResult {
  data: unknown;
  error: unknown;
}

export interface SupabaseBrowserLike {
  auth: {
    getSession(): Promise<{ data: { session: BrowserSession | null }; error: unknown }>;
    signInWithOAuth(options: {
      provider: 'github';
      options: { redirectTo: string };
    }): Promise<{ data: unknown; error: unknown }>;
    signOut(): Promise<{ error: unknown }>;
    onAuthStateChange(callback: (event: string, session: BrowserSession | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
  };
  functions: {
    invoke(name: string, options?: { body?: unknown }): Promise<FunctionResult>;
  };
}

export interface CommentsClientConfig {
  endpoint: string;
  publishableKey: string;
}

export type SupabaseBrowserFactory = (
  endpoint: string,
  publishableKey: string,
) => Promise<SupabaseBrowserLike>;

export class CommentClientError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const STATUSES = new Set(['pending', 'ai_reviewing', 'manual_review', 'published', 'rejected', 'deleted']);

function parseComment(value: unknown): BrowserComment {
  if (!plainObject(value)
    || typeof value.id !== 'string'
    || (value.parent_id !== null && typeof value.parent_id !== 'string')
    || typeof value.author_login_snapshot !== 'string'
    || (value.body !== null && typeof value.body !== 'string')
    || typeof value.status !== 'string'
    || !STATUSES.has(value.status)
    || typeof value.created_at !== 'string'
    || (value.published_at !== null && typeof value.published_at !== 'string')) {
    throw new CommentClientError('invalid comment response');
  }
  return {
    id: value.id,
    parentId: value.parent_id as string | null,
    authorLogin: value.author_login_snapshot,
    body: value.body as string | null,
    status: value.status as BrowserComment['status'],
    createdAt: value.created_at,
    publishedAt: value.published_at as string | null,
    own: value.own === true,
  };
}

function parseComments(value: unknown): BrowserComment[] {
  if (!plainObject(value) || !Array.isArray(value.comments)) {
    throw new CommentClientError('invalid comment response');
  }
  return value.comments.map(parseComment);
}

function parseMutation(value: unknown): { id: string; status: BrowserComment['status'] } {
  if (!plainObject(value) || !plainObject(value.comment)
    || typeof value.comment.id !== 'string'
    || typeof value.comment.status !== 'string'
    || !STATUSES.has(value.comment.status)) {
    throw new CommentClientError('invalid comment response');
  }
  return { id: value.comment.id, status: value.comment.status as BrowserComment['status'] };
}

async function defaultFactory(endpoint: string, publishableKey: string): Promise<SupabaseBrowserLike> {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(endpoint, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) as unknown as SupabaseBrowserLike;
}

export function createCommentsClient(
  config: CommentsClientConfig,
  factory: SupabaseBrowserFactory = defaultFactory,
) {
  let instance: Promise<SupabaseBrowserLike> | null = null;
  const client = () => instance ??= factory(config.endpoint, config.publishableKey);

  async function invoke(name: string, body: unknown): Promise<unknown> {
    const result = await (await client()).functions.invoke(name, { body });
    if (result.error) throw new CommentClientError('comment service request failed');
    return result.data;
  }

  return {
    async getSession(): Promise<BrowserSession | null> {
      const result = await (await client()).auth.getSession();
      if (result.error) throw new CommentClientError('session read failed');
      return result.data.session;
    },

    async loginWithGitHub(redirectTo: string): Promise<void> {
      const result = await (await client()).auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      });
      if (result.error) throw new CommentClientError('github login failed');
    },

    async logout(): Promise<void> {
      const result = await (await client()).auth.signOut();
      if (result.error) throw new CommentClientError('logout failed');
    },

    async onAuthStateChange(callback: (session: BrowserSession | null) => void): Promise<() => void> {
      const subscription = (await client()).auth.onAuthStateChange((_event, session) => callback(session));
      return () => subscription.data.subscription.unsubscribe();
    },

    async list(target: CommentTarget, mode: 'target' | 'queue' = 'target'): Promise<BrowserComment[]> {
      return parseComments(await invoke('list-comments', { target, mode }));
    },

    async submit(input: {
      target: CommentTarget;
      body: string;
      parentId: string | null;
      idempotencyKey: string;
    }) {
      return parseMutation(await invoke('submit-comment', input));
    },

    async delete(commentId: string) {
      return parseMutation(await invoke('delete-comment', { commentId }));
    },

    async moderate(input: {
      commentId: string;
      action: 'approve' | 'reject' | 'delete';
      reasonCode: string;
      reasonNote: string | null;
    }) {
      return parseMutation(await invoke('moderate-comment', input));
    },
  };
}
