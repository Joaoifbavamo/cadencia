import {test} from 'node:test';import assert from 'node:assert/strict';import {resolveTheme} from '../src/theme.ts';
test('tema acompanha sistema apenas no automático',()=>{assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark')});
