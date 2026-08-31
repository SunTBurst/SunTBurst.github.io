create table public.comment_targets (
  target_kind text not null check (target_kind in ('post','talk','knowledge','project')),
  target_path text not null check (target_path ~ '^/(posts|talk|knowledge|projects)/[^/?#]+/$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 500),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (target_kind, target_path)
);

alter table public.comment_targets enable row level security;
revoke all on table public.comment_targets from anon, authenticated;

create or replace function public.create_pending_comment(
  p_target_kind text,
  p_target_path text,
  p_parent_id uuid,
  p_author_id uuid,
  p_author_github_id bigint,
  p_author_login text,
  p_body text,
  p_policy_version text,
  p_idempotency_key text
)
returns table (id uuid, status text, reused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row public.comments%rowtype;
  created_id uuid;
begin
  select c.* into existing_row
  from public.comments c
  where c.author_id = p_author_id and c.idempotency_key = p_idempotency_key;
  if found then
    return query select existing_row.id, existing_row.status, true;
    return;
  end if;

  if not exists (
    select 1 from public.comment_targets t
    where t.target_kind = p_target_kind and t.target_path = p_target_path and t.active
  ) then
    raise exception 'public_comment_target_missing' using errcode = 'P0001';
  end if;

  if (select count(*) from public.comments c
      where c.author_id = p_author_id and c.created_at >= now() - interval '10 minutes') >= 5
     or (select count(*) from public.comments c
         where c.author_id = p_author_id and c.created_at >= now() - interval '1 day') >= 50 then
    raise exception 'comment_rate_limit' using errcode = 'P0001';
  end if;

  insert into public.comments as created_comment (
    target_kind, target_path, parent_id, author_id, author_github_id,
    author_login_snapshot, body, status, policy_version, idempotency_key
  ) values (
    p_target_kind, p_target_path, p_parent_id, p_author_id, p_author_github_id,
    p_author_login, p_body, 'pending', p_policy_version, p_idempotency_key
  ) returning created_comment.id into created_id;

  return query select created_id, 'pending'::text, false;
exception
  when unique_violation then
    select c.* into existing_row
    from public.comments c
    where c.author_id = p_author_id and c.idempotency_key = p_idempotency_key;
    if found then
      return query select existing_row.id, existing_row.status, true;
      return;
    end if;
    raise;
end;
$$;

create or replace function public.finalize_comment_review(
  p_comment_id uuid,
  p_provider text,
  p_model text,
  p_decision text,
  p_reason_codes text[],
  p_policy_version text,
  p_request_id_hash text,
  p_duration_ms integer,
  p_result_type text
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if p_decision = 'approve' then
    next_status := 'published';
  elsif p_decision = 'manual_review' then
    next_status := 'manual_review';
  else
    raise exception 'invalid_review_decision' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.comments c where c.id = p_comment_id and c.status = 'ai_reviewing'
  ) then
    raise exception 'comment_not_reviewing' using errcode = 'P0001';
  end if;

  insert into public.comment_reviews (
    comment_id, provider, model, decision, reason_codes, policy_version,
    request_id_hash, duration_ms, result_type
  ) values (
    p_comment_id, p_provider, p_model, p_decision, p_reason_codes, p_policy_version,
    p_request_id_hash, p_duration_ms, p_result_type
  );

  update public.comments
  set status = next_status,
      published_at = case when next_status = 'published' then now() else null end
  where comments.id = p_comment_id and comments.status = 'ai_reviewing';

  return query select p_comment_id, next_status;
end;
$$;

create or replace function public.moderate_comment_atomically(
  p_comment_id uuid,
  p_action text,
  p_next_status text,
  p_actor_id uuid,
  p_actor_github_id bigint,
  p_reason_code text,
  p_reason_note text
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  select c.status into current_status from public.comments c where c.id = p_comment_id for update;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0001';
  end if;

  if (p_action = 'approve' and not (current_status = 'manual_review' and p_next_status = 'published'))
     or (p_action = 'reject' and not (current_status = 'manual_review' and p_next_status = 'rejected'))
     or (p_action = 'delete' and not (current_status <> 'deleted' and p_next_status = 'deleted'))
     or p_action not in ('approve','reject','delete') then
    raise exception 'invalid_moderation_transition' using errcode = 'P0001';
  end if;

  update public.comments
  set status = p_next_status,
      body = case when p_next_status = 'deleted' then null else body end,
      published_at = case when p_next_status = 'published' then now() else published_at end
  where comments.id = p_comment_id;

  insert into public.comment_moderation_actions (
    comment_id, actor_id, actor_github_id, action, reason_code, reason_note
  ) values (
    p_comment_id, p_actor_id, p_actor_github_id, p_action, p_reason_code, p_reason_note
  );

  return query select p_comment_id, p_next_status;
end;
$$;

create or replace function public.delete_own_comment_atomically(
  p_comment_id uuid,
  p_author_id uuid
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.comments
  set status = 'deleted', body = null
  where comments.id = p_comment_id
    and comments.author_id = p_author_id
    and comments.status <> 'deleted';
  if not found then
    raise exception 'comment_not_found_or_owned' using errcode = 'P0001';
  end if;

  insert into public.comment_moderation_actions (
    comment_id, actor_id, actor_github_id, action, reason_code
  ) values (
    p_comment_id, p_author_id, null, 'author_delete', 'author_request'
  );

  return query select p_comment_id, 'deleted'::text;
end;
$$;

create or replace function public.cleanup_expired_comment_content(now_value timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
  stalled_count integer := 0;
  audit_count integer := 0;
begin
  update public.comments
  set status = 'manual_review', updated_at = now_value
  where status = 'ai_reviewing' and updated_at < now_value - interval '10 minutes';
  get diagnostics stalled_count = row_count;

  insert into public.comment_moderation_actions (
    comment_id, actor_id, actor_github_id, action, reason_code, reason_note, created_at
  )
  select id, null, null, 'retention_delete', 'retention_expired', null, now_value
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

  return expired_count + stalled_count + audit_count;
end;
$$;

revoke all on function public.create_pending_comment(text,text,uuid,uuid,bigint,text,text,text,text) from public, anon, authenticated;
revoke all on function public.finalize_comment_review(uuid,text,text,text,text[],text,text,integer,text) from public, anon, authenticated;
revoke all on function public.moderate_comment_atomically(uuid,text,text,uuid,bigint,text,text) from public, anon, authenticated;
revoke all on function public.delete_own_comment_atomically(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cleanup_expired_comment_content(timestamptz) from public, anon, authenticated;

grant execute on function public.create_pending_comment(text,text,uuid,uuid,bigint,text,text,text,text) to service_role;
grant execute on function public.finalize_comment_review(uuid,text,text,text,text[],text,text,integer,text) to service_role;
grant execute on function public.moderate_comment_atomically(uuid,text,text,uuid,bigint,text,text) to service_role;
grant execute on function public.delete_own_comment_atomically(uuid,uuid) to service_role;
grant execute on function public.cleanup_expired_comment_content(timestamptz) to service_role;
