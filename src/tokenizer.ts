import { encode } from 'gpt-tokenizer/encoding/cl100k_base';
import type { Counter } from './index.js';
export const cl100k: Counter = { id:'cl100k_base@gpt-tokenizer-4.0.0',unit:'tokens',count:text => encode(text).length };
