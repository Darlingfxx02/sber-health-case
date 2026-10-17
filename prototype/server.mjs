import http from 'node:http';
import {handleMascotEvents} from './mascot-event-log.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
http.createServer(async (req,res) => {
  try {
    let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (name === '/api/mascot-events') return await handleMascotEvents(req,res,path.join(root,'history/mascot-events.jsonl'));
    if (name === '/') name = '/index.html';
    const file = path.resolve(root,'.'+name);
    if (!file.startsWith(root)) {res.writeHead(403);return res.end();}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4317,'127.0.0.1',()=>console.log('Local: http://localhost:4317'));
