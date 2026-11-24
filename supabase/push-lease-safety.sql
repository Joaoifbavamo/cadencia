-- Apply after motivation.sql, before deploying the push worker.
-- Five sequential provider requests at 10s each fit the 90s lease.
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
  order by j.due_at for update of j skip locked limit 5
 ), claimed as (update public.push_jobs j set attempts=attempts+1,lease_until=now()+interval '90 seconds' from jobs where j.id=jobs.id returning j.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('subscription',s.subscription)),'[]') into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 delete from public.push_jobs where expires_at<now()-interval '2 days';
 return result;
end;$$;
revoke all on function public.claim_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_push_jobs() to service_role;

-- Read current preferences immediately before sending; a cancelled/deleted job,
-- revoked owner, disabled device, expired job or different claim cannot send.
create or replace function public.authorize_push_job(
  job_id uuid, claim_attempt integer, claim_lease timestamptz
) returns jsonb language sql security invoker set search_path='' as $$
  select s.subscription
  from public.push_jobs j
  join public.push_subscriptions s on s.id = j.subscription_id
  join public.app_owners o on o.user_id = j.user_id
  where j.id = job_id
    and j.attempts = claim_attempt and j.lease_until = claim_lease
    and j.lease_until > clock_timestamp() + interval '15 seconds'
    and j.expires_at > clock_timestamp() and j.delivered_at is null
    and s.enabled and s.user_id = j.user_id
    and (
      (j.kind = 'rest' and s.rest_enabled)
      or (j.kind = 'daily' and s.daily_enabled)
      or (j.kind = 'motivation' and s.motivation_enabled and exists (
        select 1 from jsonb_array_elements(s.motivation_slots) slot
        where slot->>'time' = j.notification_context->>'time'
      ))
    );
$$;

-- Attempts + exact lease timestamp fence old workers after reclaims. Lock the
-- job while settling so a competing claim cannot acquire it during completion.
-- The subscription snapshot also protects a reconnected device from a stale 410.
create or replace function public.settle_push_job(
  job_id uuid, claim_attempt integer, claim_lease timestamptz,
  outcome text, sent_subscription jsonb
) returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed public.push_jobs%rowtype;
begin
  if outcome not in ('delivered', 'gone') or outcome is null then return false; end if;
  select j.* into claimed from public.push_jobs j
  where j.id = job_id and j.attempts = claim_attempt
    and j.lease_until = claim_lease and j.lease_until > clock_timestamp()
    and j.expires_at > clock_timestamp() and j.delivered_at is null
  for update;
  if not found then return false; end if;
  if claimed.lease_until <= clock_timestamp() or claimed.expires_at <= clock_timestamp() then
    return false;
  end if;
  if outcome = 'delivered' then
    update public.push_jobs set delivered_at = clock_timestamp()
    where id = claimed.id;
  else
    update public.push_subscriptions set enabled = false
    where id = claimed.subscription_id and subscription = sent_subscription;
  end if;
  return true;
end;
$$;

revoke all on function public.authorize_push_job(uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.settle_push_job(uuid, integer, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.authorize_push_job(uuid, integer, timestamptz) to service_role;
grant execute on function public.settle_push_job(uuid, integer, timestamptz, text, jsonb) to service_role;

