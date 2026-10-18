import {useEffect,useLayoutEffect,useRef} from 'react';
import {GlassSurface,GlassButton} from '@glass-sdk/liquid-glass';
import {Icon} from './Icon.jsx';
import {HealthMascot} from './HealthMascot.jsx';
import {GLASS_PRESETS,GlassControlScene} from './Glass.jsx';

export function ChatView({chat,active,motionActive=active,onSend,onRemoveContext,onClearContext,notification,onOpenHero}){
  const bodyRef=useRef(null);
  useEffect(()=>{if(active)bodyRef.current?.scrollTo({top:chat.messages.length||chat.pending?bodyRef.current.scrollHeight:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[chat.id,chat.messages.length,chat.pending,active]);
  return <section className="chat-panel" id="chat-panel" role="tabpanel" aria-labelledby="tab-chat" aria-hidden={!active} inert={!active}>
    <div className="chat-body" data-interaction-hint="scroll" ref={bodyRef}><div className="conversation" aria-live="polite" aria-relevant="additions">{chat.messages.map((message,i)=><div className={`message ${message.role}`} key={i}>
      {message.role==='user'&&message.contexts?.length>0&&<div className="message-context">{message.contexts.map(c=><span key={c.id}>{c.title}</span>)}</div>}<span>{message.text}</span>
    </div>)}{chat.pending>0&&<div className="message assistant"><span className="typing" aria-label="Помощник готовит ответ"><i/><i/><i/></span></div>}</div>
      {chat.messages.length===0&&<div className="empty-chat"><HealthMascot active={motionActive} onOpen={onOpenHero} notification={notification}/><div className="mascot-caption"><p>{notification?'Анализы готовы':'Чем помочь?'}</p></div></div>}
    </div>

  </section>;
}
export function Composer({visible,active=visible,chat,onDraft,onSend,onAttach,onRemoveContext,onClearContext,onSize,inputRef}){
  const dockRef=useRef(null);
  useLayoutEffect(()=>{
    const dock=dockRef.current;
    const measure=()=>{if(dock.offsetHeight)onSize(dock.offsetHeight);};
    measure();const observer=new ResizeObserver(measure);observer.observe(dock);
    return()=>observer.disconnect();
  },[onSize]);
  let prompts=['Как я сегодня?','Добавить самочувствие'];
  if(chat.contexts.some(c=>c.id==='labs'))prompts=['Что нужно подготовить?','Что назначил врач?'];
  else if(chat.contexts.some(c=>c.kind==='metric'))prompts=['Покажи динамику','Что изменилось?'];
  else if(chat.contexts.length)prompts=['Объясни этот контекст','Помоги составить вопросы'];
  return <div className="chat-dock" id="chat-dock" ref={dockRef} hidden={!visible} inert={!active} aria-hidden={!active}>
    {chat.contexts.length>0&&<div className="context-zone has-items" aria-label="Контекст разговора"><div className="context-heading"><span>Контекст · {chat.contexts.length}</span><button aria-label="Убрать весь контекст" onClick={onClearContext}><Icon name="trash"/></button></div><div className="context-list">{chat.contexts.map(item=>{
      const label=item.kind==='metric'?`${item.title} · ${item.value}`:item.kind==='file'?item.title:`${item.title} · ${(item.meta||'').split(' · ')[0]}`;
      return <div className="context-chip" key={item.id} title={label}>{item.preview&&<img src={item.preview} alt=""/>}<strong>{label}</strong><button aria-label={`Убрать ${item.title} из контекста`} onClick={()=>onRemoveContext(item.id)}><Icon name="close"/></button></div>;
    })}</div></div>}
    {!chat.messages.length&&<div className="suggestions">{prompts.map(prompt=><div key={prompt} className="glass-suggestion-scene"><GlassButton {...GLASS_PRESETS.navigation} className="glass-suggestion" onClick={()=>onSend(prompt)}>{prompt}</GlassButton></div>)}</div>}
    <GlassSurface {...GLASS_PRESETS.navigation} className="composer glass-composer" render={<form aria-label="Сообщение AI-помощнику" onSubmit={event=>{event.preventDefault();onSend(chat.draft);}}/>}>
      <button type="button" disabled title="Вне сценария тестового" aria-label="Прикрепить файл" onClick={onAttach}><Icon name="add"/></button>
      <input ref={inputRef} value={chat.draft} onChange={event=>onDraft(event.target.value)} autoComplete="off" placeholder="Спросить помощника…" aria-label="Сообщение помощнику"/>
      <button type="submit" aria-label="Отправить сообщение" disabled={!chat.draft.trim()}><Icon name="up"/></button>
    </GlassSurface>
  </div>;
}
export function HistoryDrawer({layerRef,drawerRef,chats,chatId,onClose,onSection,onNew,onSwitch}){
  return <div className="history-layer" id="history-layer" ref={layerRef} aria-hidden="true" hidden>
    <section className="history-drawer" id="history-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="history-title" tabIndex={-1} inert>
      <div className="history-heading"><h2 id="history-title">Чаты</h2><button id="close-history" aria-label="Закрыть панель" onClick={onClose}><Icon name="chevron-right"/></button></div>
      <div className="history-scroll">
        <button className="history-records" onClick={()=>onSection('records')}><Icon name="record"/><span>Медкарта</span><Icon name="chevron-right"/></button>
        <div className="history-list">{chats.map(chat=><button className="history-chat" key={chat.id} aria-current={chat.id===chatId?'true':undefined} onClick={()=>onSwitch(chat.id)}><strong>{chat.title}</strong><small>{chat.date.replace('октября','окт')}</small></button>)}</div>
      </div>
      <GlassControlScene className="new-chat-scene"><GlassButton {...GLASS_PRESETS.navigation} size="icon" className="new-chat" aria-label="Новый чат" title="Новый чат" onClick={onNew}><Icon name="add"/></GlassButton></GlassControlScene>
    </section>
  </div>;
}
