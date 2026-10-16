const page=await figma.getNodeByIdAsync('26:54');await figma.setCurrentPageAsync(page);
const root=await figma.getNodeByIdAsync('26:80');
if(root.children.length) return {alreadyComposed:true,wrapperId:root.id,children:root.children.map(n=>({id:n.id,name:n.name}))};
const created=[],mutated=[root.id,page.id];const keep=n=>(created.push(n.id),n);
await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const localVars=await figma.variables.getLocalVariablesAsync();const vars=Object.fromEntries(localVars.filter(v=>v.variableCollectionId==='VariableCollectionId:27:56').map(v=>[v.name,v]));
const styles=Object.fromEntries((await figma.getLocalTextStylesAsync()).filter(s=>s.name.startsWith('Lo-fi/')).map(s=>[s.name.slice(6),s]));
const componentIds={'Button primary':'27:86','Button secondary':'27:88','Text action':'27:90','Medical card':'27:92','Metric':'27:97','Context item':'27:101','Flow label':'27:106'};
const comps={};await Promise.all(Object.entries(componentIds).map(async([k,id])=>{comps[k]=await figma.getNodeByIdAsync(id);}));
const status=await figma.importComponentByKeyAsync('51ddb19de206b67eae2d554b1d20c018feb754f4');
const homeSet=await figma.importComponentSetByKeyAsync('7aafe068eb8261b9aa743403f83769ae78800a38');
const home=homeSet.children.find(n=>n.name==='Device=iPhone, Orientation=Portrait');
const nativeFonts=[status,home].flatMap(n=>n.findAllWithCriteria({types:['TEXT']})).flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>s.fontName));
await Promise.all(nativeFonts.filter(Boolean).map(f=>figma.loadFontAsync(f)));
function paint(key,opacity=1){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity},'color',vars['color/'+key]);}
function setToken(n,key,value){n.setBoundVariable(key,vars[(key==='cornerRadius'?'radius/':'space/')+value]);}
function box(parent,name,dir='VERTICAL',settings={}){
  const n=keep(figma.createAutoLayout(dir));parent.appendChild(n);n.name=name;n.fills=settings.bg?[paint(settings.bg)]:[];
  if(settings.width){n.resize(settings.width,100);n.layoutSizingHorizontal='FIXED';}else n.layoutSizingHorizontal='FILL';
  n.layoutSizingVertical='HUG';if(settings.gap)setToken(n,'itemSpacing',settings.gap);
  if(settings.pad)for(const k of ['paddingTop','paddingRight','paddingBottom','paddingLeft'])setToken(n,k,settings.pad);
  if(settings.radius)setToken(n,'cornerRadius',settings.radius);
  if(settings.border){n.strokes=[paint('line')];n.strokeWeight=1;}
  if(dir==='HORIZONTAL')n.counterAxisAlignItems='CENTER';return n;
}
async function text(parent,name,value,style='body',opacity=1,fill=true,color='ink'){
  const t=keep(figma.createText());parent.appendChild(t);t.name=name;await t.setTextStyleIdAsync(styles[style].id);t.characters=value;t.fills=[paint(color,opacity)];
  t.textAutoResize=fill?'HEIGHT':'WIDTH_AND_HEIGHT';
  if(fill){t.resize(Math.max(1,parent.width-(parent.paddingLeft||0)-(parent.paddingRight||0)),24);t.layoutSizingHorizontal='FILL';}else t.layoutSizingHorizontal='HUG';
  t.layoutSizingVertical='HUG';return t;
}
function instance(parent,key,values={},fill=true){const c=comps[key];const n=keep(c.createInstance());parent.appendChild(n);n.name=key;
  const props={};for(const [label,value] of Object.entries(values)){const id=Object.keys(c.componentPropertyDefinitions).find(k=>k.split('#')[0]===label);if(id)props[id]=value;}n.setProperties(props);
  if(fill)n.layoutSizingHorizontal='FILL';else n.layoutSizingHorizontal='HUG';n.layoutSizingVertical='HUG';return n;}
