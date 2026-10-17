// Local-only, bounded event batches. No chat content or health readings are sent.
const queue=[];
const localLogging=typeof location!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const session=crypto.randomUUID();
let timer=null,warned=false;
async function flush(){
  timer=null;
  const events=queue.splice(0,40);
  if(!events.length)return;
  try{
    const response=await fetch('/api/mascot-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),keepalive:true});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    warned=false;
  }catch(error){
    if(!warned){console.warn('Mascot event file unavailable:',error.message);warned=true;}
  }
}
export function logMascotEvent(event){
  if(!localLogging)return;
  queue.push({at:new Date().toISOString(),session,...event});
  if(queue.length>40)queue.shift();
  if(!timer)timer=setTimeout(flush,700);
}
if(localLogging)window.addEventListener('pagehide',()=>{clearTimeout(timer);void flush();});
