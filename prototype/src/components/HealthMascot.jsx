import {AnimatedMascot} from './AnimatedMascot.jsx';
import {logMascotEvent} from '../mascot-events.js';

export function HealthMascot({onOpen,notification,active=true}){
  return <button disabled title="Голосовой режим и документы вне сценария тестового" className={`health-mascot${notification?' has-document':''}`} onClick={()=>{if(!notification)logMascotEvent({surface:'chat',action:'activate',reason:'open-voice'});onOpen();}} aria-label={notification?`Открыть новый документ: ${notification.title}`:'Открыть голосовой чат'}>
    {notification?<img src="assets/mascot/health-document.svg" width="224.68" height="217.94" alt="" draggable="false"/>:<AnimatedMascot variant="chat" surface="chat" active={active}/>}
  </button>;
}