function native(parent,comp,name){const n=keep(comp.createInstance());parent.appendChild(n);n.name=name;n.layoutSizingHorizontal='FILL';return n;}
function spacer(parent){const n=box(parent,'Flexible space');n.resize(1,20);n.layoutSizingHorizontal='FILL';n.layoutSizingVertical='FILL';return n;}
async function caption(parent,title,subtitle){return instance(parent,'Flow label',{Title:title,Detail:subtitle});}
root.resize(2282,100);root.layoutSizingVertical='HUG';root.fills=[paint('muted')];
await text(root,'Title','Контент становится контекстом','heading');
await text(root,'Subtitle','Lo-fi / главная медицинского помощника → чат → перенос карточки → вопрос с контекстом','body',.65);
const flow=box(root,'Flow · пять состояний','HORIZONTAL',{gap:48});flow.counterAxisAlignItems='MIN';
const phones=[],records=[];
const titles=[['01 / Главная','Сводка → ближайший шаг → показатели'],['02 / Открыли чат','Главная остаётся доступна над панелью'],['03 / Переносим карточку','Удержание и движение к области контекста'],['04 / Контекст добавлен','Можно убрать карточку или добавить ещё'],['05 / Разговор по делу','Чат развёрнут; источник остаётся видимым']];
const notes=[
  'Один постоянный вход в чат снизу. Медкарта доступна в шапке; документы и показатели — в ленте. Главная прокручивается.',
  'Панель занимает нижнюю часть экрана. Карточка ближайших анализов остаётся целиком видна. Контент за панелью сохраняет возможность прокрутки.',
  'Перенос создаёт копию в контексте разговора. В lo-fi жест показан переходом между состояниями; произвольный drag-and-drop потребует кодового прототипа.',
  'Вложение видно до отправки. Можно убрать его из разговора, добавить другие объекты или выбрать готовый вопрос.',
  'Помощник отвечает с учётом прикреплённой карточки. Свободный вопрос, файлы и дополнительные объекты используют тот же вход.'
];
async function buildHome(viewport){
  const content=box(viewport,'Home content','VERTICAL',{gap:16});setToken(content,'paddingLeft',24);setToken(content,'paddingRight',24);setToken(content,'paddingTop',12);setToken(content,'paddingBottom',24);
  const header=box(content,'Home header','HORIZONTAL',{gap:12});const head=box(header,'Date and title','VERTICAL',{gap:4});
  await text(head,'Title','Сегодня','heading');await text(head,'Date','Пятница, 16 октября','small',.6);
  const med=instance(header,'Text action',{Label:'Медкарта'},false);
  const summary=box(content,'AI summary','VERTICAL',{bg:'muted',pad:16,gap:8,radius:16});await text(summary,'Label','СВОДКА ПОМОЩНИКА','caption',.6);
  await text(summary,'Summary','Завтра — контрольные анализы. Давайте подготовимся к ним.','label');
  const upcoming=box(content,'Upcoming actions','VERTICAL',{gap:12});await text(upcoming,'Heading','Ближайший шаг','label');
  const labs=instance(upcoming,'Medical card');
  const metrics=box(content,'Daily metrics','VERTICAL',{gap:12});await text(metrics,'Heading','Показатели сегодня','label');
  const metricRow=box(metrics,'Metrics row','HORIZONTAL',{gap:12});metricRow.counterAxisAlignItems='MIN';
  instance(metricRow,'Metric');instance(metricRow,'Metric',{Label:'Активность',Value:'4 280',Detail:'шагов сегодня'});
  const docs=box(content,'Medical documents','VERTICAL',{gap:12});const titleRow=box(docs,'Document heading','HORIZONTAL',{gap:8});await text(titleRow,'Heading','Медицинские документы','label');instance(titleRow,'Text action',{Label:'Все'},false);
  const doc=instance(docs,'Medical card',{Eyebrow:'ЗАКЛЮЧЕНИЕ · 2 ОКТЯБРЯ',Title:'Приём терапевта',Detail:'Рекомендации и назначения',Source:'PDF · 2 страницы'});
  return {content,labs,med,doc};
}
async function composer(parent,placeholder='Спросить помощника…'){
  const n=box(parent,'Composer','HORIZONTAL',{pad:8,gap:8,radius:16,border:true,bg:'paper'});const attach=instance(n,'Text action',{Label:'Файл'},false);await text(n,'Placeholder',placeholder,'small',.5);const send=instance(n,'Text action',{Label:'Отправить'},false);return {node:n,attach,send};
}
async function sheet(phone,index){
  const sh=box(phone,'Chat panel','VERTICAL',{bg:'paper',width:402,pad:16,gap:8,radius:24});setToken(sh,'paddingTop',12);sh.paddingBottom=0;sh.layoutPositioning='ABSOLUTE';sh.x=0;sh.y=544;sh.strokes=[paint('line')];sh.strokeWeight=1;
  const h=box(sh,'Chat header','HORIZONTAL',{gap:8});await text(h,'Title','Помощник','title');const close=instance(h,'Text action',{Label:'Закрыть'},false);
  let target=null,chip=null,suggestion=null;
  if(index===1||index===2){
    await text(sh,'Instruction',index===2?'Перенесите карточку в область ниже':'Зажмите и перенесите карточку сюда','small',.65);
    target=box(sh,'Drop zone','VERTICAL',{bg:index===2?'muted':'paper',pad:12,gap:4,radius:16,border:true});target.dashPattern=[6,4];target.strokes=[paint('ink',index===2?.6:.25)];target.strokeWeight=index===2?2:1;
    await text(target,'Title',index===2?'Отпустите, чтобы добавить':'Добавить контекст','label');await text(target,'Types','Анализы, документы, показатели','small',.6);
  }else{
    const label=box(sh,'Context label','HORIZONTAL',{gap:8});await text(label,'Label','В контексте · 1','small',.6);instance(label,'Text action',{Label:'Добавить ещё'},false);
    chip=instance(sh,'Context item');suggestion=instance(sh,'Button secondary',{Label:'Что нужно подготовить?'});
  }
  const input=await composer(sh);native(sh,home,'Home indicator');
  sh.y=874-sh.height;return {sh,close,target,chip,suggestion,input};
}
for(let i=0;i<5;i++){
  const col=box(flow,'State '+(i+1),'VERTICAL',{width:402,gap:20});await caption(col,titles[i][0],titles[i][1]);
  const phone=box(col,'0'+(i+1)+' · '+titles[i][0].split(' / ')[1],'VERTICAL',{bg:'paper',width:402});phone.resize(402,874);phone.layoutSizingHorizontal='FIXED';phone.layoutSizingVertical='FIXED';phone.cornerRadius=28;phone.clipsContent=true;phone.strokes=[paint('line')];phone.strokeWeight=1;
  phones.push(phone);native(phone,status,'Status bar');let record={phone,col};
  if(i<4){
    const view=box(phone,'Home viewport','VERTICAL');view.resize(402,690);view.layoutSizingHorizontal='FILL';view.layoutSizingVertical='FILL';view.clipsContent=true;view.overflowDirection='VERTICAL';
    Object.assign(record,await buildHome(view));
    const dock=box(phone,'Chat dock','VERTICAL',{pad:16,bg:'paper'});setToken(dock,'paddingLeft',24);setToken(dock,'paddingRight',24);record.open=instance(dock,'Button primary',{Label:'Чат с помощником'});native(phone,home,'Home indicator');
    if(i>0){record.dock=dock;dock.opacity=0;Object.assign(record,await sheet(phone,i));}
    if(i===2){
      record.labs.opacity=.3;
      const ghost=box(phone,'Dragged card','VERTICAL',{width:326,pad:16,gap:8,bg:'paper',radius:16,border:true});ghost.layoutPositioning='ABSOLUTE';ghost.x=42;ghost.y=470;ghost.rotation=-3;ghost.strokes=[paint('ink')];ghost.strokeWeight=2;
      await text(ghost,'Title','Контрольные анализы','label');await text(ghost,'Detail','Завтра · 08:30','small',.6);record.ghost=ghost;
    }
  }else{
    const header=box(phone,'Expanded chat header','HORIZONTAL',{pad:16,gap:8});await text(header,'Title','Помощник','title');record.collapse=instance(header,'Text action',{Label:'Свернуть'},false);
    const thread=box(phone,'Conversation','VERTICAL',{pad:24,gap:20});thread.layoutSizingVertical='FILL';thread.clipsContent=true;thread.overflowDirection='VERTICAL';
    await text(thread,'Context label','КОНТЕКСТ РАЗГОВОРА','caption',.55);record.chip=instance(thread,'Context item');
    const user=box(thread,'User message','VERTICAL',{pad:16,bg:'muted',radius:16});await text(user,'Message','Что нужно подготовить?','body');
    const answer=box(thread,'Assistant message','VERTICAL',{gap:12});await text(answer,'Role','ПОМОЩНИК','caption',.55);
    await text(answer,'Message','В карточке — общий анализ крови и ферритин, завтра в 08:30.','body');
    await text(answer,'Next step','Добавьте памятку лаборатории — соберу подготовку по ней и свяжу с назначением врача.','body');
    const source=box(answer,'Evidence','VERTICAL',{pad:12,gap:4,bg:'muted',radius:12});await text(source,'Source','Источник: назначение от 02.10','small',.7);
    record.addFile=instance(answer,'Button secondary',{Label:'Добавить памятку'});
    spacer(thread);const inputWrap=box(phone,'Composer footer','VERTICAL',{pad:16});record.input=await composer(inputWrap,'Задайте свой вопрос…');native(phone,home,'Home indicator');
  }
  await text(col,'Behaviour note',notes[i],'small',.65);records.push(record);
}
const below=box(root,'Mechanics notes','HORIZONTAL',{gap:32});below.counterAxisAlignItems='MIN';
for(const [title,body] of [
  ['КОМПОЗИЦИЯ','Вверху — контекст дня и следующий медицинский шаг. Ниже — показатели и документы. Кнопка чата закреплена у нижнего края.'],
  ['ПОВЕДЕНИЕ','Карточки, документы и показатели могут стать вложениями. При переносе копируется контекст; исходный объект остаётся на месте.'],
  ['ПРОВЕРЯЕМ В КОНЦЕПТЕ','Понятен ли перенос без объяснения? Достаточно ли места над панелью? Удобно ли добавлять несколько объектов? Данные в макете демонстрационные.']
]){const n=box(below,title,'VERTICAL',{gap:8});await text(n,'Title',title,'caption',.6);await text(n,'Body',body,'body');}
// Figma NAVIGATE requires page-level destination frames. Keep auto-layout slots
// in the review board and place the actual interactive screens over those slots.
for(const r of records){
  const idx=r.col.children.indexOf(r.phone);
  const slot=box(r.col,'Device slot','VERTICAL',{width:402});
  slot.resize(402,874);slot.layoutSizingHorizontal='FIXED';slot.layoutSizingVertical='FIXED';
  r.col.insertChild(idx,slot);page.appendChild(r.phone);
  r.phone.x=slot.absoluteTransform[0][2];r.phone.y=slot.absoluteTransform[1][2];
}
async function go(node,destination,trigger={type:'ON_CLICK'},duration=.25){await node.setReactionsAsync([{trigger,actions:[{type:'NODE',destinationId:destination.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration}}]}]);mutated.push(node.id);}
await go(records[0].open,phones[1]);
await go(records[1].labs,phones[2],{type:'ON_DRAG'});
await records[1].labs.setReactionsAsync([
  {trigger:{type:'ON_DRAG'},actions:[{type:'NODE',destinationId:phones[2].id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.2}}]},
  {trigger:{type:'MOUSE_DOWN',delay:.45},actions:[{type:'NODE',destinationId:phones[2].id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.2}}]},
  {trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:phones[3].id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.2}}]}
]);
await go(phones[2],phones[3],{type:'AFTER_TIMEOUT',timeout:.8},.2);
await go(records[2].target,phones[3]);
await go(records[3].suggestion,phones[4]);
for(const i of [1,2,3])await go(records[i].close,phones[0]);
const remove=records[3].chip.findAllWithCriteria({types:['TEXT']}).find(n=>n.name==='Remove');await go(remove,phones[1]);
await go(records[4].collapse,phones[3]);
page.flowStartingPoints=[{nodeId:phones[0].id,name:'Контент → контекст → разговор'}];page.prototypeBackgrounds=[paint('muted')];
figma.viewport.scrollAndZoomIntoView([root]);
const nodes=[...root.findAll(()=>true),...phones.flatMap(p=>[p,...p.findAll(()=>true)])],counts={};for(const n of nodes)counts[n.type]=(counts[n.type]||0)+1;
await root.screenshot({scale:1,contentsOnly:false});
return {createdNodeIds:created,mutatedNodeIds:mutated,wrapperId:root.id,pageId:page.id,screens:records.map((r,i)=>({id:r.phone.id,name:r.phone.name,width:r.phone.width,height:r.phone.height,labCard:r.labs?.id,chatPanel:r.sh?{id:r.sh.id,y:r.sh.y,height:r.sh.height}:null,chatButton:r.open?.id,dropzone:r.target?.id,contextItem:r.chip?.id})),descendantCount:nodes.length,nodeTypes:counts,imageNodes:nodes.filter(n=>'fills'in n&&Array.isArray(n.fills)&&n.fills.some(f=>f.type==='IMAGE')).map(n=>({id:n.id,name:n.name})),prototypeLinks:nodes.filter(n=>'reactions'in n&&n.reactions.length).map(n=>({id:n.id,reactions:n.reactions})),textFonts:[...new Set(nodes.filter(n=>n.type==='TEXT').flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>s.fontName.family)))],bounds:{width:root.width,height:root.height}};
