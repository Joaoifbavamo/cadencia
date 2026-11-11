import type {Entity,Kind,Profile} from './domain.ts';
export interface Model {docs:Entity[];profile:Profile;demo:boolean;save:(id:string,kind:Kind,payload:any,deleted?:boolean)=>Promise<void>;refresh:()=>void}
