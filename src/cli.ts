#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compile,validateRequest,utf8Counter } from './index.js';
import { cl100k } from './tokenizer.js';

try {
  const args=process.argv.slice(2);
  const path=args.shift();
  if (!path || path==='--help') {
    console.log('context-pact REQUEST.json [--unit tokens|utf8-bytes] [--output RESULT.json] [--explain]\nTokens use cl100k_base, not a tokenizer for unannounced models. Exit: 0 optimal, 2 infeasible, 3 limited, 1 invalid input.');
    process.exit(path ? 0:1);
  }
  let unit='tokens'; let output:string|undefined; let explain=false;
  while (args.length) {
    const flag=args.shift();
    if (flag==='--explain') explain=true;
    else if (flag==='--unit') { unit=args.shift() ?? ''; if (!['tokens','utf8-bytes'].includes(unit)) throw new Error('Invalid unit'); }
    else if (flag==='--output') { output=args.shift(); if (!output || output.startsWith('--')) throw new Error('Missing output filename'); }
    else throw new Error(`Unknown flag ${flag}`);
  }
  const bytes=await readFile(path); if (bytes.length>2_000_000) throw new Error('Input exceeds 2 MB');
  const input:unknown=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')); validateRequest(input);
  const result=compile(input,unit==='tokens' ? cl100k:utf8Counter,explain);
  const artifact={ schema:1,requestSha256:createHash('sha256').update(bytes).digest('hex'),...result };
  const json=JSON.stringify(artifact,null,2)+'\n';
  // Exclusive create: never overwrite an input file, previous report or symlink target.
  if (output) await writeFile(output,json,{flag:'wx',mode:0o600}); else process.stdout.write(json);
  process.exitCode=result.status==='optimal' ? 0:result.status==='infeasible' ? 2:3;
} catch (error) { console.error(error instanceof Error ? error.message:'Command failed'); process.exitCode=1; }
