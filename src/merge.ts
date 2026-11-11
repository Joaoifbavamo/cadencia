import {uid,type Entity} from './domain.ts';
export const editEntity=(e:Entity,payload:any,deleted=e.deleted):Entity=>({...e,payload,deleted,dirty:true,mutationId:uid(),localSeq:e.localSeq+1});
export function acknowledge(current:Entity,sent:Entity,remote:Entity):Entity {return current.localSeq===sent.localSeq?{...remote,dirty:false,localSeq:current.localSeq,mutationId:sent.mutationId}:{...current,version:remote.version,change_seq:remote.change_seq,dirty:true}}
export function mergeRemote(local:Entity|undefined,remote:Entity):Entity {if(!local)return {...remote,dirty:false,localSeq:0,mutationId:uid()};if(remote.version<=local.version)return local;if(local.dirty)return {...local,conflict:remote};return {...remote,dirty:false,localSeq:local.localSeq,mutationId:uid()}}
