create table public.app_owners(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_owners enable row level security;
create policy own_membership on public.app_owners for select to authenticated using (user_id=(select auth.uid()));
grant select on public.app_owners to authenticated;
revoke all on public.app_owners from anon;

create sequence public.document_change_seq;
create table public.documents (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('plan','session','set','activity','profile','summary')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<1000000),
 version integer not null default 1 check(version>0), change_seq bigint not null default nextval('public.document_change_seq'),
 updated_at timestamptz not null default now(), deleted boolean not null default false
);
create index documents_owner_seq on public.documents(user_id,change_seq);
alter table public.documents enable row level security;
create policy owner_read on public.documents for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
create policy owner_insert on public.documents for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
create policy owner_update on public.documents for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
grant select,insert,update on public.documents to authenticated;
grant usage on sequence public.document_change_seq to authenticated;
revoke all on public.documents from anon;

create table public.mutation_receipts(user_id uuid not null references auth.users(id) on delete cascade, mutation_id uuid not null, response jsonb not null, created_at timestamptz not null default now(),primary key(user_id,mutation_id));
alter table public.mutation_receipts enable row level security;
create policy receipt_read on public.mutation_receipts for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
create policy receipt_insert on public.mutation_receipts for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
grant select,insert on public.mutation_receipts to authenticated;
revoke all on public.mutation_receipts from anon;

create function public.commit_document(p_id uuid,p_kind text,p_payload jsonb,p_expected integer,p_mutation uuid,p_deleted boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_doc public.documents; response jsonb; owner_id uuid := auth.uid();
begin
 if owner_id is null or not exists(select 1 from public.app_owners where user_id=owner_id) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 -- Per-owner lock keeps change_seq in commit order and serializes duplicate retries.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
 select r.response into response from public.mutation_receipts r where r.user_id=owner_id and r.mutation_id=p_mutation;
 if found then return response;end if;
 select * into current_doc from public.documents where id=p_id and user_id=owner_id for update;
 if (not found and p_expected<>0) or (found and current_doc.version<>p_expected) then
   return jsonb_build_object('ok',false,'remote',case when current_doc.id is null then null else to_jsonb(current_doc) end);
 end if;
 if current_doc.id is null then
  insert into public.documents(id,user_id,kind,payload,deleted) values(p_id,owner_id,p_kind,p_payload,p_deleted) returning * into current_doc;
 else
  if current_doc.kind<>p_kind then raise exception 'Tipo imutável';end if;
  update public.documents set payload=p_payload,deleted=p_deleted,version=version+1,change_seq=nextval('public.document_change_seq'),updated_at=now() where id=p_id and user_id=owner_id returning * into current_doc;
 end if;
 response:=jsonb_build_object('ok',true,'document',to_jsonb(current_doc));
 insert into public.mutation_receipts(user_id,mutation_id,response) values(owner_id,p_mutation,response);
 return response;
end;$$;
revoke all on function public.commit_document(uuid,text,jsonb,integer,uuid,boolean) from public,anon;
grant execute on function public.commit_document(uuid,text,jsonb,integer,uuid,boolean) to authenticated;
alter publication supabase_realtime add table public.documents;
