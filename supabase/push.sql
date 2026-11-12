create table public.push_subscriptions(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null check(octet_length(subscription::text)<5000),
 daily_enabled boolean not null default false,daily_time time not null default '20:00',
 rest_enabled boolean not null default true,enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_owner on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.app_owners where user_id=(select auth.uid())));
grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
revoke all on public.push_subscriptions from anon;
create index push_owner_idx on public.push_subscriptions(user_id);
create table public.push_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 tag text not null,kind text not null check(kind in ('rest','daily')),due_at timestamptz not null,
 expires_at timestamptz not null,delivered_at timestamptz,lease_until timestamptz,attempts integer not null default 0,
 unique(subscription_id,tag)
);
alter table public.push_jobs enable row level security;
create policy jobs_read on public.push_jobs for select to authenticated using(user_id=(select auth.uid()));
create policy jobs_insert on public.push_jobs for insert to authenticated with check(kind='rest' and user_id=(select auth.uid()) and due_at between now()-interval '5 minutes' and now()+interval '11 minutes' and expires_at<=due_at+interval '6 minutes' and exists(select 1 from public.push_subscriptions s where s.id=subscription_id and s.user_id=(select auth.uid())));
create policy jobs_delete on public.push_jobs for delete to authenticated using(user_id=(select auth.uid()) and kind='rest');
grant select,insert,delete on public.push_jobs to authenticated;
grant all on public.push_jobs to service_role;
revoke all on public.push_jobs from anon;
create index jobs_due_idx on public.push_jobs(due_at) where delivered_at is null;
create index jobs_user_idx on public.push_jobs(user_id);

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create function private.cadencia_push_config() returns jsonb language sql security definer set search_path='' as $$
select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets where name in ('cadencia_vapid_public','cadencia_vapid_private','cadencia_push_cron');
$$;
revoke all on function private.cadencia_push_config() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.cadencia_push_config() to service_role;
create function public.push_server_config() returns jsonb language sql security invoker set search_path='' as $$ select private.cadencia_push_config(); $$;
revoke all on function public.push_server_config() from public,anon,authenticated;
grant execute on function public.push_server_config() to service_role;



create function public.claim_push_jobs() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.push_jobs(user_id,subscription_id,tag,kind,due_at,expires_at)
 select s.user_id,s.id,'daily-'||((now() at time zone 'America/Sao_Paulo')::date)::text,'daily',now(),now()+interval '10 minutes'
 from public.push_subscriptions s join public.app_owners o on o.user_id=s.user_id
 where s.enabled and s.daily_enabled and (now() at time zone 'America/Sao_Paulo')::time>=s.daily_time and (now() at time zone 'America/Sao_Paulo')::time<s.daily_time+interval '10 minutes'
 on conflict(subscription_id,tag) do nothing;
 with jobs as (select j.id from public.push_jobs j join public.push_subscriptions s on s.id=j.subscription_id join public.app_owners o on o.user_id=j.user_id where j.delivered_at is null and j.due_at<=now() and j.expires_at>now() and (j.lease_until is null or j.lease_until<now()) and j.attempts<4 and s.enabled and (j.kind='daily' or s.rest_enabled) order by j.due_at for update of j skip locked limit 50),
 claimed as (update public.push_jobs j set attempts=attempts+1,lease_until=now()+interval '90 seconds' from jobs where j.id=jobs.id returning j.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('subscription',s.subscription)),'[]') into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 delete from public.push_jobs where expires_at<now()-interval '2 days';
 return result;
end;$$;
revoke all on function public.claim_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_push_jobs() to service_role;
