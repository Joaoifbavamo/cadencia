create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('cadencia-push-minute','* * * * *', $cron$
 select net.http_post(
   url := 'https://uapidlblgnkaowwffaxu.supabase.co/functions/v1/cadencia-push',
   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cadencia_push_cron')),
   body := '{}'::jsonb,timeout_milliseconds:=15000
 );
$cron$);
