begin;

select plan(14);

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('comments', 'comment_reviews', 'comment_moderation_actions', 'comment_targets')
  ),
  4,
  'all comment tables exist'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public' and table_name = 'comments'
  ),
  14,
  'comments keeps the complete constrained record shape'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('comments', 'comment_reviews', 'comment_moderation_actions', 'comment_targets')
      and c.relrowsecurity
  ),
  4,
  'RLS is enabled on every comment table'
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'comments_target_publication_idx',
        'comments_author_created_idx',
        'comments_manual_review_idx',
        'comment_reviews_comment_created_idx',
        'comment_actions_comment_created_idx'
      )
  ),
  5,
  'all operational comment indexes exist'
);

select is(
  (
    select count(*)::integer
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'comments'
      and not t.tgisinternal
      and t.tgname in ('comments_set_updated_at', 'comments_enforce_parent')
  ),
  2,
  'comment timestamps and parent integrity are trigger-enforced'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'comments'),
  2,
  'comments has only public-read and owner-read policies'
);

select ok(
  has_any_column_privilege('anon', 'public.comments', 'SELECT'),
  'anonymous visitors can read the explicitly public comment columns'
);

select ok(
  has_any_column_privilege('authenticated', 'public.comments', 'SELECT'),
  'authenticated visitors can read the explicitly public comment columns'
);

select ok(
  not has_column_privilege('anon', 'public.comments', 'author_id', 'SELECT'),
  'anonymous visitors cannot read the private author UUID'
);

select ok(
  not has_column_privilege('authenticated', 'public.comments', 'author_github_id', 'SELECT'),
  'authenticated visitors cannot read the stored GitHub numeric ID'
);

select ok(
  not has_table_privilege('anon', 'public.comments', 'INSERT,UPDATE,DELETE'),
  'anonymous visitors cannot mutate comments directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.comments', 'INSERT,UPDATE,DELETE'),
  'authenticated visitors cannot mutate comments directly'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_pending_comment',
        'finalize_comment_review',
        'moderate_comment_atomically',
        'delete_own_comment_atomically',
        'cleanup_expired_comment_content'
      )
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  5,
  'service role can execute every server-side comment operation'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_pending_comment',
        'finalize_comment_review',
        'moderate_comment_atomically',
        'delete_own_comment_atomically',
        'cleanup_expired_comment_content'
      )
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0,
  'authenticated browser sessions cannot execute server-only operations'
);

select * from finish();
rollback;
