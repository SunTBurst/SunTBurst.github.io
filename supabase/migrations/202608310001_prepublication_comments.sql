create extension if not exists pgcrypto;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('post','talk','knowledge','project')),
  target_path text not null check (target_path ~ '^/(posts|talk|knowledge|projects)/[^/?#]+/$'),
  parent_id uuid references public.comments(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_github_id bigint not null check (author_github_id > 0),
  author_login_snapshot text not null check (
    char_length(author_login_snapshot) between 1 and 39
    and author_login_snapshot ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$'
  ),
  body text check (body is null or char_length(body) between 2 and 2000),
  status text not null check (status in ('pending','ai_reviewing','manual_review','published','rejected','deleted')),
  policy_version text not null check (char_length(policy_version) between 1 and 64),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_deleted_body_check check ((status = 'deleted') = (body is null)),
  constraint comments_published_at_check check (status <> 'published' or published_at is not null),
  unique (author_id, idempotency_key)
);

create table public.comment_reviews (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  provider text not null check (provider in ('openai','kimi','deepseek')),
  model text not null check (char_length(model) between 1 and 160),
  decision text not null check (decision in ('approve','manual_review')),
  reason_codes text[] not null default '{}',
  policy_version text not null check (char_length(policy_version) between 1 and 64),
  request_id_hash text check (request_id_hash is null or char_length(request_id_hash) = 64),
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 120000),
  result_type text not null check (result_type in ('success','provider_error','invalid_response','timeout')),
  created_at timestamptz not null default now()
);

create table public.comment_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_github_id bigint check (actor_github_id is null or actor_github_id > 0),
  action text not null check (action in ('approve','reject','delete','author_delete','retention_delete')),
  reason_code text not null check (char_length(reason_code) between 1 and 64),
  reason_note text check (reason_note is null or char_length(reason_note) between 2 and 240),
  created_at timestamptz not null default now()
);

create index comments_target_publication_idx
  on public.comments (target_path, status, published_at desc, created_at desc);
create index comments_author_created_idx
  on public.comments (author_id, created_at desc);
create index comments_manual_review_idx
  on public.comments (created_at asc)
  where status = 'manual_review';
create index comment_reviews_comment_created_idx
  on public.comment_reviews (comment_id, created_at desc);
create index comment_actions_comment_created_idx
  on public.comment_moderation_actions (comment_id, created_at desc);

create or replace function public.set_comment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_comment_updated_at();

create or replace function public.enforce_comment_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_row public.comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent_row from public.comments where id = new.parent_id;
  if not found
    or parent_row.parent_id is not null
    or parent_row.status <> 'published'
    or parent_row.target_kind <> new.target_kind
    or parent_row.target_path <> new.target_path then
    raise exception 'invalid comment parent' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger comments_enforce_parent
before insert or update of parent_id, target_kind, target_path on public.comments
for each row execute function public.enforce_comment_parent();

alter table public.comments enable row level security;
alter table public.comment_reviews enable row level security;
alter table public.comment_moderation_actions enable row level security;

revoke all on table public.comments from anon, authenticated;
revoke all on table public.comment_reviews from anon, authenticated;
revoke all on table public.comment_moderation_actions from anon, authenticated;

grant select on table public.comments to anon, authenticated;

create policy comments_public_read
on public.comments
for select
to anon, authenticated
using (status = 'published');

create policy comments_owner_read
on public.comments
for select
to authenticated
using (author_id = auth.uid());

create or replace function public.cleanup_expired_comment_content(now_value timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
  audit_count integer := 0;
begin
  insert into public.comment_moderation_actions (
    comment_id,
    actor_id,
    actor_github_id,
    action,
    reason_code,
    reason_note,
    created_at
  )
  select
    id,
    null,
    null,
    'retention_delete',
    'retention_expired',
    null,
    now_value
  from public.comments
  where (status = 'rejected' and updated_at < now_value - interval '30 days')
     or (status = 'manual_review' and updated_at < now_value - interval '90 days');

  update public.comments
  set status = 'deleted', body = null, updated_at = now_value
  where (status = 'rejected' and updated_at < now_value - interval '30 days')
     or (status = 'manual_review' and updated_at < now_value - interval '90 days');
  get diagnostics expired_count = row_count;

  delete from public.comment_moderation_actions
  where created_at < now_value - interval '180 days';
  get diagnostics audit_count = row_count;

  return expired_count + audit_count;
end;
$$;

revoke all on function public.set_comment_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_comment_parent() from public, anon, authenticated;
revoke all on function public.cleanup_expired_comment_content(timestamptz) from public, anon, authenticated;
grant execute on function public.cleanup_expired_comment_content(timestamptz) to service_role;
