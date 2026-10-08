import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {compile,utf8Counter} from '../dist/index.js';
import {verifyCandidate} from '../dist/verify.js';
const fixture=JSON.parse(await readFile(new URL('../examples/incident.json',import.meta.url),'utf8'));
test('independent checker rejects forged contexts, costs, scores and tenant leakage',()=>{
  const good=compile(fixture).candidate;assert.deepEqual(verifyCandidate(fixture,good,utf8Counter),[]);
  for(const mutate of [x=>x.cost=0,x=>x.score=999,x=>x.context+='injected',x=>x.ids.push(x.ids[0]),x=>x.scenarioTotals={},x=>x.ids.push('other-tenant'),x=>x.ids=['ghost'],x=>x.ids=[]]){
    const bad=structuredClone(good);mutate(bad);assert.ok(verifyCandidate(fixture,bad,utf8Counter).length);
  }
});
test('CLI writes valid token report, refuses overwrite and signals invalid input',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'context-pact-'));const path=join(dir,'result.json');
  try{
    const args=['dist/cli.js','examples/incident.json','--output',path,'--explain'];
    const run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
    const result=JSON.parse(await readFile(path,'utf8'));assert.equal(result.status,'optimal');assert.match(result.requestSha256,/^[a-f0-9]{64}$/);assert.equal(result.counter.unit,'tokens');
    const previous=await readFile(path);assert.equal(spawnSync(process.execPath,args).status,1);assert.deepEqual(await readFile(path),previous);
    assert.equal(spawnSync(process.execPath,['dist/cli.js','examples/incident.json','--unit','approximate']).status,1);
    assert.equal(spawnSync(process.execPath,['dist/cli.js','--help']).status,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('loopback server serves application with CSP and rejects mutations and unknown routes',async()=>{
  const proc=spawn(process.execPath,['dist/server.js'],{env:{...process.env,CONTEXT_PACT_PORT:'0'},stdio:['ignore','pipe','pipe']});
  const log=await new Promise((resolve,reject)=>{proc.stdout.once('data',data=>resolve(data.toString()));proc.once('error',reject);proc.once('exit',code=>reject(new Error('Server exited '+code)));});
  const base=log.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  try{
    const response=await fetch(base+'/');assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);assert.match(await response.text(),/Keep the facts/);
    assert.equal((await fetch(base+'/toString')).status,404);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/worker.js')).status,200);
  }finally{proc.kill();await new Promise(resolve=>proc.once('exit',resolve));}
});
