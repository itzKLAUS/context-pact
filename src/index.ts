/** An optimizer, not a source-of-truth service or a prompt-injection defense. */
export interface RecordItem {
  id: string;
  text: string;
  source: string;
  tenant: string;
  score: number;
  scenarioScores?: Record<string, number>;
  trust: 'instruction' | 'evidence';
  requires?: string[];
  conflicts?: string[];
  facets?: string[];
  expiresAt?: number;
}
export interface Contract {
  tenant: string;
  now: number;
  budget: number;
  mandatory: string[];
  facets: string[];
  prefix: string;
  suffix: string;
  maxStates?: number;
  scenarios?: string[];
}
export interface Request { records: RecordItem[]; contract: Contract }
export interface Counter { id: string; unit: 'tokens' | 'utf8-bytes'; count(text: string): number }
export interface Candidate { ids: string[]; score: number; cost: number; context: string; scenarioTotals: Record<string, number> }
export interface Decision { id: string; reason: string; alternative?: Candidate; scoreLoss?: number; exchange?: string[]; complete?: boolean }
export interface Result {
  status: 'optimal' | 'limited' | 'infeasible';
  candidate: Candidate | null;
  counter: { id: string; unit: Counter['unit'] };
  states: number;
  decisions: Decision[];
}
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/;
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function integer(value: unknown, name: string, min = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < min) throw new Error(`${name} must be a safe integer >= ${min}`);
}
function string(value: unknown, name: string, max = 65536): asserts value is string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${name} must be a string <= ${max} characters`);
}
function ids(value: unknown, name: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 20 || value.some(x => typeof x !== 'string' || !idPattern.test(x)) || new Set(value).size !== value.length) throw new Error(`${name} must contain unique valid identifiers`);
}
/** Strict input checking happens before eligibility filtering, including hidden records. */
export function validateRequest(value: unknown): asserts value is Request {
  if (!object(value) || !Array.isArray(value.records) || value.records.length > 20 || !object(value.contract)) throw new Error('Request needs <=20 records and a contract');
  const c = value.contract;
  string(c.tenant, 'tenant', 96); if (!idPattern.test(c.tenant)) throw new Error('Invalid tenant');
  integer(c.now, 'now'); integer(c.budget, 'budget');
  string(c.prefix, 'prefix'); string(c.suffix, 'suffix'); ids(c.mandatory, 'mandatory'); ids(c.facets, 'facets');
  if (c.scenarios !== undefined) { ids(c.scenarios, 'scenarios'); if (c.scenarios.length === 0) throw new Error('scenarios cannot be empty'); }
  if (c.maxStates !== undefined) { integer(c.maxStates, 'maxStates', 1); if (c.maxStates > 1048576) throw new Error('maxStates exceeds 1048576'); }
  const seen = new Set<string>();
  let total = 0;
  for (const r of value.records) {
    if (!object(r)) throw new Error('Record must be an object');
    string(r.id, 'id', 96); if (!idPattern.test(r.id) || seen.has(r.id)) throw new Error('Invalid or duplicate record id'); seen.add(r.id);
    string(r.text, 'text'); string(r.source, 'source', 2048); string(r.tenant, 'record tenant', 96);
    if (!idPattern.test(r.tenant)) throw new Error('Invalid record tenant');
    integer(r.score, 'score'); total += r.score; integer(total, 'total score');
    if (r.scenarioScores !== undefined) {
      if (!object(r.scenarioScores)) throw new Error('scenarioScores must be an object');
      for (const [key,score] of Object.entries(r.scenarioScores)) { if (!idPattern.test(key)) throw new Error('Invalid scenario identifier'); integer(score,'scenario score'); }
    }
    if (r.trust !== 'instruction' && r.trust !== 'evidence') throw new Error('Invalid trust label');
    for (const key of ['requires', 'conflicts', 'facets']) if (r[key] !== undefined) ids(r[key], key);
    if (r.expiresAt !== undefined) integer(r.expiresAt, 'expiresAt');
  }
  for (const r of value.records as RecordItem[]) {
    for (const ref of [...r.requires ?? [], ...r.conflicts ?? []]) if (!seen.has(ref)) throw new Error(`Unknown reference ${ref}`);
  }
  for (const ref of c.mandatory as string[]) if (!seen.has(ref)) throw new Error(`Unknown mandatory record ${ref}`);
  for (const scenario of c.scenarios as string[] ?? []) {
    let total = 0;
    for (const r of value.records as RecordItem[]) {
      if (r.scenarioScores?.[scenario] === undefined) throw new Error(`Missing score for scenario ${scenario}`);
      total += r.scenarioScores[scenario]; integer(total,'scenario total');
    }
  }
}
/** Stable JSON Lines, with record text escaped rather than interpolated into instructions. */
export function render(records: readonly RecordItem[], contract: Contract): string {
  return contract.prefix + '\nCONTEXT_PACT_V1\n' + [...records].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(r => JSON.stringify({ id:r.id, trust:r.trust, source:r.source, requires:[...r.requires ?? []].sort(), text:r.text })).join('\n') + '\nEND_CONTEXT_PACT\n' + contract.suffix;
}
export const utf8Counter: Counter = { id:'utf8', unit:'utf8-bytes', count:text => new TextEncoder().encode(text).length };
/** Count the entire rendered envelope. No additive token or monotonicity assumption. */
export function compile(input: Request, counter: Counter = utf8Counter, explain = false): Result {
  validateRequest(input);
  if (!counter.id || !['tokens','utf8-bytes'].includes(counter.unit)) throw new Error('Invalid counter metadata');
  const request: Request = structuredClone(input);
  const records = [...request.records].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const c = request.contract;
  const blocked = new Map<string,string>();
  for (const r of records) {
    if (r.tenant !== c.tenant) blocked.set(r.id,'tenant');
    else if (r.expiresAt !== undefined && r.expiresAt <= c.now) blocked.set(r.id,'expired');
  }
  // Fixed-point propagation: an unavailable prerequisite invalidates every dependent.
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of records) if (!blocked.has(r.id) && r.requires?.some(id => blocked.has(id))) { blocked.set(r.id,'unavailable-dependency'); changed=true; }
  }
  const eligible = records.filter(r => !blocked.has(r.id));
  const cap = c.maxStates ?? 1048576;
  let visited=0;
  let best: Candidate | null = null;
  const subsets = 2 ** eligible.length;
  for (let mask=0; mask<subsets && visited<cap; mask++) {
    visited++;
    const picked = eligible.filter((_,i) => Boolean(mask & (1 << i)));
    const selected = new Set(picked.map(r => r.id));
    if (!c.mandatory.every(id => selected.has(id))) continue;
    if (!c.facets.every(facet => picked.some(r => r.facets?.includes(facet)))) continue;
    if (picked.some(r => r.requires?.some(id => !selected.has(id)) || r.conflicts?.some(id => selected.has(id)))) continue;
    const scenarioTotals: Record<string,number> = Object.fromEntries((c.scenarios ?? ['default']).map(scenario => [scenario,picked.reduce((sum,r) => sum+(c.scenarios ? r.scenarioScores![scenario]! : r.score),0)]));
    const score = Math.min(...Object.values(scenarioTotals));
    if (best && score < best.score) continue;
    const context = render(picked,c);
    const cost = counter.count(context); integer(cost,'counter result');
    if (cost > c.budget) continue;
    const candidate: Candidate = { ids:[...selected],score,cost,context,scenarioTotals };
    if (!best || score>best.score || (score===best.score && (cost<best.cost || (cost===best.cost && candidate.ids.join('\0')<best.ids.join('\0'))))) best=candidate;
  }
  const complete = visited === subsets;
  const result: Result = { status:complete ? best ? 'optimal':'infeasible' : 'limited',candidate:best,counter:{id:counter.id,unit:counter.unit},states:visited,decisions:[] };
  for (const r of records) {
    const decision: Decision = { id:r.id,reason:blocked.get(r.id) ?? (best?.ids.includes(r.id) ? 'selected':'not-selected') };
    if (explain && !blocked.has(r.id) && !best?.ids.includes(r.id)) {
      const forced = structuredClone(request);
      if (!forced.contract.mandatory.includes(r.id)) forced.contract.mandatory.push(r.id);
      const alternative = compile(forced,counter,false);
      decision.complete = alternative.status !== 'limited';
      if (alternative.candidate) {
        decision.alternative=alternative.candidate;
        if (best) { decision.scoreLoss=best.score-alternative.candidate.score; decision.exchange=best.ids.filter(id => !alternative.candidate!.ids.includes(id)); }
        decision.reason='alternative';
      } else decision.reason=alternative.status==='infeasible' ? 'no-feasible-inclusion' : 'search-limit';
    }
    result.decisions.push(decision);
  }
  // Counter callbacks receive only strings; no callback can mutate our snapshots.
  return result;
}
