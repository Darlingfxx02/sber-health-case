import {useEffect,useRef,useState} from 'react';
import {GlassButton} from '@glass-sdk/liquid-glass';
import {AnimatedMascot} from './AnimatedMascot.jsx';
import {Icon} from './Icon.jsx';
import {GLASS_PRESETS,GlassControlScene} from './Glass.jsx';

// Interaction prototype only: this screen never opens or records the microphone.
export function VoiceConversation({onClose}){
  const [muted,setMuted]=useState(false),panelRef=useRef(null);
  useEffect(()=>{panelRef.current?.focus({preventScroll:true});},[]);
  function trapFocus(event){
    if(event.key!=='Tab')return;
    const items=[...panelRef.current.querySelectorAll('button')],first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===panelRef.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  return <section ref={panelRef} className={`voice-panel${muted?' is-muted':''}`} role="dialog" aria-modal="true" aria-labelledby="voice-title" aria-describedby="voice-demo-note" tabIndex={-1} onKeyDown={trapFocus}>
    <header className="voice-heading"><h1 id="voice-title">Голосовой чат</h1><span>Демо</span></header>
    <div className="voice-presence">
      <div className="voice-mascot"><AnimatedMascot surface="voice" emotion={muted?'resting':'listening'}/></div>
      <p className="voice-status" role="status">{muted?'Микрофон выключен':'Поговорим?'}</p>
    </div>
    <footer className="voice-footer">
      <div className="voice-controls">
        <div className="voice-control"><GlassControlScene className="voice-control-scene"><GlassButton {...GLASS_PRESETS.navigation} size="icon" className="voice-mic" aria-label="Выключить микрофон" aria-pressed={muted} onClick={()=>setMuted(value=>!value)}><Icon name={muted?'microphone-slash':'microphone'}/></GlassButton></GlassControlScene><span>{muted?'Выключен':'Микрофон'}</span></div>
        <div className="voice-control"><button className="voice-end" aria-label="Завершить голосовой чат" onClick={onClose}><Icon name="call-slash"/></button><span>Завершить</span></div>
      </div>
      <p id="voice-demo-note">Демо-режим · запись голоса не ведётся</p>
    </footer>
  </section>;
}
