import {compile,utf8Counter} from '/engine.js';
self.onmessage=({data})=>{
  try {const result=compile(data,utf8Counter,true);self.postMessage({result});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Compilation failed'});}
};
