-- Additive migration; existing reminders and subscription ownership remain intact.
create or replace function public.valid_motivation_slots(slots jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb; times text[] := '{}';
begin
 if jsonb_typeof(slots) is distinct from 'array' or octet_length(slots::text)>4096 then return false; end if;
 if jsonb_array_length(slots)>3 then return false; end if;
 for item in select value from jsonb_array_elements(slots) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'time') is distinct from 'string' or jsonb_typeof(item->'message') is distinct from 'string' then return false; end if;
  if (item->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or item->>'time'=any(times) or char_length(item->>'message')>160 or (item->>'message') ~ '[[:cntrl:]]' then return false; end if;
  times := array_append(times,item->>'time');
 end loop;
 return true;
end;$$;
revoke all on function public.valid_motivation_slots(jsonb) from public,anon;
grant execute on function public.valid_motivation_slots(jsonb) to authenticated,service_role;
alter table public.push_subscriptions
 add column motivation_enabled boolean not null default false,
 add column motivation_name text not null default '' check(char_length(motivation_name)<=30 and motivation_name !~ '[[:cntrl:]]'),
 add column motivation_slots jsonb not null default '[]' check(public.valid_motivation_slots(motivation_slots)),
 add constraint motivation_schedule_required check(not motivation_enabled or jsonb_array_length(motivation_slots)>0);
alter table public.push_jobs drop constraint push_jobs_kind_check;
alter table public.push_jobs add constraint push_jobs_kind_check check(kind in ('rest','daily','motivation'));
alter table public.push_jobs add column notification_context jsonb not null default '{}' check(jsonb_typeof(notification_context)='object' and octet_length(notification_context::text)<=2048);
create or replace function public.claim_push_jobs() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; local_now timestamp := now() at time zone 'America/Sao_Paulo';
begin
 insert into public.push_jobs(user_id,subscription_id,tag,kind,due_at,expires_at)
 select s.user_id,s.id,'daily-'||local_now::date::text,'daily',now(),now()+interval '10 minutes'
 from public.push_subscriptions s join public.app_owners o on o.user_id=s.user_id
 where s.enabled and s.daily_enabled and local_now >= local_now::date+s.daily_time and local_now < local_now::date+s.daily_time+interval '10 minutes'
 on conflict(subscription_id,tag) do nothing;
 insert into public.push_jobs(user_id,subscription_id,tag,kind,due_at,expires_at,notification_context)
 select s.user_id,s.id,'motivation-'||local_now::date::text||'-'||(slot.value->>'time'),'motivation',now(),now()+interval '10 minutes',
 jsonb_build_object('name',s.motivation_name,'message',slot.value->>'message','day',extract(day from local_now)::int,'slot',(slot.ordinality-1)::int,'time',slot.value->>'time')
 from public.push_subscriptions s join public.app_owners o on o.user_id=s.user_id
 cross join lateral jsonb_array_elements(s.motivation_slots) with ordinality as slot(value,ordinality)
 where s.enabled and s.motivation_enabled and local_now >= local_now::date+(slot.value->>'time')::time and local_now < local_now::date+(slot.value->>'time')::time+interval '10 minutes'
 on conflict(subscription_id,tag) do nothing;
 with jobs as (
  select j.id from public.push_jobs j join public.push_subscriptions s on s.id=j.subscription_id join public.app_owners o on o.user_id=j.user_id
  where j.delivered_at is null and j.due_at<=now() and j.expires_at>now() and (j.lease_until is null or j.lease_until<now()) and j.attempts<4 and s.enabled
  and ((j.kind='daily' and s.daily_enabled) or (j.kind='rest' and s.rest_enabled) or (j.kind='motivation' and s.motivation_enabled and exists(select 1 from jsonb_array_elements(s.motivation_slots) v where v->>'time'=j.notification_context->>'time')))
  order by j.due_at for update of j skip locked limit 50
 ), claimed as (update public.push_jobs j set attempts=attempts+1,lease_until=now()+interval '90 seconds' from jobs where j.id=jobs.id returning j.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('subscription',s.subscription)),'[]') into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 delete from public.push_jobs where expires_at<now()-interval '2 days';
 return result;
end;$$;
revoke all on function public.claim_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_push_jobs() to service_role;
