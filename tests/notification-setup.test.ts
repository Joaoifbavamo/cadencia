import {test} from 'node:test';import assert from 'node:assert/strict';import {notificationStep} from '../src/notification-environment.ts';
const ready={ios:true,standalone:true,notifications:true,push:true,worker:true,permission:'default' as NotificationPermission};
test('iPhone no navegador pede instalação antes de permissão',()=>{assert.equal(notificationStep({...ready,standalone:false}),'install')});
test('atalho sem API de push não simula suporte',()=>{assert.equal(notificationStep({...ready,push:false}),'unsupported')});
test('permissão negada orienta Ajustes, não repete prompt',()=>{assert.equal(notificationStep({...ready,permission:'denied'}),'blocked')});
test('separa permitir e conectar aparelho',()=>{assert.equal(notificationStep(ready),'permission');assert.equal(notificationStep({...ready,permission:'granted'}),'connect')});
