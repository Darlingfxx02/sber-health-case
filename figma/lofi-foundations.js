const page = await figma.getNodeByIdAsync('26:54');
await figma.setCurrentPageAsync(page);
const existing = page.children.find(n => n.name === '_Lo-fi components');
if (existing) return { alreadyExists: true, componentBoardId: existing.id };
await Promise.all(['Regular', 'Medium', 'Semi Bold'].map(style => figma.loadFontAsync({family:'Inter',style})));
const created=[], variableIds=[], styleIds=[];
const keep=n=>(created.push(n.id),n);
// Adapted from figma-generate-library/scripts/createVariableCollection.js.
async function createVariableCollection(name, modeNames) {
  const collection=figma.variables.createVariableCollection(name);
  const modeIds={};
  collection.renameMode(collection.modes[0].modeId,modeNames[0]);
  modeIds[modeNames[0]]=collection.modes[0].modeId;
  return {collection,modeIds};
}
const {collection,modeIds}=await createVariableCollection('Lo-fi · Tokens',['Light']);
const mode=modeIds.Light, vars={};
function variable(name,type,value,scopes){
  const v=figma.variables.createVariable(name,collection,type);
  v.scopes=scopes;v.setValueForMode(mode,value);
  v.setVariableCodeSyntax('WEB','var(--lofi-'+name.replaceAll('/','-')+')');
  vars[name]=v;variableIds.push(v.id);return v;
}
// Local monochrome primitives: imported library IDs were not retained between calls.
for(const [name,value] of Object.entries({ink:0.08,paper:1,muted:.96,line:.86})){
  const primitive=variable('primitive/'+name,'COLOR',{r:value,g:value,b:value},[]);
  variable('color/'+name,'COLOR',{type:'VARIABLE_ALIAS',id:primitive.id},['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR']);
}
for(const n of [4,8,12,16,20,24,32,40,48])variable('space/'+n,'FLOAT',n,['GAP']);
for(const n of [12,16,24,99])variable('radius/'+n,'FLOAT',n,['CORNER_RADIUS']);
const styles={};
for(const [key,size,weight,line] of [['caption',12,'Regular',17],['small',13,'Regular',18],['body',15,'Regular',21],['label',15,'Medium',21],['title',19,'Semi Bold',25],['heading',28,'Semi Bold',34],['number',26,'Medium',32]]){
  const s=figma.createTextStyle();s.name='Lo-fi/'+key;s.fontName={family:'Inter',style:weight};s.fontSize=size;s.lineHeight={unit:'PIXELS',value:line};styles[key]=s;styleIds.push(s.id);
}
function paint(key,opacity=1){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0},opacity},'color',vars['color/'+key]);}
// Token binding pattern adapted from bindVariablesToComponent.js.
function bind(n,{bg,gap,pad,radius,border}={}){
  n.fills=bg?[paint(bg)]:[];
  if(gap!==undefined)n.setBoundVariable('itemSpacing',vars['space/'+gap]);
  if(pad!==undefined)for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft'])n.setBoundVariable(p,vars['space/'+pad]);
  if(radius!==undefined)n.setBoundVariable('cornerRadius',vars['radius/'+radius]);
  if(border){n.strokes=[paint('line')];n.strokeWeight=1;}
}
const board=keep(figma.createAutoLayout('HORIZONTAL'));page.appendChild(board);board.name='_Lo-fi components';board.x=120;board.y=1500;board.itemSpacing=40;board.paddingLeft=board.paddingRight=board.paddingTop=board.paddingBottom=32;board.fills=[paint('muted')];
const components={}, props={};
function comp(name,dir,width,settings){const n=keep(figma.createComponent());board.appendChild(n);n.name='Lo-fi/'+name;n.layoutMode=dir;n.resize(width,100);n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';bind(n,settings);components[name]=n;props[name]={};return n;}
function row(parent,name,gap=8){const n=keep(figma.createAutoLayout('HORIZONTAL'));parent.appendChild(n);n.name=name;n.layoutSizingHorizontal='FILL';bind(n,{gap});n.counterAxisAlignItems='CENTER';return n;}
function column(parent,name,gap=4){const n=keep(figma.createAutoLayout('VERTICAL'));parent.appendChild(n);n.name=name;n.layoutSizingHorizontal='FILL';bind(n,{gap});return n;}
async function text(parent,name,value,style='body',tone='ink',opacity=1,owner=null,prop=null,fill=true){
  const t=keep(figma.createText());parent.appendChild(t);t.name=name;
  await t.setTextStyleIdAsync(styles[style].id);t.characters=value;t.fills=[paint(tone,opacity)];
  t.textAutoResize=fill?'HEIGHT':'WIDTH_AND_HEIGHT';
  if(fill){t.resize(Math.max(1,parent.width-(parent.paddingLeft||0)-(parent.paddingRight||0)),24);t.layoutSizingHorizontal='FILL';t.layoutSizingVertical='HUG';}else{t.layoutSizingHorizontal='HUG';t.layoutSizingVertical='HUG';}
  if(owner&&prop){const key=owner.addComponentProperty(prop,'TEXT',value);t.componentPropertyReferences={characters:key};props[owner.name.replace('Lo-fi/','')][prop]=key;}
  return t;
}
let c=comp('Button primary','HORIZONTAL',354,{bg:'ink',pad:16,radius:16});c.primaryAxisAlignItems='CENTER';await text(c,'Label','Открыть чат','label','paper',1,c,'Label',false);c.description='Основное действие lo-fi. Текстовая подпись, без декоративной графики.';
c=comp('Button secondary','HORIZONTAL',354,{bg:'paper',pad:12,radius:12,border:true});c.primaryAxisAlignItems='CENTER';await text(c,'Label','Как подготовиться?','label','ink',1,c,'Label',false);
c=comp('Text action','HORIZONTAL',90,{gap:4,pad:4});c.counterAxisSizingMode='AUTO';await text(c,'Label','Закрыть','small','ink',1,c,'Label',false);
c=comp('Medical card','VERTICAL',354,{bg:'paper',pad:16,gap:8,radius:16,border:true});await text(c,'Eyebrow','ЗАВТРА · 08:30','caption','ink',.6,c,'Eyebrow');await text(c,'Title','Контрольные анализы','title','ink',1,c,'Title');await text(c,'Detail','Общий анализ крови · ферритин','body','ink',.75,c,'Detail');await text(c,'Source','По назначению терапевта от 02.10','caption','ink',.6,c,'Source');c.description='Карточка медицинского события или документа. Можно перенести копию в контекст чата; исходник остаётся на главной.';
c=comp('Metric','VERTICAL',171,{bg:'paper',pad:16,gap:4,radius:16,border:true});await text(c,'Label','Сон','small','ink',.65,c,'Label');await text(c,'Value','6 ч 40 м','number','ink',1,c,'Value');await text(c,'Detail','На 50 мин меньше обычного','caption','ink',.65,c,'Detail');
c=comp('Context item','HORIZONTAL',354,{bg:'muted',pad:12,gap:12,radius:12});c.counterAxisAlignItems='CENTER';const stack=column(c,'Content',4);await text(stack,'Title','Контрольные анализы','label','ink',1,c,'Title');await text(stack,'Detail','Завтра, 08:30 · назначение','caption','ink',.6,c,'Detail');await text(c,'Remove','Убрать','small','ink',.7,null,null,false);c.description='Прикреплённый объект с типом и датой. Действие Убрать удаляет его только из контекста разговора.';
c=comp('Flow label','VERTICAL',402,{bg:'ink',pad:16,gap:8,radius:12});await text(c,'Title','01 / Главная','label','paper',1,c,'Title');await text(c,'Detail','Обзор, следующий шаг и данные','small','paper',.75,c,'Detail');
await board.screenshot({scale:.75});
return {createdNodeIds:created,collectionId:collection.id,variableIds,styleIds,componentBoardId:board.id,components:Object.fromEntries(Object.entries(components).map(([k,n])=>[k,{id:n.id,props:props[k],width:n.width,height:n.height}])),variables:Object.fromEntries(Object.entries(vars).map(([k,v])=>[k,v.id])),styles:Object.fromEntries(Object.entries(styles).map(([k,s])=>[k,s.id]))};
