import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile, render, utf8Counter, validateRequest} from '../dist/index.js';
import {cl100k} from '../dist/tokenizer.js';
const item=(id,score=1,extra={})=>({id,score,text:id,tenant:'a',source:'fixture/'+id,trust:'evidence',...extra});
const request=(records,extra={})=>({records,contract:{tenant:'a',now:100,budget:10000,mandatory:[],facets:[],prefix:'',suffix:'',...extra}});

test('selects dependency-closed optimum and explains the conflicting alternative',()=>{
  const r=request([item('a',10,{requires:['b']}),item('b',1),item('c',5,{conflicts:['a']})]);
  const out=compile(r,utf8Counter,true);
  assert.equal(out.status,'optimal'); assert.deepEqual(out.candidate.ids,['a','b']);
  const c=out.decisions.find(x=>x.id==='c'); assert.equal(c.scoreLoss,5); assert.deepEqual(c.exchange,['a']);
});
test('excludes cross-tenant and expired dependencies transitively',()=>{
  const r=request([item('a',100,{tenant:'b'}),item('b',10,{requires:['a']}),item('c',3,{requires:['b']}),item('d',10,{expiresAt:100}),item('e',1)]);
  const out=compile(r); assert.deepEqual(out.candidate.ids,['e']);
  assert.deepEqual(out.decisions.map(x=>x.reason),['tenant','unavailable-dependency','unavailable-dependency','expired','selected']);
});
test('mandatory records and facets fail closed when impossible',()=>{
  assert.equal(compile(request([item('a',1,{tenant:'b'})],{mandatory:['a']})).status,'infeasible');
  assert.equal(compile(request([item('a')],{facets:['missing']})).status,'infeasible');
  assert.equal(compile(request([],{budget:0})).candidate,null);
});
test('counts complete rendered envelope, including Unicode and escaping',()=>{
  const r=request([item('a',1,{text:'雪山\n"quoted" <script>'})],{prefix:'instructions',suffix:'tail'});
  const exact=utf8Counter.count(render(r.records,r.contract));
  r.contract.budget=exact; assert.equal(compile(r).candidate.cost,exact);
  r.contract.budget=exact-1; assert.deepEqual(compile(r).candidate.ids,[]);
  assert.match(render(r.records,r.contract),/\\n\\"quoted/);
});
test('does not assume additive or monotonic counter costs',()=>{
  const r=request([item('a',9),item('b',8)],{budget:1});
  const counter={id:'nonmonotonic-fixture',unit:'tokens',count:s=>s.includes('"id":"a"')&&s.includes('"id":"b"')?1:10};
  assert.deepEqual(compile(r,counter).candidate.ids,['a','b']);
});
test('robust objective preserves coverage across two possible tasks',()=>{
  const r=request([item('a',99,{scenarioScores:{x:20,y:0},conflicts:['b']}),item('b',1,{scenarioScores:{x:8,y:8}})],{scenarios:['x','y']});
  const out=compile(r); assert.deepEqual(out.candidate.ids,['b']); assert.equal(out.candidate.score,8);
});
test('cycles are atomic and self-conflicts are infeasible',()=>{
  assert.deepEqual(compile(request([item('a',2,{requires:['b']}),item('b',2,{requires:['a']})])).candidate.ids,['a','b']);
  assert.equal(compile(request([item('a',2,{conflicts:['a']})],{mandatory:['a']}),utf8Counter,true).status,'infeasible');
});
test('limits never masquerade as optimality or infeasibility',()=>{
  const out=compile(request([item('a')],{maxStates:1})); assert.equal(out.status,'limited'); assert.deepEqual(out.candidate.ids,[]);
  const missing=compile(request([item('a')],{maxStates:1,mandatory:['a']}),utf8Counter,true); assert.equal(missing.status,'limited'); assert.equal(missing.candidate,null); assert.equal(missing.decisions[0].reason,'search-limit');
});
test('permutation-invariant deterministic ties and pure snapshots',()=>{
  const r=request([item('b',0),item('a',0)]); const before=structuredClone(r);
  const a=compile(r);r.records.reverse();const b=compile(r);assert.deepEqual(a,b);r.records.reverse();assert.deepEqual(r,before);
});
test('real tokenizer measures selected rendered context exactly',()=>{
  const out=compile(request([item('a',2,{text:'中文 English 123 🤖'})]),cl100k);
  assert.equal(out.candidate.cost,cl100k.count(out.candidate.context));assert.equal(out.counter.unit,'tokens');
});
test('rejects malformed contracts, unsafe arithmetic and dangling graph references',()=>{
  for (const change of [r=>r.records.push(item('a')),r=>r.contract.budget=-1,r=>r.records[0].requires=['ghost'],r=>r.contract.mandatory=['ghost'],r=>r.records[0].score=NaN,r=>r.records[0].trust='system',r=>r.contract.scenarios=['x'],r=>r.contract.maxStates=1048577,r=>r.contract.facets=['x','x'],r=>r.records[0].text=7,r=>r.records[0].scenarioScores={x:-1},r=>r.contract.scenarios=[]]) {
    const r=request([item('a')]);change(r);assert.throws(()=>validateRequest(r));
  }
  assert.throws(()=>compile(request([item('a',Number.MAX_SAFE_INTEGER),item('b',1)])));
  assert.throws(()=>compile(request([]),{id:'bad',unit:'tokens',count:()=>-1}));
  assert.throws(()=>compile(request([]),{id:'',unit:'tokens',count:()=>0}));
});
// Independent recursive power-set oracle: no compiler helpers or mask enumeration.
function oracle(r) {
  let best=null;
  function walk(i,picked) {
    if(i<r.records.length){walk(i+1,picked);walk(i+1,[...picked,r.records[i]]);return;}
    const chosen=new Set(picked.map(x=>x.id));const c=r.contract;
    if(picked.some(x=>x.tenant!==c.tenant||(x.expiresAt!==undefined&&x.expiresAt<=c.now)||(x.requires??[]).some(id=>!chosen.has(id))||(x.conflicts??[]).some(id=>chosen.has(id))))return;
    if(!c.mandatory.every(id=>chosen.has(id))||!c.facets.every(f=>picked.some(x=>(x.facets??[]).includes(f))))return;
    const sorted=[...picked].sort((a,b)=>a.id<b.id?-1:1);
    const context=c.prefix+'\nCONTEXT_PACT_V1\n'+sorted.map(x=>JSON.stringify({id:x.id,trust:x.trust,source:x.source,requires:[...x.requires??[]].sort(),text:x.text})).join('\n')+'\nEND_CONTEXT_PACT\n'+c.suffix;
    const cost=new TextEncoder().encode(context).length;if(cost>c.budget)return;
    const score=Math.min(...(c.scenarios??['default']).map(s=>picked.reduce((n,x)=>n+(c.scenarios?x.scenarioScores[s]:x.score),0)));
    const ids=sorted.map(x=>x.id);
    if(!best||score>best.score||(score===best.score&&(cost<best.cost||(cost===best.cost&&ids.join('\0')<best.ids.join('\0')))))best={ids,score,cost};
  }walk(0,[]);return best;
}
test('200 generated dependency/conflict/tenant/expiry/robust instances agree with independent oracle',()=>{
  let seed=177;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let run=0;run<200;run++) {
    const records=Array.from({length:7},(_,i)=>item('r'+i,rand(10),{tenant:rand(9)?'a':'b',expiresAt:rand(7)?101:99,facets:rand(3)?[]:['coverage'],scenarioScores:{x:rand(10),y:rand(10)}}));
    for(let i=0;i<7;i++){if(rand(3)===0)records[i].requires=['r'+rand(7)];if(rand(4)===0)records[i].conflicts=['r'+rand(7)];}
    const r=request(records,{budget:50+rand(900),mandatory:rand(3)?[]:['r0'],facets:rand(2)?[]:['coverage'],...(rand(2)?{scenarios:['x','y']}:{})});
    const expected=oracle(r);const actual=compile(r).candidate;
    assert.deepEqual(actual?{ids:actual.ids,score:actual.score,cost:actual.cost}:null,expected,'instance '+run);
  }
});
