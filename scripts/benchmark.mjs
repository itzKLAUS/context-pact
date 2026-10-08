import {compile,utf8Counter,render} from '../dist/index.js';
import {verifyCandidate} from '../dist/verify.js';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
let seed=1031;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const cases=[];
for(let run=0;run<100;run++){
  const records=Array.from({length:10},(_,i)=>({id:'r'+i,tenant:'team',source:'synthetic/'+i,text:'Synthetic context '+i+' '+'.'.repeat(20+rand(90)),score:1,trust:'evidence',scenarioScores:{repair:1+rand(30),rollback:1+rand(30)},requires:i&&rand(3)===0?['r'+rand(i)]:[]}));
  const contract={tenant:'team',now:0,budget:600+rand(450),prefix:'',suffix:'',mandatory:['r0'],facets:[],scenarios:['repair','rollback']};const req={records,contract};
  const start=performance.now();const result=compile(req);const duration=performance.now()-start;
  if(result.status!=='optimal')throw new Error('Benchmark requires complete search');
  const byId=new Map(records.map(r=>[r.id,r]));
  const closure=(ids)=>{const set=new Set(ids);let changed=true;while(changed){changed=false;for(const id of set)for(const ref of byId.get(id).requires){if(!set.has(ref)){set.add(ref);changed=true;}}}return [...set];};
  const candidate=ids=>{const picked=ids.map(id=>byId.get(id));const totals=Object.fromEntries(contract.scenarios.map(s=>[s,picked.reduce((n,r)=>n+r.scenarioScores[s],0)]));const context=render(picked,contract);return {ids:[...ids].sort(),context,cost:utf8Counter.count(context),scenarioTotals:totals,score:Math.min(...Object.values(totals))};};
  let greedy=candidate(closure(contract.mandatory));
  const ranked=[...records].sort((a,b)=>Math.min(...Object.values(b.scenarioScores))/utf8Counter.count(render([b],contract))-Math.min(...Object.values(a.scenarioScores))/utf8Counter.count(render([a],contract)));
  for(const r of ranked){const next=candidate(closure([...greedy.ids,r.id]));if(!verifyCandidate(req,next,utf8Counter).length)greedy=next;}
  if(verifyCandidate(req,greedy,utf8Counter).length)throw new Error('Invalid greedy baseline');
  if(result.candidate.score<greedy.score)throw new Error('Exact optimum below feasible baseline');
  cases.push({run,exact:result.candidate.score,greedy:greedy.score,gap:result.candidate.score-greedy.score,milliseconds:duration,states:result.states});
}
const times=cases.map(x=>x.milliseconds).sort((a,b)=>a-b);
const report={seed:1031,cases:cases.length,strictImprovements:cases.filter(x=>x.gap>0).length,meanUtilityGap:cases.reduce((n,x)=>n+x.gap,0)/cases.length,medianMilliseconds:times[50],p95Milliseconds:times[95],notes:'Synthetic 10-record cases, two supplied utility scenarios, UTF-8 byte budgets. Dependency-closed greedy density baseline. No model calls or reasoning-quality measurement.',results:cases};
await mkdir('docs',{recursive:true});await writeFile('docs/benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined},null,2));
