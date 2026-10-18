import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {GlassScene,GlassContent} from '@glass-sdk/liquid-glass';
import {useGlassDiagnostics} from './components/Glass.jsx';
import {AppHeader} from './components/AppHeader.jsx';
import {ChatView,Composer,HistoryDrawer} from './components/Chat.jsx';
import {Widgets} from './components/Widgets.jsx';
import {DetailPanel} from './components/Details.jsx';
import {ProfileSettings} from './components/ProfileSettings.jsx';
import {VoiceConversation} from './components/VoiceConversation.jsx';
import {readStartView,saveStartView} from './preferences.js';
import {useHistoryDrawer} from './hooks/useHistoryDrawer.js';
import {makeChats,demoReply,RESULTS,ACTIVITY_DAYS,metricsForDay} from './data.js';
import {useCaseBridge} from './hooks/useCaseBridge.js';
import {canOpenDetail} from './case-scope.js';
import {usePulseNavigation} from './hooks/usePulseNavigation.js';
import {InteractionHints} from './components/InteractionHints.jsx';

export function App(){
  const [startView,setStartView]=useState(readStartView),[profileOpen,setProfileOpen]=useState(false);
  const [voiceOpen,setVoiceOpen]=useState(false);
  const [view,setView]=useState(startView),[section,setSection]=useState('home'),[chats,setChats]=useState(makeChats),[chatId,setChatId]=useState('chat-current');
  const [planned,setPlanned]=useState(null),[toast,setToast]=useState('');
  const [pendingDocument,setPendingDocument]=useState(null);
  const [wireframe,setWireframe]=useState(new URLSearchParams(location.search).get('mode')==='wireframe'),[resetKey,setResetKey]=useState(0);
  const deviceRef=useRef(null),surfaceRef=useRef(null),trackRef=useRef(null),layerRef=useRef(null),drawerRef=useRef(null),homeRef=useRef(null),inputRef=useRef(null),fileRef=useRef(null);
  const {detail,setDetail,open:showDetail,close:hideDetail}=usePulseNavigation(deviceRef);
  const scrollPosition=useRef(0),detailContext=useRef(null),detailReturn=useRef(null),profileReturn=useRef(null),voiceReturn=useRef(null),timers=useRef(new Set()),fileUrls=useRef(new Set()),sequence=useRef(0);
  const {diagnostic}=useGlassDiagnostics(surfaceRef);
  const [dockHeight,setDockHeight]=useState(118);
  const overlayOpen=Boolean(detail)||profileOpen||voiceOpen;
  const history=useHistoryDrawer({deviceRef,surfaceRef,trackRef,layerRef,drawerRef,onView:applyView,disabled:overlayOpen,initialView:startView,allowHistory:false});
  const chat=chats.find(item=>item.id===chatId)||chats[0];
  const patchChat=useCallback((id,update)=>setChats(items=>items.map(item=>item.id===id?update(item):item)),[]);
  const notify=useCallback(message=>setToast(message),[]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2300);return()=>clearTimeout(id);},[toast]);
  useEffect(()=>()=>{timers.current.forEach(clearTimeout);fileUrls.current.forEach(URL.revokeObjectURL);},[]);
  useLayoutEffect(()=>{
    const fit=()=>{
      if(new URLSearchParams(location.search).has('embed'))return;
      const available=window.innerHeight-(window.innerWidth>1000?86:120);
      deviceRef.current.parentElement.style.setProperty('--scale',String(Math.min(1,Math.max(.4,available/874))));
    };
    fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);
  },[]);
  useLayoutEffect(()=>{homeRef.current.scrollTop=section==='home'?scrollPosition.current:0;},[section,resetKey]);
  const closeDetail=useCallback(()=>hideDetail(()=>requestAnimationFrame(()=>{if(detailReturn.current?.isConnected&&!detailReturn.current.closest('[hidden],[inert]'))detailReturn.current.focus({preventScroll:true});})),[hideDetail]);
  const closeProfile=useCallback(()=>{setProfileOpen(false);requestAnimationFrame(()=>profileReturn.current?.focus({preventScroll:true}));},[]);
  const closeVoice=useCallback(()=>{setVoiceOpen(false);requestAnimationFrame(()=>{if(voiceReturn.current?.isConnected&&!voiceReturn.current.closest('[hidden],[inert]'))voiceReturn.current.focus({preventScroll:true});});},[]);
  useEffect(()=>{const key=e=>{if(e.key==='Escape'&&!history.open){if(voiceOpen)closeVoice();else if(profileOpen)closeProfile();else if(detail)closeDetail();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[detail,history.open,profileOpen,voiceOpen,closeDetail,closeProfile,closeVoice]);
  function applyView(next){setDetail(null);if(next!==view)setSection('home');setView(next);if(next!=='chat')inputRef.current?.blur();}
  function changeView(next){setSection('home');history.setView(next);}
  function openVoice(){return;/* Outside the assignment. */
voiceReturn.current=document.activeElement;inputRef.current?.blur();setVoiceOpen(true);}
  function openProfile(){return;/* Outside the assignment. */
profileReturn.current=document.activeElement;setProfileOpen(true);}
  function changeStartView(next){if(saveStartView(next)){setStartView(next);notify('Стартовый экран сохранён');}else notify('Не удалось сохранить настройку');}
  function openDetail(item){if(!canOpenDetail(item))return;if(!detail)detailReturn.current=document.activeElement;detailContext.current=item;showDetail(item);}
  function openHero(){
    if(pendingDocument){openDetail(pendingDocument);setPendingDocument(null);}
    else openVoice();
  }
  const selectContext=useCallback(item=>{detailContext.current=item;},[]);
  function discuss(){
    const item=detailContext.current;if(!item)return;
    patchChat(chat.id,c=>c.contexts.some(context=>context.id===item.id)?c:{...c,contexts:[...c.contexts,item]});
    changeView('chat');requestAnimationFrame(()=>inputRef.current?.focus({preventScroll:true}));
  }
  function sendMessage(value){
    const prompt=value.trim();if(!prompt)return;
    const context=chat.contexts.map(c=>({...c})),id=chat.id;
    patchChat(id,c=>({...c,title:c.messages.some(m=>m.role==='user')?c.title:prompt.slice(0,48)+(prompt.length>48?'…':''),messages:[...c.messages,{role:'user',text:prompt,contexts:context}],draft:'',pending:c.pending+1}));
    changeView('chat');
    const timer=setTimeout(()=>{timers.current.delete(timer);patchChat(id,c=>({...c,pending:Math.max(0,c.pending-1),messages:[...c.messages,{role:'assistant',text:demoReply(prompt,context)}]}));},650);
    timers.current.add(timer);
  }
  function switchChat(id){setChatId(id);changeView('chat');}
  function newChat(){const item={id:`chat-new-${++sequence.current}`,title:'Новый чат',date:'Сегодня',messages:[],contexts:[],draft:'',pending:0};setChats(items=>[item,...items]);switchChat(item.id);}
  function openSection(next){return;changeView('widgets');setSection(next);}
  function pickFile(){return;changeView('chat');fileRef.current.click();}
  function receiveFiles(event){
    const files=Array.from(event.target.files);if(!files.length)return;
    const items=files.map(file=>{
      const item={id:`file-${++sequence.current}`,kind:'file',title:file.name,meta:`${file.type.startsWith('image/')?'Изображение':'Документ'} · ${Math.max(1,Math.round(file.size/1024))} КБ`};
      if(file.type.startsWith('image/')){item.preview=URL.createObjectURL(file);fileUrls.current.add(item.preview);}return item;
    });
    patchChat(chat.id,c=>({...c,contexts:[...c.contexts,...items]}));notify(files.length===1?'Файл добавлен в контекст':`Добавлено файлов: ${files.length}`);event.target.value='';
  }
  function reset(){
    timers.current.forEach(clearTimeout);timers.current.clear();fileUrls.current.forEach(URL.revokeObjectURL);fileUrls.current.clear();history.setOpen(false);
    setChats(makeChats());setChatId('chat-current');history.setView(startView);setSection('home');setDetail(null);setProfileOpen(false);setVoiceOpen(false);setPlanned(null);setPendingDocument(null);scrollPosition.current=0;setResetKey(key=>key+1);notify('Прототип сброшен');
  }
  useCaseBridge({enter(state){
    timers.current.forEach(clearTimeout);timers.current.clear();
    const metric=metricsForDay(ACTIVITY_DAYS[0]).find(item=>item.id==='pulse');
    const chats=makeChats();const current=chats.find(item=>item.id==='chat-current');
    current.messages=[];current.contexts=[];current.draft='';current.pending=0;
    if(state==='chat-context')current.contexts=[{...metric,title:'Пульс · 15 октября',value:metric.value,meta:'Выбранный день'}];
    if(state==='chat-answer')current.messages=[{role:'user',text:'Помоги подготовить вопросы о пульсе',contexts:[]},{role:'assistant',text:'Соберём вопросы для обсуждения: как менялся пульс, что происходило в это время и какие измерения стоит показать врачу.'}];
    setChats(chats);setChatId('chat-current');setProfileOpen(false);setVoiceOpen(false);setWireframe(false);setSection('home');
    setPendingDocument(state==='notification'?RESULTS[0]:null);
    history.setView(state.startsWith('widgets')||state.startsWith('pulse')?'widgets':'chat');
    setResetKey(key=>key+1);scrollPosition.current=0;
    setDetail(state.startsWith('pulse')?metric:null);
  }});
  return <>
    <header className="workbench"><div><p className="overline">СБЕРЗДОРОВЬЕ / КОНЦЕПТ 02</p><p className="workbench-note">Демо</p></div><div className="workbench-actions"><a className="history-link" href="history/index.html" target="_blank" rel="noreferrer">История</a><div className="mode-switch" aria-label="Отображение прототипа"><button aria-pressed={wireframe} onClick={()=>setWireframe(true)}>Каркас</button><button aria-pressed={!wireframe} onClick={()=>setWireframe(false)}>С данными</button></div><button className="reset" onClick={reset}>Сбросить</button></div></header>
    <main className="stage"><div className="device-size"><section className={`device ${view==='chat'?'assistant-mode':'overview-mode'}${wireframe?' is-wireframe':''}${detail?.kind==='metric'?' metric-detail-open':''}${detail?' pulse-navigation-active':''}`} id="device" ref={deviceRef} data-overlay-open={overlayOpen||undefined} aria-label="Мобильный прототип помощника">
      <img className="status-bar" src="assets/status-bar.png" width="400" height="62" alt="9:41, мобильная сеть, Wi-Fi, заряд батареи"/>
      <GlassScene className="page-surface" id="page-surface" ref={surfaceRef} tabIndex={-1} material="regular" appearance="light" maxSurfaces={8} data-glass-state="loading" onDiagnostic={diagnostic} style={{'--chat-dock-height':`${dockHeight}px`}}>
        <AppHeader view={view} onView={changeView} onProfile={openProfile} onHistory={()=>history.setOpen(true)} disabled={overlayOpen}/>
        <GlassContent className="view-viewport" inert={overlayOpen}><div className="view-track" ref={trackRef}>
          <div className="view-page chat-page" inert={view!=='chat'} aria-hidden={view!=='chat'}>
            <ChatView chat={chat} active={view==='chat'} motionActive={view==='chat'&&!overlayOpen&&!history.open&&!wireframe} notification={pendingDocument} onOpenHero={openHero}/>
          </div>
          <div className="view-page widgets-page" inert={view!=='widgets'} aria-hidden={view!=='widgets'}>
            <div className="home-scroll" id="home-scroll" ref={homeRef} onScroll={e=>{if(view==='widgets'&&section==='home')scrollPosition.current=e.currentTarget.scrollTop;}}>
              <Widgets key={resetKey} active={view==='widgets'} motionActive={view==='widgets'&&!overlayOpen&&!history.open&&!wireframe} section={section} onOpen={openDetail} onAttach={pickFile} onVoice={openVoice} planned={planned}/>
            </div>
          </div>
        </div>
        </GlassContent>
        <div className="status-edge-blur" aria-hidden="true" hidden={overlayOpen}><i/><i/><i/></div>
        <div className="scroll-edge-wash scroll-edge-wash-top" aria-hidden="true" hidden={overlayOpen}/>
        <div className="scroll-edge-wash scroll-edge-wash-bottom" aria-hidden="true" hidden={overlayOpen}/>
        <Composer visible={!overlayOpen} active={view==='chat'&&!overlayOpen} chat={chat} onDraft={draft=>patchChat(chat.id,c=>({...c,draft}))} onSend={sendMessage} onAttach={pickFile} onRemoveContext={id=>patchChat(chat.id,c=>({...c,contexts:c.contexts.filter(item=>item.id!==id)}))} onClearContext={()=>patchChat(chat.id,c=>({...c,contexts:[]}))} onSize={setDockHeight} inputRef={inputRef}/>
        {detail&&<DetailPanel key={detail.id} item={detail} onClose={closeDetail} onDiscuss={discuss} onContext={selectContext} onOpen={openDetail} planned={planned} onPlan={setPlanned}/>}
        {profileOpen&&<ProfileSettings startView={startView} onChange={changeStartView} onClose={closeProfile}/>}
        {voiceOpen&&<VoiceConversation onClose={closeVoice}/>}
        <div className={`toast${toast?' visible':''}`} role="status">{toast}</div>
      </GlassScene>
      <HistoryDrawer layerRef={layerRef} drawerRef={drawerRef} chats={chats} chatId={chat.id} onClose={()=>history.setOpen(false)} onSection={openSection} onNew={newChat} onSwitch={switchChat}/>
      <img className="home-indicator" src="assets/home-indicator.png" width="400" height="34" alt=""/>
      <InteractionHints deviceRef={deviceRef} contextKey={`${view}:${detail?.id||''}:${resetKey}`}/>
      <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={receiveFiles} hidden/>
    </section></div></main>
  </>;
}
