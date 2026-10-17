import {appendFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const surfaces=new Set(['widgets','chat','voice']);
const actions=new Set(['emotion','blink','nudge','activate']);
const emotions=new Set(['neutral','happy','curious','thoughtful','encouraging','listening','resting']);
const reasons=new Set(['rest','look-around','ponder','state','nudge','check-in','encourage','reduced-motion','voice-state','greeting','goals-complete','history','idle','activity-progress','open-voice']);
export function validateMascotEvents(payload){
  if(!Array.isArray(payload?.events)||!payload.events.length||payload.events.length>40)throw new Error('Invalid event batch');
  return payload.events.map(event=>{
    if(!event||!surfaces.has(event.surface)||!actions.has(event.action)||typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at)))throw new Error('Invalid mascot event');
    if(event.session!==undefined&&(typeof event.session!=='string'||!/^[-a-f0-9]{36}$/.test(event.session)))throw new Error('Invalid session');
    if(event.emotion!==undefined&&!emotions.has(event.emotion))throw new Error('Invalid emotion');
    if(event.target!==undefined&&!['movement','distance'].includes(event.target))throw new Error('Invalid target');
    if(event.reason!==undefined&&!reasons.has(event.reason))throw new Error('Invalid reason');
    return {at:new Date(event.at).toISOString(),...(event.session?{session:event.session}:{}),surface:event.surface,action:event.action,...(event.emotion?{emotion:event.emotion}:{}),...(event.target?{target:event.target}:{}),...(event.reason?{reason:event.reason}:{})};
  });
}
export async function writeMascotEvents(file,events){
  await mkdir(path.dirname(file),{recursive:true});
  await appendFile(file,events.map(event=>JSON.stringify(event)).join('\n')+'\n','utf8');
}
export async function handleMascotEvents(req,res,file){
  if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'});res.end();return;}
  const origin=req.headers.origin;
  if(origin&&origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
  if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end();return;}
  let body='';
  try{
    for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32768){res.writeHead(413);res.end();return;}}
    let events;
    try{events=validateMascotEvents(JSON.parse(body));}catch{res.writeHead(400);res.end();return;}
    await writeMascotEvents(file,events);
    res.writeHead(204,{'Cache-Control':'no-store'});res.end();
  }catch(error){console.error('Mascot event log:',error.message);if(!res.headersSent)res.writeHead(500);res.end();}
}
