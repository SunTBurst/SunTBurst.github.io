create or replace function public.cms_save_settings(p_settings jsonb, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; saved public.cms_settings;
declare allowed_keys text[] := array['title','subtitle','author','avatar','about','announcement','defaultPalette','defaultLayout'];
begin
  actor := public.cms_require_role(array['owner','admin']);
  if p_settings is null or jsonb_typeof(p_settings)<>'object' or exists(select 1 from jsonb_object_keys(p_settings) key where not key=any(allowed_keys)) then raise exception 'invalid_settings' using errcode='22023'; end if;
  perform public.cms_validate_settings(p_settings);
  perform 1 from public.cms_media m where m.id in (
    select media_id from public.cms_settings_media
    union
    select distinct (match)[1]::uuid from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
      '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
  ) order by m.id for update;
  if exists (
    with requested as (
      select distinct (match)[1]::uuid as id from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
        '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
    ) select 1 from requested r left join public.cms_media m on m.id=r.id
    where m.id is null or m.deleting_at is not null
      or not exists(select 1 from storage.objects o where o.bucket_id='cms-media' and o.name=m.object_path)
  ) then raise exception 'invalid_settings_media_reference' using errcode='42501'; end if;
  insert into public.cms_settings(id,value,version,updated_by) values(true,p_settings,1,actor.user_id)
  on conflict(id) do update set value=excluded.value,version=public.cms_settings.version+1,updated_at=now(),updated_by=excluded.updated_by
    where public.cms_settings.version=p_expected_version
  returning * into saved;
  if not found then raise exception 'version_conflict' using errcode='P0001'; end if;
  -- cms_settings is a singleton and this table has no owner column; explicit predicate satisfies API safe-update guards.
  delete from public.cms_settings_media where media_id is not null;
  insert into public.cms_settings_media(media_id)
  select distinct (match)[1]::uuid from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
    '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match;
  insert into public.cms_audit_log(actor_id,action,entity_type,detail) values(actor.user_id,'save','settings',jsonb_build_object('version',saved.version));
  return jsonb_build_object('id',saved.id,'value',saved.value,'version',saved.version,'updated_at',saved.updated_at);
end;
$$;
