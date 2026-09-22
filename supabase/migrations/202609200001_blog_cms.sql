create extension if not exists pgcrypto;

create table public.cms_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_id text not null unique check (char_length(github_id) between 1 and 128),
  login text not null check (char_length(login) between 1 and 39),
  display_name text not null default '' check (char_length(display_name) <= 160),
  role text not null default 'member' check (role in ('owner', 'admin', 'editor', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post', 'talk', 'knowledge', 'project')),
  slug text not null check (char_length(slug) between 1 and 160),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null default '' check (char_length(summary) <= 1000),
  body text not null default '' check (char_length(body) <= 200000),
  tags text[] not null default '{}' check (cardinality(tags) <= 30),
  category text not null default '' check (char_length(category) <= 120),
  image text not null default '' check (char_length(image) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'draft' check (status in ('draft', 'published', 'trash')),
  version integer not null default 1 check (version > 0),
  author_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create table public.cms_publications (
  id uuid primary key references public.cms_documents(id) on delete cascade,
  kind text not null check (kind in ('post', 'talk', 'knowledge', 'project')),
  slug text not null,
  title text not null,
  summary text not null,
  body text not null,
  tags text[] not null default '{}',
  category text not null default '',
  image text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null check (visibility = 'public'),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_name text not null,
  unique (kind, slug)
);

create table public.cms_public_routes (
  kind text not null check (kind in ('post', 'talk', 'knowledge', 'project')),
  slug text not null,
  document_id uuid not null references public.cms_documents(id) on delete restrict,
  is_published boolean not null default false,
  first_published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, slug),
  unique (document_id)
);

create table public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.cms_settings (
  id boolean primary key default true check (id),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.cms_media (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  object_path text not null unique,
  name text not null check (char_length(name) between 1 and 240),
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  size bigint not null check (size > 0 and size <= 10485760),
  created_at timestamptz not null default now()
);

create table public.cms_publication_media (
  document_id uuid not null references public.cms_publications(id) on delete cascade,
  media_id uuid not null references public.cms_media(id) on delete restrict,
  primary key (document_id, media_id)
);

create table public.cms_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

insert into public.cms_settings (id, value, version) values (true, '{}'::jsonb, 1)
on conflict (id) do nothing;

create index cms_documents_author_updated_idx on public.cms_documents (author_id, updated_at desc);
create index cms_documents_status_updated_idx on public.cms_documents (status, updated_at desc);
create index cms_publications_kind_updated_idx on public.cms_publications (kind, updated_at desc);
create index cms_revisions_document_created_idx on public.cms_revisions (document_id, created_at desc);
create index cms_media_owner_created_idx on public.cms_media (owner_id, created_at desc);

create or replace function public.cms_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger cms_profiles_set_updated_at before update on public.cms_profiles for each row execute function public.cms_set_updated_at();
create trigger cms_documents_set_updated_at before update on public.cms_documents for each row execute function public.cms_set_updated_at();
create trigger cms_routes_set_updated_at before update on public.cms_public_routes for each row execute function public.cms_set_updated_at();

create or replace function public.cms_current_github_identity()
returns table (github_id text, login text, display_name text)
language plpgsql security definer set search_path = auth, public as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query
  select coalesce(i.provider_id, i.identity_data ->> 'sub', i.identity_data ->> 'id'),
         coalesce(i.identity_data ->> 'user_name', i.identity_data ->> 'login'),
         coalesce(i.identity_data ->> 'name', i.identity_data ->> 'user_name', i.identity_data ->> 'login', '')
  from auth.identities i
  where i.user_id = current_user_id and i.provider = 'github'
  limit 1;
  if not found then raise exception 'github_identity_required' using errcode = '42501'; end if;
end;
$$;

create or replace function public.cms_is_active_role(p_roles text[])
returns boolean language sql security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.cms_profiles p join auth.identities i on i.user_id=p.user_id and i.provider='github'
    where p.user_id = auth.uid() and p.active and p.role = any(p_roles)
      and p.github_id = coalesce(i.provider_id, i.identity_data ->> 'sub', i.identity_data ->> 'id')
  );
$$;

create or replace function public.cms_require_role(p_roles text[])
returns public.cms_profiles language plpgsql security definer set search_path = public, auth as $$
declare profile public.cms_profiles;
begin
  select p.* into profile from public.cms_profiles p where p.user_id = auth.uid() and p.active and p.role = any(p_roles)
    and exists (select 1 from auth.identities i where i.user_id=p.user_id and i.provider='github'
      and p.github_id=coalesce(i.provider_id, i.identity_data ->> 'sub', i.identity_data ->> 'id'));
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  return profile;
end;
$$;

create or replace function public.cms_validate_slug(p_slug text)
returns void language plpgsql immutable set search_path = public as $$
begin
  if p_slug is null or char_length(p_slug) not between 1 and 160
     or p_slug in ('.', '..') or p_slug ~ '[[:space:]/\\?#%[:cntrl:]]' then
    raise exception 'invalid_slug' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.cms_validate_document_fields(p_document jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare image_value text := coalesce(p_document ->> 'image', ''); metadata_value jsonb := coalesce(p_document -> 'metadata','{}'::jsonb);
begin
  if coalesce(p_document ->> 'kind','') not in ('post','talk','knowledge','project')
     or char_length(coalesce(p_document ->> 'title','')) not between 1 and 240
     or char_length(coalesce(p_document ->> 'summary','')) > 1000
     or char_length(coalesce(p_document ->> 'body','')) > 200000
     or char_length(coalesce(p_document ->> 'category','')) > 120
     or jsonb_typeof(metadata_value) <> 'object'
     or metadata_value::text ~* 'javascript:'
     or (image_value <> '' and image_value !~ '^/media/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' and image_value !~ '^/images/[^?#[:space:]]{1,490}$' and image_value !~ '^https?://[^[:space:]]{1,490}$')
     or (p_document ? 'tags' and (jsonb_typeof(p_document -> 'tags') <> 'array' or jsonb_array_length(p_document -> 'tags') > 30
       or exists(select 1 from jsonb_array_elements_text(p_document -> 'tags') tag where char_length(tag) not between 1 and 80))) then
    raise exception 'invalid_document_fields' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.cms_validate_settings(p_settings jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare key text; value text;
begin
  foreach key in array array['title','subtitle','author','avatar','about','announcement','defaultPalette','defaultLayout'] loop
    if p_settings ? key then
      if jsonb_typeof(p_settings -> key) <> 'string' then raise exception 'invalid_settings' using errcode='22023'; end if;
      value := p_settings ->> key;
      if (key in ('title','subtitle','author','avatar','announcement') and char_length(value) > 500)
         or (key='about' and char_length(value) > 20000)
         or (key in ('defaultPalette','defaultLayout') and value !~ '^[A-Za-z0-9_-]{0,80}$')
         or (key='avatar' and value <> '' and value !~ '^/media/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' and value !~ '^/images/[^?#[:space:]]{1,490}$' and value !~ '^https://[^[:space:]]{1,490}$') then
        raise exception 'invalid_settings' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.cms_document_snapshot(p_document public.cms_documents)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', p_document.id, 'kind', p_document.kind, 'slug', p_document.slug,
    'title', p_document.title, 'summary', p_document.summary, 'body', p_document.body,
    'tags', p_document.tags, 'category', p_document.category, 'image', p_document.image,
    'metadata', p_document.metadata, 'visibility', p_document.visibility,
    'status', p_document.status, 'version', p_document.version,
    'author_id', p_document.author_id, 'created_at', p_document.created_at,
    'updated_at', p_document.updated_at
  );
$$;

create or replace function public.cms_write_revision(p_document public.cms_documents)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cms_revisions (document_id, version, snapshot)
  values (p_document.id, p_document.version, public.cms_document_snapshot(p_document));
end;
$$;

create or replace function public.cms_bootstrap_profile()
returns jsonb language plpgsql security definer set search_path = auth, public as $$
declare identity_row record; existing public.cms_profiles; result public.cms_profiles;
begin
  select * into identity_row from public.cms_current_github_identity();
  if identity_row.github_id is null or identity_row.login is null or char_length(identity_row.login) = 0 then
    raise exception 'github_identity_invalid' using errcode = '42501';
  end if;
  select * into existing from public.cms_profiles where user_id = auth.uid();
  if found and existing.github_id <> identity_row.github_id then raise exception 'github_identity_changed' using errcode = '42501'; end if;
  insert into public.cms_profiles (user_id, github_id, login, display_name, role)
  values (auth.uid(), identity_row.github_id, identity_row.login, identity_row.display_name,
          case when identity_row.github_id = '105589585' then 'owner' else 'member' end)
  on conflict (user_id) do update set login = excluded.login, display_name = excluded.display_name
  returning * into result;
  return jsonb_build_object('user_id', result.user_id, 'github_id', result.github_id, 'login', result.login,
    'display_name', result.display_name, 'role', result.role, 'active', result.active,
    'created_at', result.created_at, 'updated_at', result.updated_at);
end;
$$;

create or replace function public.cms_save_document(p_document jsonb, p_expected_version integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor public.cms_profiles; current_row public.cms_documents; saved public.cms_documents; raw_id uuid;
declare allowed_keys text[] := array['id','kind','slug','title','summary','body','tags','category','image','metadata','visibility','status'];
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  if p_document is null or jsonb_typeof(p_document) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_document) key where not key = any(allowed_keys)) then
    raise exception 'invalid_document' using errcode = '22023';
  end if;
  perform public.cms_validate_document_fields(p_document);
  if coalesce(p_document ->> 'id', '') <> '' then
    begin raw_id := (p_document ->> 'id')::uuid; exception when invalid_text_representation then raise exception 'invalid_document_id' using errcode = '22023'; end;
  end if;
  if raw_id is null then
    if p_expected_version is not null or coalesce(p_document ->> 'status', 'draft') <> 'draft' then raise exception 'invalid_document_create' using errcode = '22023'; end if;
    perform public.cms_validate_slug(p_document ->> 'slug');
    insert into public.cms_documents (kind,slug,title,summary,body,tags,category,image,metadata,visibility,status,author_id)
    values (p_document ->> 'kind', p_document ->> 'slug', p_document ->> 'title', coalesce(p_document ->> 'summary',''),
      coalesce(p_document ->> 'body',''), coalesce(array(select jsonb_array_elements_text(coalesce(p_document -> 'tags','[]'::jsonb))), '{}'::text[]),
      coalesce(p_document ->> 'category',''), coalesce(p_document ->> 'image',''), coalesce(p_document -> 'metadata','{}'::jsonb),
      coalesce(p_document ->> 'visibility','public'), 'draft', actor.user_id)
    returning * into saved;
  else
    select * into current_row from public.cms_documents where id = raw_id for update;
    if not found then raise exception 'document_not_found' using errcode = 'P0001'; end if;
    if current_row.status = 'trash' then raise exception 'document_is_trashed' using errcode = '42501'; end if;
    if actor.role = 'editor' and current_row.author_id <> actor.user_id then raise exception 'forbidden' using errcode = '42501'; end if;
    if p_expected_version is null or p_expected_version <> current_row.version then raise exception 'version_conflict' using errcode = 'P0001'; end if;
    if p_document ->> 'slug' is distinct from current_row.slug
       or p_document ->> 'kind' is distinct from current_row.kind then
      if exists (select 1 from public.cms_public_routes where document_id = current_row.id) then raise exception 'published_slug_immutable' using errcode = '22023'; end if;
      perform public.cms_validate_slug(p_document ->> 'slug');
    end if;
    update public.cms_documents set
      kind = p_document ->> 'kind', slug = p_document ->> 'slug', title = p_document ->> 'title',
      summary = coalesce(p_document ->> 'summary',''), body = coalesce(p_document ->> 'body',''),
      tags = coalesce(array(select jsonb_array_elements_text(coalesce(p_document -> 'tags','[]'::jsonb))), '{}'::text[]),
      category = coalesce(p_document ->> 'category',''), image = coalesce(p_document ->> 'image',''),
      metadata = coalesce(p_document -> 'metadata','{}'::jsonb), visibility = coalesce(p_document ->> 'visibility','public'),
      status = case when current_row.status = 'published' then 'published' else 'draft' end, version = version + 1
    where id = current_row.id returning * into saved;
  end if;
  perform public.cms_write_revision(saved);
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id,detail)
  values (actor.user_id,'save','document',saved.id,jsonb_build_object('version',saved.version));
  return public.cms_document_snapshot(saved);
end;
$$;

create or replace function public.cms_sync_publication_media(p_publication_id uuid, p_body text, p_image text, p_actor public.cms_profiles)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (
    with requested as (
      select distinct (match)[1]::uuid as id
      from regexp_matches(coalesce(p_body,'') || E'\n' || coalesce(p_image,''),
        '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})', 'g') as match
    )
    select 1 from requested r left join public.cms_media m on m.id=r.id
    where m.id is null or (p_actor.role='editor' and m.owner_id <> p_actor.user_id)
  ) then raise exception 'invalid_public_media_reference' using errcode='42501'; end if;
  perform 1 from public.cms_media m
  where p_body like '%/media/' || m.id::text || '%' or p_image = '/media/' || m.id::text
  for update;
  delete from public.cms_publication_media where document_id = p_publication_id;
  insert into public.cms_publication_media(document_id, media_id)
  select p_publication_id, m.id from public.cms_media m
  where p_body like '%/media/' || m.id::text || '%' or p_image = '/media/' || m.id::text;
end;
$$;

create or replace function public.cms_media_object_is_public(p_object_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cms_media m
    join public.cms_publication_media pm on pm.media_id = m.id
    where m.object_path = p_object_path
  );
$$;

create or replace function public.cms_public_media(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('object_path', m.object_path, 'mime', m.mime, 'name', m.name)
  from public.cms_media m
  where m.id = p_id
    and exists (select 1 from public.cms_publication_media pm where pm.media_id = m.id)
  limit 1;
$$;

create or replace function public.cms_encode_path_segment(p_value text)
returns text language plpgsql immutable set search_path = public as $$
declare i integer; b integer; output text := '';
begin
  for i in 0..octet_length(convert_to(p_value, 'UTF8')) - 1 loop
    b := get_byte(convert_to(p_value, 'UTF8'), i);
    if (b between 48 and 57) or (b between 65 and 90) or (b between 97 and 122)
       or b in (45, 46, 95, 126) then output := output || chr(b);
    else output := output || '%' || upper(lpad(to_hex(b), 2, '0'));
    end if;
  end loop;
  return output;
end;
$$;

create or replace function public.cms_sync_comment_target(p_document public.cms_documents, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare path_prefix text; target_path text;
begin
  path_prefix := case p_document.kind when 'post' then '/posts/' when 'talk' then '/talk/' when 'knowledge' then '/knowledge/' when 'project' then '/projects/' end;
  target_path := path_prefix || public.cms_encode_path_segment(p_document.slug) || '/';
  insert into public.comment_targets(target_kind,target_path,title,summary,active,updated_at)
  values(p_document.kind,target_path,left(p_document.title,160),left(coalesce(nullif(p_document.summary,''),p_document.title),500),p_active,now())
  on conflict(target_kind,target_path) do update set title=excluded.title,summary=excluded.summary,active=excluded.active,updated_at=now();
end;
$$;

create or replace function public.cms_document_action(p_id uuid, p_action text, p_expected_version integer, p_revision_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor public.cms_profiles; current_row public.cms_documents; saved public.cms_documents; restore_snapshot jsonb; author_label text; publication_id uuid;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into current_row from public.cms_documents where id = p_id for update;
  if not found then raise exception 'document_not_found' using errcode = 'P0001'; end if;
  if actor.role = 'editor' and current_row.author_id <> actor.user_id then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_expected_version is null or p_expected_version <> current_row.version then raise exception 'version_conflict' using errcode = 'P0001'; end if;
  if p_action = 'restore_revision' then
    select snapshot into restore_snapshot from public.cms_revisions where id = p_revision_id and document_id = p_id;
    if not found then raise exception 'revision_not_found' using errcode = 'P0001'; end if;
    update public.cms_documents set title = restore_snapshot ->> 'title', summary = coalesce(restore_snapshot ->> 'summary',''),
      body = coalesce(restore_snapshot ->> 'body',''), tags = coalesce(array(select jsonb_array_elements_text(coalesce(restore_snapshot -> 'tags','[]'::jsonb))), '{}'::text[]),
      category = coalesce(restore_snapshot ->> 'category',''), image = coalesce(restore_snapshot ->> 'image',''),
      metadata = coalesce(restore_snapshot -> 'metadata','{}'::jsonb), visibility = coalesce(restore_snapshot ->> 'visibility','public'),
      status = case when current_row.status='published' then 'published' else 'draft' end, version = version + 1 where id = p_id returning * into saved;
  elsif p_action in ('publish','unpublish','trash','restore') then
    update public.cms_documents set status = case p_action when 'publish' then 'published' when 'restore' then 'draft' when 'unpublish' then 'draft' else p_action end,
      version = version + 1 where id = p_id returning * into saved;
  else
    raise exception 'invalid_document_action' using errcode = '22023';
  end if;
  if p_action = 'publish' then
    if saved.visibility = 'public' then
      select case when display_name <> '' then display_name else login end into author_label from public.cms_profiles where user_id = saved.author_id;
      insert into public.cms_publications(id,kind,slug,title,summary,body,tags,category,image,metadata,visibility,published_at,updated_at,author_name)
      values(saved.id,saved.kind,saved.slug,saved.title,saved.summary,saved.body,saved.tags,saved.category,saved.image,saved.metadata,'public',now(),now(),coalesce(author_label,''))
      on conflict(id) do update set kind=excluded.kind,slug=excluded.slug,title=excluded.title,summary=excluded.summary,body=excluded.body,
        tags=excluded.tags,category=excluded.category,image=excluded.image,metadata=excluded.metadata,visibility='public',published_at=now(),updated_at=now(),author_name=excluded.author_name
      returning id into publication_id;
      insert into public.cms_public_routes(kind,slug,document_id,is_published) values(saved.kind,saved.slug,saved.id,true)
      on conflict(kind,slug) do update set is_published=true, document_id=excluded.document_id;
      perform public.cms_sync_publication_media(publication_id,saved.body,saved.image,actor);
      perform public.cms_sync_comment_target(saved, true);
    else
      delete from public.cms_publications where id = saved.id;
      update public.cms_public_routes set is_published=false where document_id = saved.id;
      perform public.cms_sync_comment_target(saved, false);
    end if;
  elsif p_action in ('unpublish','trash') then
    delete from public.cms_publications where id = saved.id;
    update public.cms_public_routes set is_published=false where document_id = saved.id;
    perform public.cms_sync_comment_target(saved, false);
  end if;
  perform public.cms_write_revision(saved);
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id,detail) values(actor.user_id,p_action,'document',saved.id,jsonb_build_object('version',saved.version));
  return public.cms_document_snapshot(saved);
end;
$$;

create or replace function public.cms_save_settings(p_settings jsonb, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor public.cms_profiles; saved public.cms_settings;
declare allowed_keys text[] := array['title','subtitle','author','avatar','about','announcement','defaultPalette','defaultLayout'];
begin
  actor := public.cms_require_role(array['owner','admin']);
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or exists(select 1 from jsonb_object_keys(p_settings) key where not key = any(allowed_keys)) then raise exception 'invalid_settings' using errcode = '22023'; end if;
  perform public.cms_validate_settings(p_settings);
  insert into public.cms_settings(id,value,version,updated_by) values(true,p_settings,1,actor.user_id)
  on conflict(id) do update set value=excluded.value, version=public.cms_settings.version+1, updated_at=now(), updated_by=excluded.updated_by
    where public.cms_settings.version = p_expected_version
  returning * into saved;
  if not found then raise exception 'version_conflict' using errcode = 'P0001'; end if;
  insert into public.cms_audit_log(actor_id,action,entity_type,detail) values(actor.user_id,'save','settings',jsonb_build_object('version',saved.version));
  return jsonb_build_object('id',saved.id,'value',saved.value,'version',saved.version,'updated_at',saved.updated_at);
end;
$$;

create or replace function public.cms_set_member_role(p_user_id uuid, p_role text, p_active boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor public.cms_profiles; target public.cms_profiles;
begin
  actor := public.cms_require_role(array['owner','admin']);
  if p_role not in ('admin','editor','member') then raise exception 'invalid_role' using errcode = '22023'; end if;
  select * into target from public.cms_profiles where user_id=p_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0001'; end if;
  if target.role='owner' then raise exception 'owner_protected' using errcode = '42501'; end if;
  if actor.role='admin' and (p_role='admin' or target.role='admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cms_profiles set role=p_role,active=p_active where user_id=p_user_id returning * into target;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id,detail) values(actor.user_id,'set_role','profile',target.user_id,jsonb_build_object('role',target.role,'active',target.active));
  return jsonb_build_object('user_id',target.user_id,'github_id',target.github_id,'login',target.login,'display_name',target.display_name,'role',target.role,'active',target.active);
end;
$$;

create or replace function public.cms_register_media(p_id uuid, p_name text, p_mime text, p_size bigint)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; object_row storage.objects; saved public.cms_media; expected_path text;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  if p_id is null or p_name is null or char_length(p_name) not between 1 and 240 or p_mime not in ('image/png','image/jpeg','image/webp','image/gif') or p_size not between 1 and 10485760 then raise exception 'invalid_media' using errcode='22023'; end if;
  expected_path := actor.user_id::text || '/' || p_id::text;
  select * into object_row from storage.objects where bucket_id='cms-media' and name=expected_path;
  if not found then raise exception 'media_object_missing' using errcode='P0001'; end if;
  if coalesce(object_row.metadata ->> 'mimetype', '') <> p_mime
     or coalesce((object_row.metadata ->> 'size')::bigint, -1) <> p_size then
    raise exception 'media_metadata_mismatch' using errcode='22023';
  end if;
  insert into public.cms_media(id,owner_id,object_path,name,mime,size) values(p_id,actor.user_id,expected_path,p_name,p_mime,p_size) returning * into saved;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id) values(actor.user_id,'register','media',saved.id);
  return jsonb_build_object('id',saved.id,'object_path',saved.object_path,'name',saved.name,'mime',saved.mime,'size',saved.size,'created_at',saved.created_at);
end;
$$;

create or replace function public.cms_delete_media(p_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then raise exception 'media_not_found' using errcode='P0001'; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if exists(select 1 from public.cms_publication_media where media_id=p_id) then raise exception 'media_is_published' using errcode='42501'; end if;
  if exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then
    raise exception 'media_object_still_exists' using errcode='P0001';
  end if;
  delete from public.cms_media where id=p_id;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id) values(actor.user_id,'delete','media',p_id);
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media', 'cms-media', false, 10485760, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

alter table public.cms_profiles enable row level security;
alter table public.cms_documents enable row level security;
alter table public.cms_publications enable row level security;
alter table public.cms_public_routes enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_settings enable row level security;
alter table public.cms_media enable row level security;
alter table public.cms_publication_media enable row level security;
alter table public.cms_audit_log enable row level security;

revoke all on table public.cms_profiles, public.cms_documents, public.cms_publications,
  public.cms_public_routes, public.cms_revisions, public.cms_settings, public.cms_media,
  public.cms_publication_media, public.cms_audit_log from anon, authenticated;
revoke all on function public.cms_set_updated_at(), public.cms_current_github_identity(),
  public.cms_is_active_role(text[]), public.cms_require_role(text[]), public.cms_validate_slug(text), public.cms_validate_document_fields(jsonb), public.cms_validate_settings(jsonb),
  public.cms_document_snapshot(public.cms_documents), public.cms_write_revision(public.cms_documents),
  public.cms_bootstrap_profile(), public.cms_save_document(jsonb,integer),
  public.cms_sync_publication_media(uuid,text,text,public.cms_profiles), public.cms_media_object_is_public(text), public.cms_public_media(uuid),
  public.cms_encode_path_segment(text), public.cms_sync_comment_target(public.cms_documents,boolean),
  public.cms_document_action(uuid,text,integer,uuid), public.cms_save_settings(jsonb,integer),
  public.cms_set_member_role(uuid,text,boolean), public.cms_register_media(uuid,text,text,bigint),
  public.cms_delete_media(uuid) from public, anon, authenticated;

grant select (id,kind,slug,title,summary,body,tags,category,image,metadata,visibility,published_at,updated_at,author_name) on public.cms_publications to anon, authenticated;
grant select (kind,slug,is_published) on public.cms_public_routes to anon, authenticated;
grant select (id,value,version,updated_at) on public.cms_settings to anon;
grant select on public.cms_profiles, public.cms_documents, public.cms_revisions, public.cms_settings, public.cms_media, public.cms_audit_log to authenticated;
grant execute on function public.cms_is_active_role(text[]), public.cms_media_object_is_public(text), public.cms_public_media(uuid) to anon, authenticated;
grant execute on function public.cms_bootstrap_profile(), public.cms_save_document(jsonb,integer), public.cms_document_action(uuid,text,integer,uuid), public.cms_save_settings(jsonb,integer), public.cms_set_member_role(uuid,text,boolean), public.cms_register_media(uuid,text,text,bigint), public.cms_delete_media(uuid) to authenticated;

create policy cms_publications_anon_read on public.cms_publications for select to anon, authenticated using (true);
create policy cms_routes_anon_read on public.cms_public_routes for select to anon, authenticated using (true);
create policy cms_settings_anon_read on public.cms_settings for select to anon using (true);
create policy cms_profiles_own_or_admin on public.cms_profiles for select to authenticated using (user_id=auth.uid() or public.cms_is_active_role(array['owner','admin']));
create policy cms_documents_editor_read on public.cms_documents for select to authenticated using (
  (author_id=auth.uid() and public.cms_is_active_role(array['editor'])) or public.cms_is_active_role(array['owner','admin'])
);
create policy cms_revisions_editor_read on public.cms_revisions for select to authenticated using (
  (public.cms_is_active_role(array['editor']) and exists(select 1 from public.cms_documents d where d.id=document_id and d.author_id=auth.uid()))
  or public.cms_is_active_role(array['owner','admin'])
);
create policy cms_settings_read on public.cms_settings for select to authenticated using (public.cms_is_active_role(array['owner','admin','editor']));
create policy cms_media_editor_read on public.cms_media for select to authenticated using (
  (owner_id=auth.uid() and public.cms_is_active_role(array['editor'])) or public.cms_is_active_role(array['owner','admin'])
);
create policy cms_audit_admin_read on public.cms_audit_log for select to authenticated using (public.cms_is_active_role(array['owner','admin']));

create policy cms_media_storage_read on storage.objects for select to anon, authenticated using (
  bucket_id='cms-media' and (public.cms_media_object_is_public(name)
    or (public.cms_is_active_role(array['editor']) and name like auth.uid()::text || '/%')
    or public.cms_is_active_role(array['owner','admin']))
);
create policy cms_media_storage_upload on storage.objects for insert to authenticated with check (
  bucket_id='cms-media' and name like auth.uid()::text || '/%'
  and public.cms_is_active_role(array['owner','admin','editor'])
);
create policy cms_media_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='cms-media' and not public.cms_media_object_is_public(name)
  and ((public.cms_is_active_role(array['editor']) and name like auth.uid()::text || '/%') or public.cms_is_active_role(array['owner','admin']))
);
