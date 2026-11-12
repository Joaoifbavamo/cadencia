import {createClient} from 'npm:@supabase/supabase-js@2.89.0';
import * as webpush from 'npm:web-push@4.0.0';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const allowed=new Set(['https://joaoifbavamo.github.io','http://127.0.0.1:5174','http://127.0.0.1:4173']);
let config:Record<string,string>|null=null;
const endpointAllowed=(endpoint:string)=>{try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.port&&(!u.username&&!u.password)&&(u.hostname==='web.push.apple.com'||u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname.endsWith('.notify.windows.com'))}catch{return false}};
async function send(subscription:any,payload:any){if(!endpointAllowed(subscription.endpoint))throw Error('Invalid push destination');const details=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{vapidDetails:{subject:'https://joaoifbavamo.github.io/cadencia/',publicKey:config!.cadencia_vapid_public,privateKey:config!.cadencia_vapid_private},TTL:payload.kind==='rest'?120:600,urgency:'normal'});return fetch(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(10000)})}
Deno.serve(async req=>{
 const origin=req.headers.get('origin');const headers={'Content-Type':'application/json',...(origin&&allowed.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'}:{})};
 const response=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.has(origin))return response({error:'Origin denied'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{
  if(!config){const {data,error}=await admin.rpc('push_server_config');if(error||!data?.cadencia_push_cron)throw Error('Push configuration unavailable');config=data}
  if(req.headers.get('x-cron-secret')!==config!.cadencia_push_cron){
   const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return response({error:'Unauthorized'},401);
   const {data:{user},error}=await admin.auth.getUser(token);if(error||!user)return response({error:'Unauthorized'},401);
   const {data:owner}=await admin.from('app_owners').select('user_id').eq('user_id',user.id).maybeSingle();if(!owner)return response({error:'Forbidden'},403);
   const body=await req.json();const {data:sub}=await admin.from('push_subscriptions').select('*').eq('id',body.subscriptionId).eq('user_id',user.id).eq('enabled',true).maybeSingle();if(!sub)return response({error:'Subscription not found'},404);
   // Rate-limit manual tests to one per minute per device.
   const tag='test-'+Math.floor(Date.now()/60000);const {error:duplicate}=await admin.from('push_jobs').insert({user_id:user.id,subscription_id:sub.id,tag,kind:'rest',due_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),delivered_at:new Date().toISOString()});if(duplicate)return response({error:'Aguarde um minuto antes de outro teste.'},429);
   const sent=await send(sub.subscription,{title:'Cadência pronto para avisar',body:'As notificações deste aparelho estão funcionando.',tag,kind:'test'});if(!sent.ok)throw Error('Push provider rejected test');return response({ok:true});
  }
  const {data:jobs,error}=await admin.rpc('claim_push_jobs');if(error)throw error;let delivered=0;
  for(const job of jobs){try{const sent=await send(job.subscription,{title:job.kind==='rest'?'Descanso concluído':'Seu registro do dia',body:job.kind==='rest'?'Quando estiver pronto, continue a próxima série.':'Abra o Cadência para conferir sua agenda ou registrar uma atividade.',tag:job.tag,kind:job.kind});if(sent.ok){await admin.from('push_jobs').update({delivered_at:new Date().toISOString()}).eq('id',job.id);delivered++}else if(sent.status===404||sent.status===410)await admin.from('push_subscriptions').update({enabled:false}).eq('id',job.subscription_id)}catch{/* Lease permits bounded retries; never log subscription or secrets. */}}
  return response({ok:true,delivered});
 }catch{return response({error:'Não foi possível enviar a notificação.'},500)}
});
