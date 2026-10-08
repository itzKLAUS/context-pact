import { validateRequest } from './index.js';
import type { Request, Candidate, Counter } from './index.js';
/** Independently checks feasibility and measurements, never claims optimality. */
export function verifyCandidate(input: Request, candidate: Candidate, counter: Counter): string[] {
  validateRequest(input);
  const errors:string[]=[];
  if (!candidate || !Array.isArray(candidate.ids) || candidate.ids.some(id=>typeof id!=='string')) return ['Malformed candidate'];
  const chosen=new Set(candidate.ids);
  if (chosen.size!==candidate.ids.length) errors.push('Duplicate selected id');
  const byId=new Map(input.records.map(r=>[r.id,r]));
  if(candidate.ids.some(id=>!byId.has(id)))return [...errors,'Unknown selected id'];
  const items=candidate.ids.map(id=>byId.get(id)!);
  const c=input.contract;
  for(const r of items){
    if(r.tenant!==c.tenant)errors.push(`Tenant mismatch: ${r.id}`);
    if(r.expiresAt!==undefined && r.expiresAt<=c.now)errors.push(`Expired: ${r.id}`);
    if(r.requires?.some(id=>!chosen.has(id)))errors.push(`Missing dependency: ${r.id}`);
    if(r.conflicts?.some(id=>chosen.has(id)))errors.push(`Conflict: ${r.id}`);
  }
  if(c.mandatory.some(id=>!chosen.has(id)))errors.push('Missing mandatory record');
  if(c.facets.some(f=>!items.some(r=>r.facets?.includes(f))))errors.push('Missing facet');
  const sorted=[...items].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const context=c.prefix+'\nCONTEXT_PACT_V1\n'+sorted.map(r=>JSON.stringify({id:r.id,trust:r.trust,source:r.source,requires:[...r.requires??[]].sort(),text:r.text})).join('\n')+'\nEND_CONTEXT_PACT\n'+c.suffix;
  if(candidate.context!==context)errors.push('Rendered context mismatch');
  const cost=counter.count(context);
  if(!Number.isSafeInteger(cost)||cost<0)throw new Error('Invalid counter result');
  if(candidate.cost!==cost)errors.push('Measured cost mismatch');
  if(cost>c.budget)errors.push('Budget exceeded');
  const totals=Object.fromEntries((c.scenarios??['default']).map(s=>[s,items.reduce((sum,r)=>sum+(c.scenarios?r.scenarioScores![s]!:r.score),0)]));
  if(candidate.score!==Math.min(...Object.values(totals)))errors.push('Objective mismatch');
  if(!candidate.scenarioTotals||Object.keys(candidate.scenarioTotals).length!==Object.keys(totals).length||Object.entries(totals).some(([k,v])=>candidate.scenarioTotals[k]!==v))errors.push('Scenario totals mismatch');
  return errors;
}
