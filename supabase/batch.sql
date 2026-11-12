create function public.commit_batch(p_changes jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; result jsonb; results jsonb:='[]';
begin
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>10000 then raise exception 'Lote inválido';end if;
 for item in select value from jsonb_array_elements(p_changes) loop
  result:=public.commit_document((item->>'p_id')::uuid,item->>'p_kind',item->'p_payload',(item->>'p_expected')::integer,(item->>'p_mutation')::uuid,(item->>'p_deleted')::boolean);
  if not (result->>'ok')::boolean then raise exception 'Lote em conflito. Sincronize e revise a limpeza.' using errcode='40001';end if;
  results:=results||jsonb_build_array(result->'document');
 end loop;
 return results;
end;$$;
revoke all on function public.commit_batch(jsonb) from public,anon;
grant execute on function public.commit_batch(jsonb) to authenticated;
