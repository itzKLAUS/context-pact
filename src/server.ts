/** Read-only loopback static server. Compilation stays in the browser. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const routes:Record<string,[URL,string]>={
  '/':[new URL('../web/index.html',import.meta.url),'text/html; charset=utf-8'],
  '/app.js':[new URL('../web/app.js',import.meta.url),'text/javascript; charset=utf-8'],
  '/worker.js':[new URL('../web/worker.js',import.meta.url),'text/javascript; charset=utf-8'],
  '/style.css':[new URL('../web/style.css',import.meta.url),'text/css; charset=utf-8'],
  '/engine.js':[new URL('./index.js',import.meta.url),'text/javascript; charset=utf-8'],
  '/example.json':[new URL('../examples/incident.json',import.meta.url),'application/json'],
};
const port=Number(process.env.CONTEXT_PACT_PORT ?? 4317);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid CONTEXT_PACT_PORT');
const server=createServer(async (req,res) => {
  if (req.method!=='GET') { res.writeHead(405); res.end(); return; }
  if (req.url==='/favicon.ico') { res.writeHead(204); res.end(); return; }
  const route=Object.hasOwn(routes,req.url ?? '') ? routes[req.url ?? ''] : undefined;
  if (!route) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const data=await readFile(route[0]);
    res.writeHead(200,{'Content-Type':route[1],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}); res.end(data);
  } catch { res.writeHead(500); res.end('File unavailable'); }
}).listen(port,'127.0.0.1',()=>{const address=server.address();if(address&&typeof address!=='string')console.log(`Context Pact workbench: http://127.0.0.1:${address.port}`);});
