import {test} from 'node:test';import assert from 'node:assert/strict';
import {acknowledge,mergeRemote,editEntity} from '../src/merge.ts';
const base:any={id:'a',kind:'set',payload:{load:20},version:1,change_seq:1,deleted:false,dirty:false,mutationId:'m',localSeq:0};
test('ack não perde nova edição feita durante envio',()=>{const sent=editEntity(base,{load:22});const edited=editEntity(sent,{load:24});const ack=acknowledge(edited,sent,{...base,payload:{load:22},version:2});assert.equal(ack.payload.load,24);assert.equal(ack.version,2);assert.equal(ack.dirty,true);assert.notEqual(ack.mutationId,sent.mutationId)});
test('remoto preserva ambos os lados em conflito',()=>{const local=editEntity(base,{load:22});const merged=mergeRemote(local,{...base,payload:{load:30},version:2});assert.equal(merged.payload.load,22);assert.equal(merged.conflict?.payload.load,30)});
test('tombstone do servidor impede ressurreição silenciosa',()=>{const local=editEntity(base,{load:22});assert.equal(mergeRemote(local,{...base,version:2,deleted:true}).conflict?.deleted,true)});
test('remoto antigo não regride versão',()=>{assert.equal(mergeRemote({...base,version:3},{...base,version:2}).version,3)});
