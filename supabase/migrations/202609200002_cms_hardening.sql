create or replace function public.cms_sync_comment_target(p_document public.cms_documents, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare path_prefix text; v_target_path text;
begin
  path_prefix := case p_document.kind when 'post' then '/posts/' when 'talk' then '/talk/' when 'knowledge' then '/knowledge/' when 'project' then '/projects/' end;
  v_target_path := path_prefix || public.cms_encode_path_segment(p_document.slug) || '/';
  insert into public.comment_targets(target_kind,target_path,title,summary,active,updated_at)
  values(p_document.kind,v_target_path,left(p_document.title,160),left(coalesce(nullif(p_document.summary,''),p_document.title),500),p_active,now())
  on conflict(target_kind,target_path) do update set title=excluded.title,summary=excluded.summary,active=excluded.active,updated_at=now();
end;
$$;

revoke all on function public.cms_sync_comment_target(public.cms_documents,boolean) from public, anon, authenticated;
