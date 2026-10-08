import { encode } from 'gpt-tokenizer/encoding/cl100k_base';
import type { Counter } from './index.js';
// Quoted evidence can contain token spellings. Count them as ordinary text.
export const cl100k: Counter = { id:'cl100k_base@gpt-tokenizer-4.0.0:literal-specials',unit:'tokens',count:text => encode(text,{disallowedSpecial:new Set()}).length };
