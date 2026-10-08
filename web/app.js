const el=id=>document.getElementById(id);
let worker;let last;let example;
function clear(){last=undefined;el('download').disabled=true;for(const id of ['outcome','score','cost','count'])el(id).textContent='—';el('decisions').replaceChildren();el('context').textContent='Compile the current settings to produce a context.';}
function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
function display(result){
  last=result;el('download').disabled=false;
  el('outcome').textContent=result.status;el('score').textContent=result.candidate?.score??'—';el('cost').textContent=result.candidate?.cost??'—';el('count').textContent=result.candidate?.ids.length??0;
  el('context').textContent=result.candidate?.context??'No feasible context was found. Nothing should be sent to a model.';
  el('status').textContent=result.status==='optimal'?`Complete search · ${result.states.toLocaleString()} subsets examined` : result.status==='limited'?'Search limit reached. This is not an optimality certificate.':'Contract cannot be satisfied at this budget.';
  const records=JSON.parse(el('input').value).records;
  el('decisions').replaceChildren(...result.decisions.map(d=>{
    const card=text('article','','card');const top=text('div','','card-top');top.append(text('h3',d.id),text('span',d.reason,'tag '+d.reason));card.append(top);
    // Do not render excluded tenant/expired record content into the result panel.
    if(d.reason==='selected')card.append(text('p',records.find(r=>r.id===d.id).text));
    if(d.exchange)card.append(text('p',`Including this record exchanges: ${d.exchange.join(', ')||'none'} · utility change ${-d.scoreLoss} · ${d.complete?'complete':'limited'} search`,'why'));
    return card;
  }));
}
function run(){
  clear();el('compile').disabled=true;el('status').textContent='Searching feasible contexts…';
  if(worker)worker.terminate();
  try{
    if(el('input').value.length>2_000_000)throw new Error('Fixture exceeds 2 MB');
    const request=JSON.parse(el('input').value);
    request.contract.budget=Number(el('budget').value);request.contract.tenant=el('tenant').value;
    request.contract.maxStates=65536;
    if(request.contract.scenarios){request.contract.scenarios=el('mode').value==='robust'?request.contract.scenarios:[el('mode').value];}
    worker=new Worker('/worker.js',{type:'module'});
    worker.onmessage=({data})=>{el('compile').disabled=false;if(data.error){el('status').textContent=data.error;el('context').textContent='Invalid input. Previous result cleared.';el('decisions').replaceChildren();}else display(data.result);};
    worker.onerror=()=>{el('compile').disabled=false;el('status').textContent='Worker failed. No result is available.';};
    worker.postMessage(request);
  }catch(error){el('compile').disabled=false;el('status').textContent=error.message;el('context').textContent='Invalid input. Previous result cleared.';el('decisions').replaceChildren();}
}
el('compile').addEventListener('click',run);
for(const id of ['budget','tenant','mode','input'])el(id).addEventListener('input',()=>{if(worker)worker.terminate();el('compile').disabled=false;clear();el('status').textContent='Settings changed. Compile again to update the result.';});
el('reset').addEventListener('click',()=>{el('input').value=JSON.stringify(example,null,2);el('budget').value=example.contract.budget;el('tenant').value=example.contract.tenant;el('mode').value='robust';run();});
el('download').addEventListener('click',()=>{if(!last)return;const url=URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='context-pact-result.json';a.click();URL.revokeObjectURL(url);});
try{const response=await fetch('/example.json');if(!response.ok)throw new Error('Cannot load fixture');example=await response.json();el('input').value=JSON.stringify(example,null,2);run();}catch(error){el('status').textContent=error.message;}
