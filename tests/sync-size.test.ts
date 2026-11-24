import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { payloadWithinLimit } from "../src/domain.ts";

for (const batched of [false, true]) test(`oversized pending ${batched ? "batch" : "document"} stays local without blocking unrelated sync`, async () => {
  const source = readFileSync(new URL("../src/sync.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace("export class SyncEngine", "class SyncEngine");
  const sent: string[] = [];
  const make = (id: string, large = false, batchId?: string) => ({ id, kind:"activity", payload:{notes:large ? "x".repeat(1000000) : "ok"},dirty:true,deleted:false,version:1,mutationId:id,localSeq:1,change_seq:0,batchId });
  const docs = [make("large",true,batched?"batch":undefined), ...(batched?[make("sibling",false,"batch")]:[]),make("valid")];
  const query:any = {}; for(const name of ["select","eq","gt","order"])query[name]=()=>query;
  query.limit=async()=>({data:[],error:null});
  const api = {from:()=>query,rpc:async(_name:string,p:any)=>{sent.push(p.p_id);return{data:{ok:true,document:{...docs.find(d=>d.id===p.p_id),version:2}},error:null};}};
  const store:any = {account:"owner",docs,merge:async()=>{},ack:async(d:any)=>{d.dirty=false;}};
  const Engine = new Function("supabase","payloadWithinLimit",compiled+";return SyncEngine;")(api,payloadWithinLimit);
  const old = Object.getOwnPropertyDescriptor(globalThis,"navigator");
  Object.defineProperty(globalThis,"navigator",{value:{onLine:true},configurable:true});
  try {
    const engine=new Engine(store,()=>{});await engine.run();
    assert.deepEqual(sent,["valid"]);assert.equal(docs[0].dirty,true);assert.equal(docs.at(-1)!.dirty,false);assert.match(engine.error,/grande pendente/);
  } finally {if(old)Object.defineProperty(globalThis,"navigator",old);else delete (globalThis as any).navigator;}
});
