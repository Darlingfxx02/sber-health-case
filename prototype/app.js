import {createActivity,activityContext,renderActivityDetail} from './activity.js';
import {finishDocumentTransition,transitionDocuments} from './document-morph.js';
import {createHistoryGesture} from './history-gesture.js';
import {createHealthOverview,renderHealthMetricDetail} from './health-overview.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const device = $('#device'), panel = $('#chat-panel'), home = $('#home-scroll');
const makeChats=()=>[
  {id:'chat-current',title:'Новый чат',date:'Сегодня',messages:[],contexts:[],draft:'',pending:0},
  {id:'chat-visit',title:'Вопросы к терапевту',date:'12 октября',messages:[{role:'user',text:'Помоги собрать вопросы к следующему приёму.'},{role:'assistant',text:'Можно обсудить результаты последних анализов, назначения и план наблюдения. Что хотелось бы уточнить в первую очередь?'}],contexts:[],draft:'',pending:0},
  {id:'chat-records',title:'Мои медицинские документы',date:'2 октября',messages:[{role:'user',text:'Где посмотреть заключение после приёма?'},{role:'assistant',text:'Заключение терапевта от 2 октября находится в медкарте. Откройте документ и нажмите «Обсудить», чтобы добавить его к разговору.'}],contexts:[],draft:'',pending:0}
];
const state = {homeMode:'assistant', overviewScroll:0, contexts:[], messages:[], chats:makeChats(),chatId:'chat-current',historyOpen:false,replyTimers:new Set(), fileUrls:new Set(), selected:null, range:7,section:'home',resultIndex:1};
const cards = [
  {id:'labs',group:'actions',kind:'action',title:'Контрольные анализы',description:'Общий анализ крови<br>Ферритин',eyebrow:'ЗАВТРА · 08:30',meta:'17 октября · 08:30',source:'Назначение терапевта от 02.10'},
  {id:'appointment',group:'actions',kind:'action',title:'Приём терапевта',description:'Обсудить результаты<br>и план наблюдения',eyebrow:'22 ОКТЯБРЯ',meta:'22 октября · 16:00'},
  {id:'document',group:'documents',kind:'wide',title:'Заключение терапевта',description:'Рекомендации и назначения',eyebrow:'МОЯ МЕДКАРТА',meta:'2 октября · PDF, 2 страницы',source:'Демонстрационный документ'}
];
const results = [
  {id:'result-blood',kind:'result',title:'Общий анализ крови',meta:'16 октября · PDF',preview:'assets/results/blood.svg',color:'#64A989'},
  {id:'result-ferritin',kind:'result',title:'Ферритин',meta:'16 октября · PDF',preview:'assets/results/ferritin.svg',color:'#6A95D1'},
  {id:'result-vitamin-d',kind:'result',title:'Витамин D',meta:'16 октября · PDF',preview:'assets/results/vitamin-d.svg',color:'#A18DC6'}
];
const icon = name => `<span class="icon" style="--icon:url('assets/iconsax/${name}.svg')" aria-hidden="true"></span>`;
$$('[data-icon]').forEach(el=>{el.style.setProperty('--icon',`url('assets/iconsax/${el.dataset.icon}.svg')`);el.setAttribute('aria-hidden','true');});
const cardPresentation = {
  labs:{icon:'labs',title:'Анализы',meta:'Завтра, 08:30'},
  appointment:{icon:'calendar',title:'Терапевт',meta:'22 октября, 16:00'},
  document:{icon:'document',title:'Заключение терапевта',meta:'2 октября'}
};
function escape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2200);}
function setMode(mode){device.classList.toggle('is-wireframe',mode==='wireframe');$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
function fit(){const available=window.innerHeight-(window.innerWidth>1000?86:120);document.documentElement.style.setProperty('--scale',Math.min(1,Math.max(.4,available/874)));}
window.addEventListener('resize',()=>{finishDocumentTransition();fit();});fit();
function renderCards(){for(const card of cards.filter(card=>card.group==='documents')){const visual=cardPresentation[card.id];const button=document.createElement('button');button.className='card '+card.kind;button.dataset.cardId=card.id;button.setAttribute('aria-label',`${card.title}${card.value?', '+card.value:''}. Открыть подробности`);button.innerHTML=`<span class="card-content"><span class="card-symbol">${icon(visual.icon)}</span><span class="card-copy"><span class="card-title">${visual.title}</span>${visual.value?`<span class="card-value">${visual.value}</span>`:''}${visual.meta?`<span class="card-meta">${visual.meta}</span>`:''}</span></span>`;$('#'+card.group).append(button);
    button.addEventListener('click',()=>showDetail(card));
  }}
renderCards();
const healthOverview=createHealthOverview({container:$('#actions'),onOpenMetric:showDetail,onOpenCare:showDetail,onOpenRecord:id=>showDetail(cards.find(card=>card.id===id))});
function openActivityDay(day){showDetail(activityContext(day));}
const activityHistory=createActivity({container:$('#metrics'),onOpenDay:openActivityDay});
function selectResult(index){
  state.resultIndex=Math.max(0,Math.min(results.length-1,index));
  $$('.result-file').forEach((el,i)=>{el.classList.toggle('is-selected',i===state.resultIndex);el.setAttribute('aria-pressed',String(i===state.resultIndex));});
}
function renderResults(){
  const block=document.createElement('section');block.className='results-block';block.setAttribute('aria-label','Готовые анализы');
  block.innerHTML=`<span class="overview-surface-tint" aria-hidden="true"></span><div class="results-heading"><h2 id="results-title">Обзор здоровья</h2></div><div class="file-fan" aria-label="Выберите анализ"></div>`;
  $('#insights').append(block);
  $('.results-heading',block).append($('#overview-toggle'));
  results.forEach((item,index)=>{
    const button=document.createElement('button');button.className='result-file';button.dataset.resultId=item.id;button.setAttribute('aria-label',item.title);
    const offset=index-(results.length-1)/2;
    button.style.setProperty('--file-index',String(index));
    button.style.setProperty('--fan-x',`${offset*68}px`);button.style.setProperty('--fan-angle',`${offset*13}deg`);button.style.setProperty('--fan-order',String(index+1));
    button.innerHTML=`<svg class="document-simple" viewBox="0 0 152 194" fill="none" aria-hidden="true"><path d="M13 1H113L151 38V181Q151 193 139 193H13Q1 193 1 181V13Q1 1 13 1Z" fill="#fff" stroke="#DAE0E5"/><path d="M113 1V27Q113 38 124 38H151" fill="#F3F5F7" stroke="#DAE0E5"/></svg><img src="${item.preview}" alt="" draggable="false"><span class="document-dot" style="background:${item.color}" aria-hidden="true"></span>`;
    button.addEventListener('click',()=>{selectResult(index);showDetail(item);});button.addEventListener('focus',()=>selectResult(index));
    button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')selectResult(index);});
    $('.file-fan',block).append(button);
  });
  $('.file-fan',block).addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectResult(state.resultIndex+(event.key==='ArrowRight'?1:-1));$$('.result-file')[state.resultIndex].focus({preventScroll:true});}});
  selectResult(state.resultIndex);
}
renderResults();
function renderView(){
  const isHome=state.section==='home';
  const assistant=isHome&&state.homeMode==='assistant';
  device.classList.toggle('assistant-mode',assistant);
  device.classList.toggle('overview-mode',isHome&&!assistant);
  panel.hidden=!assistant;panel.inert=!assistant;panel.setAttribute('aria-hidden',String(!assistant));
  $('#chat-form').inert=!assistant;$('#chat-form').setAttribute('aria-hidden',String(!assistant));
  $('#open-chat').inert=assistant;$('#open-chat').setAttribute('aria-hidden',String(assistant));
  $('#health-overview').hidden=assistant;
  $('.results-block').classList.toggle('is-collapsed',assistant);
  $('.file-fan').inert=assistant;$('.file-fan').setAttribute('aria-hidden',String(assistant));
  $('#metrics').hidden=!isHome;
  $('.home-header').hidden=!isHome;
  $('#actions').hidden=!isHome;
  $('#documents').hidden=isHome;
  $('#overview-toggle').hidden=!isHome;
  $('#overview-toggle').setAttribute('aria-expanded',String(isHome&&!assistant));
  $('#overview-toggle').setAttribute('aria-label',assistant?'Раскрыть обзор здоровья':'Свернуть обзор здоровья');
  $('#results-title').hidden=isHome;
  $('#results-title').textContent=isHome?'Обзор здоровья':'Анализы';
  $('#section-heading').hidden=isHome;$('#section-title').textContent='Медкарта';$('#add-file').hidden=isHome;
  $$('.history-sections [data-section]').forEach(button=>{
    const active=button.dataset.section==='records'?!isHome:isHome&&!assistant;
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
}
function rememberOverviewPosition(){if(state.section==='home'&&state.homeMode==='overview')state.overviewScroll=home.scrollTop;}
function setHomeMode(mode){
  finishDocumentTransition();
  rememberOverviewPosition();hideDetail();state.section='home';state.homeMode=mode;
  if(mode!=='assistant')$('#message-input').blur();
  renderView();home.scrollTo({top:mode==='overview'?state.overviewScroll:0,behavior:'instant'});
  if(mode==='assistant')scrollChat();
}
$('#overview-toggle').addEventListener('click',()=>{
  const next=state.homeMode==='assistant'?'overview':'assistant';
  transitionDocuments({device,items:results,expanded:state.homeMode==='overview',update:()=>{if(next==='overview')state.overviewScroll=0;setHomeMode(next);$('#overview-toggle').focus({preventScroll:true});}});
});
$('#open-chat').addEventListener('click',()=>{
  const rect=$('.results-block').getBoundingClientRect(),homeRect=home.getBoundingClientRect();
  const update=()=>{setHomeMode('assistant');$('#message-input').focus({preventScroll:true});};
  if(state.section==='home'&&state.homeMode==='overview'&&rect.top>=homeRect.top)transitionDocuments({device,items:results,expanded:true,update});
  else update();
});
$('#message-input').addEventListener('input',()=>$('#send-message').disabled=!$('#message-input').value.trim());
function addContext(item,{notify=true}={}){if(state.contexts.some(c=>c.id===item.id)){if(notify)toast('Эта карточка уже в контексте');return false;}state.contexts.push({...item});renderContexts();return true;}
function removeContext(id){state.contexts=state.contexts.filter(c=>c.id!==id);renderContexts();}
function renderContexts(){const count=state.contexts.length;$('#context-zone').hidden=!count;$('#context-filled').hidden=!count;$('#context-zone').classList.toggle('has-items',!!count);panel.classList.toggle('has-context',!!count);$('#context-count').textContent=`Контекст · ${count}`;$('#dock-count').hidden=!count;$('#dock-count').textContent=count;
  $('#context-list').replaceChildren();for(const item of state.contexts){const chip=document.createElement('div');chip.className='context-chip';if(item.preview){const img=document.createElement('img');img.src=item.preview;img.alt='';chip.append(img);}const title=document.createElement('div');const label=item.kind==='metric'?`${item.title} · ${item.value}`:item.kind==='file'?item.title:`${item.title} · ${(item.meta||'').split(' · ')[0]}`;title.innerHTML=`<strong>${escape(label)}</strong>`;chip.title=label;chip.append(title);const remove=document.createElement('button');remove.innerHTML=icon('close');remove.setAttribute('aria-label',`Убрать ${item.title} из контекста`);remove.addEventListener('click',()=>removeContext(item.id));chip.append(remove);$('#context-list').append(chip);}
  $$('.card').forEach(el=>{const exists=state.contexts.some(c=>c.id===el.dataset.cardId);el.classList.toggle('is-context',exists);});
  renderSuggestions();
}
$('#clear-context').addEventListener('click',()=>{state.contexts=[];renderContexts();});
function renderSuggestions(){const el=$('#suggestions');el.replaceChildren();el.hidden=state.messages.length>0;let prompts=['Как я сегодня?','Добавить самочувствие'];if(state.contexts.some(c=>c.id==='labs'))prompts=['Что нужно подготовить?','Что назначил врач?'];else if(state.contexts.some(c=>c.kind==='metric'))prompts=['Покажи динамику','Что изменилось?'];else if(state.contexts.length)prompts=['Объясни этот контекст','Помоги составить вопросы'];for(const prompt of prompts){const b=document.createElement('button');b.textContent=prompt;b.addEventListener('click',()=>sendMessage(prompt));el.append(b);}}
renderContexts();
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(state.historyOpen)setHistoryOpen(false);else if($('#detail-panel').classList.contains('open'))hideDetail();else if(state.section==='home'&&state.homeMode==='assistant')setHomeMode('overview');}
  if(event.key==='Tab'&&state.historyOpen){const buttons=$$('button', $('#history-drawer'));const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('#history-drawer'))){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
function scrollChat(){requestAnimationFrame(()=>{if(!panel.hidden)$('#chat-body').scrollTo({top:$('#chat-body').scrollHeight,behavior:'smooth'});});}
function appendMessage(role,text,context=[]){const msg=document.createElement('div');msg.className=`message ${role}`;if(role==='user'&&context.length){const labels=document.createElement('div');labels.className='message-context';context.forEach(c=>{const label=document.createElement('span');label.textContent=c.title;labels.append(label);});msg.append(labels);}const body=document.createElement('span');body.textContent=text;msg.append(body);$('#conversation').append(msg);$('#empty-chat').hidden=true;scrollChat();return msg;}
function demoReply(prompt,context){const files=context.filter(c=>c.kind==='file');const metrics=context.filter(c=>c.kind==='metric');if(files.length)return `В контексте ${files.length===1?'добавлен файл':'добавлены файлы'}: ${files.map(c=>c.title).join(', ')}.\n\nФайл доступен в этом разговоре. В демонстрационном режиме содержимое документов не анализируется. Можно проверить добавление, удаление и сочетание файлов с карточками.`;
  if(context.some(c=>c.kind==='result'))return `В контексте: ${context.filter(c=>c.kind==='result').map(c=>c.title).join(', ')}. Это демонстрационные документы от 16 октября. Можно обсудить каждый отдельно или добавить другие результаты.`;
  if(context.some(c=>c.id==='labs'))return 'В карточке на завтра, 17 октября в 08:30, указаны общий анализ крови и ферритин. Источник — назначение терапевта от 2 октября.\n\nВ самой карточке инструкции по подготовке нет. Добавьте памятку лаборатории, чтобы связать её с назначением.';
  if(metrics.length)return metrics.map(c=>`${c.title}: ${c.value}.`).join('\n')+'\n\nОткройте показатель на главной, чтобы посмотреть дни на графике. Отдельный день тоже можно добавить в контекст разговора.';
  if(context.length)return `В разговоре учитываются: ${context.map(c=>c.title).join(', ')}.\n\nМожно сопоставить эти записи, уточнить даты и подготовить вопросы для следующего приёма. О чём хотите узнать подробнее?`;
  if(/самочувств|чувствую/i.test(prompt))return 'Расскажите, как вы себя чувствуете и когда заметили изменение. Можно добавить показатель активности или документ, чтобы связать вопрос с конкретными данными.';
  return 'На главной — история активности по дням. Ближайшее событие — контрольные анализы завтра.\n\nОткройте нужную карточку и нажмите «Обсудить», чтобы добавить её к вопросу.';}
function sendMessage(value){
  const prompt=value.trim();if(!prompt)return;setHomeMode('assistant');
  const context=state.contexts.map(c=>({...c}));
  state.messages.push({role:'user',text:prompt,contexts:context});
  $('#message-input').value='';$('#send-message').disabled=true;
  saveCurrentChat();const thread=currentChat();thread.pending++;renderConversation();renderSuggestions();
  const timer=setTimeout(()=>{state.replyTimers.delete(timer);thread.pending--;thread.messages.push({role:'assistant',text:demoReply(prompt,context)});if(state.chatId===thread.id)renderConversation();if(state.historyOpen)renderHistory();},650);
  state.replyTimers.add(timer);
}
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();sendMessage($('#message-input').value);});
function pickFile(){setHomeMode('assistant');$('#file-input').click();}
$('#add-file').addEventListener('click',pickFile);$('#attach-in-chat').addEventListener('click',pickFile);
let fileId=0;$('#file-input').addEventListener('change',event=>{const files=[...event.target.files];for(const file of files){const item={id:'file-'+(++fileId),kind:'file',title:file.name,meta:`${file.type.startsWith('image/')?'Изображение':'Документ'} · ${Math.max(1,Math.round(file.size/1024))} КБ`};if(file.type.startsWith('image/')){item.preview=URL.createObjectURL(file);state.fileUrls.add(item.preview);}addContext(item,{notify:false});}if(files.length)toast(files.length===1?'Файл добавлен в контекст':`Добавлено файлов: ${files.length}`);event.target.value='';});
let detailReturnFocus=null;
function showDetail(card){finishDocumentTransition();if(!$('#detail-panel').classList.contains('open'))detailReturnFocus=document.activeElement;state.selected={card,index:6};state.range=7;const detail=$('#detail-panel');home.inert=true;$('#chat-dock').hidden=device.classList.contains('assistant-mode');detail.inert=false;detail.setAttribute('aria-hidden','false');detail.classList.add('open');renderDetail();$('#detail-back').focus({preventScroll:true});}
function hideDetail(){const detail=$('#detail-panel');const wasOpen=detail.classList.contains('open');detail.classList.remove('open');detail.inert=true;detail.setAttribute('aria-hidden','true');home.inert=false;$('#chat-dock').hidden=false;if(wasOpen&&detailReturnFocus?.isConnected)detailReturnFocus.focus({preventScroll:true});}
function formatMetric(card,value){return `${value.toLocaleString('ru-RU')} ${card.unit||''}`.trim();}
function renderDetail(){const {card,index}=state.selected;const metric=card.kind==='metric';const detail=$('#detail-panel');detail.innerHTML=`<div class="detail-head"><button id="detail-back" aria-label="Назад" title="Назад">${icon('back')}</button><button id="detail-add-top" aria-label="Добавить в чат" title="Добавить в чат">${icon('chat')}</button></div><h1 class="detail-title">${escape(card.title)}</h1>`;
  if(metric&&card.series){renderHealthMetricDetail({container:detail,metric:card,onSelect:item=>state.selected.item=item});
  }else if(card.kind==='care'){healthOverview.renderCareDetail({container:detail,onSelect:item=>state.selected.item=item});
  }else if(metric){const values=state.range===7?card.values:card.values.map((v,i)=>Math.round(v*(1+(i%3-1)*.06)));const labels=state.range===7?['10','11','12','13','14','15','16']:['20','24','28','2','6','10','16'];const value=values[index];const valueNode=document.createElement('div');valueNode.className='detail-value';valueNode.textContent=formatMetric(card,value);detail.append(valueNode);const sub=document.createElement('p');sub.className='detail-sub';sub.textContent=state.range===7?`${labels[index]} октября`:'Последние 30 дней';detail.append(sub);
    const ranges=document.createElement('div');ranges.className='range-control';ranges.setAttribute('aria-label','Период графика');for(const range of [7,30]){const b=document.createElement('button');b.textContent=`${range} дней`;b.setAttribute('aria-pressed',String(range===state.range));b.addEventListener('click',()=>{state.range=range;renderDetail();});ranges.append(b);}detail.append(ranges);
    const chart=document.createElement('div');chart.className='chart';chart.setAttribute('aria-label','График показателя');const max=Math.max(...values)*1.12;values.forEach((v,i)=>{const b=document.createElement('button');b.className='chart-day';b.setAttribute('aria-label',`${labels[i]}: ${formatMetric(card,v)}`);b.setAttribute('aria-pressed',String(i===index));b.innerHTML=`<span class="chart-bar" style="height:${Math.round(v/max*160)}px;animation-delay:${i*30}ms"></span><small>${labels[i]}</small>`;b.addEventListener('click',()=>{state.selected.index=i;renderDetail();});chart.append(b);});detail.append(chart);
    state.selected.item={...card,id:`${card.id}-${state.range}-${index}`,title:`${card.title} · ${labels[index]} ${state.range===7?'октября':'числа'}`,value:formatMetric(card,value),meta:state.range===7?`${labels[index]} октября · выбранный день`:'Обзор за 30 дней'};
  }else if(card.kind==='activity'){
    renderActivityDetail({container:detail,day:card.day,onOpenDay:openActivityDay});state.selected.item=card;
  }else if(card.kind==='result'){
    const date=document.createElement('p');date.className='detail-sub';date.textContent=card.meta;detail.append(date);
    const preview=document.createElement('img');preview.className='result-detail-preview';preview.src=card.preview;preview.alt=`Демонстрационный документ: ${card.title}`;preview.draggable=false;detail.append(preview);state.selected.item=card;
  }else{const list=document.createElement('ul');list.className='detail-list';const items=card.id==='labs'?['17 октября, 08:30','Общий анализ крови · ферритин','Назначение терапевта от 2 октября']:card.id==='appointment'?['22 октября, 16:00','Обсудить результаты анализов','Подготовить вопросы о дальнейшем наблюдении']:card.id==='document'?['Приём терапевта · 2 октября','Рекомендации и назначения','Демонстрационная карточка документа']:['Контрольные анализы завтра в 08:30','Вопросы и документы можно добавить в чат'];for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li);}detail.append(list);state.selected.item=card;}
  const add=document.createElement('button');add.className='detail-cta';add.innerHTML=icon('chat')+'<span>Обсудить</span>';const handle=()=>{addContext(state.selected.item);setHomeMode('assistant');$('#message-input').focus({preventScroll:true});};add.addEventListener('click',handle);detail.append(add);$('#detail-add-top').addEventListener('click',handle);$('#detail-back').addEventListener('click',hideDetail);
}
function setSection(section){
  finishDocumentTransition();
  if(section==='home'){setHomeMode('overview');return;}
  rememberOverviewPosition();hideDetail();state.section=section;$('#message-input').blur();renderView();
  home.scrollTo({top:0,behavior:'instant'});
}
$$('.history-sections [data-section]').forEach(button=>button.addEventListener('click',()=>{setHistoryOpen(false);setSection(button.dataset.section);}));
$('#profile').addEventListener('click',()=>toast('Тимофей · демонстрационный профиль'));
function currentChat(){return state.chats.find(chat=>chat.id===state.chatId);}
function saveCurrentChat(){const chat=currentChat();chat.messages=state.messages;chat.contexts=state.contexts;chat.draft=$('#message-input').value;const first=chat.messages.find(message=>message.role==='user');if(first&&(chat.id.startsWith('chat-new')||chat.id==='chat-current'))chat.title=first.text.slice(0,48)+(first.text.length>48?'…':'');}
function renderConversation(){
  $('#conversation').replaceChildren();$('#empty-chat').hidden=state.messages.length>0;
  for(const message of state.messages)appendMessage(message.role,message.text,message.contexts||[]);
  if(currentChat().pending){const typing=document.createElement('div');typing.className='message assistant';typing.innerHTML='<span class="typing" aria-label="Помощник готовит ответ"><i></i><i></i><i></i></span>';$('#conversation').append(typing);}
  scrollChat();
}
function switchChat(id){
  saveCurrentChat();state.chatId=id;const chat=currentChat();state.contexts=chat.contexts;state.messages=chat.messages;
  $('#message-input').value=chat.draft;$('#send-message').disabled=!chat.draft.trim();
  setHistoryOpen(false);setHomeMode('assistant');renderContexts();renderConversation();
}
function renderHistory(){
  saveCurrentChat();const list=$('#history-list');list.replaceChildren();
  for(const chat of state.chats){const button=document.createElement('button');button.className='history-chat';button.dataset.chatId=chat.id;button.innerHTML=`${icon('chat')}<span><strong>${escape(chat.title)}</strong><small>${escape(chat.date)}</small></span>`;if(chat.id===state.chatId)button.setAttribute('aria-current','true');button.addEventListener('click',()=>switchChat(chat.id));list.append(button);}
}
let historyReturnFocus=null,chatSequence=0;
const historyGesture=createHistoryGesture({
  device,surface:$('#page-surface'),layer:$('#history-layer'),drawer:$('#history-drawer'),
  onPrepare(){finishDocumentTransition();historyReturnFocus=document.activeElement;renderHistory();},
  onChange(open){state.historyOpen=open;},
  onSettled(open){
    if(open)$('#close-history').focus({preventScroll:true});
    else if($('#history-drawer').contains(document.activeElement)||document.activeElement===document.body){
      const target=historyReturnFocus?.isConnected&&historyReturnFocus.getClientRects().length&&!historyReturnFocus.closest('[inert],[hidden]')?historyReturnFocus:$('#page-surface');
      target.focus({preventScroll:true});
    }
  }
});
function setHistoryOpen(open){historyGesture.setOpen(open);}
$('#close-history').addEventListener('click',()=>setHistoryOpen(false));
$('#new-chat').addEventListener('click',()=>{const chat={id:`chat-new-${++chatSequence}`,title:'Новый чат',date:'Сегодня',messages:[],contexts:[],draft:'',pending:0};state.chats.unshift(chat);switchChat(chat.id);});

$('#reset').addEventListener('click',()=>{for(const timer of state.replyTimers)clearTimeout(timer);state.replyTimers.clear();for(const url of state.fileUrls)URL.revokeObjectURL(url);state.fileUrls.clear();setHistoryOpen(false);state.chats=makeChats();state.chatId='chat-current';state.contexts=currentChat().contexts;state.messages=currentChat().messages;state.selected=null;$('#conversation').replaceChildren();$('#empty-chat').hidden=false;$('#message-input').value='';$('#send-message').disabled=true;setHomeMode('assistant');state.overviewScroll=0;renderContexts();activityHistory.reset();healthOverview.reset();selectResult(1);toast('Прототип сброшен');});
renderView();
requestAnimationFrame(()=>requestAnimationFrame(()=>device.classList.add('chat-motion-ready')));
setMode(new URLSearchParams(location.search).get('mode')==='wireframe'?'wireframe':'content');
