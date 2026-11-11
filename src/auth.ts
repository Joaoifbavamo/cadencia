import {createClient} from '@supabase/supabase-js';
export const supabase=createClient('https://uapidlblgnkaowwffaxu.supabase.co','sb_publishable_UblCFPlKzKy5Lzt1TZC8lA_VFiH6rqa',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
