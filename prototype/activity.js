import {GOALS,activityAppearance} from './activity-model.js';

// Fixed demo history: the colours encode goals, without a progress UI on home.
export const ACTIVITY_DAYS=[
  {id:'2026-10-15',label:'Чт',date:'15 октября',shortDate:'15',progress:[60,12,86],values:['360 ккал','5 мин','3 приёма пищи']},
  {id:'2026-10-14',label:'Ср',date:'14 октября',shortDate:'14',progress:[100,100,100],values:['620 ккал','50 мин','4 приёма пищи']},
  {id:'2026-10-13',label:'Вт',date:'13 октября',shortDate:'13',progress:[95,0,0],values:['570 ккал','Нет записей','Нет записей']},
  {id:'2026-10-12',label:'Пн',date:'12 октября',shortDate:'12',progress:[18,92,0],values:['108 ккал','41 мин','Нет записей']},
  {id:'2026-10-11',label:'Вс',date:'11 октября',shortDate:'11',progress:[0,0,100],values:['Нет записей','Нет записей','4 приёма пищи']},
  {id:'2026-10-10',label:'Сб',date:'10 октября',shortDate:'10',progress:[100,100,100],values:['685 ккал','60 мин','4 приёма пищи']},
  {id:'2026-10-09',label:'Пт',date:'9 октября',shortDate:'9',progress:[70,0,35],values:['420 ккал','Нет записей','1 приём пищи']}
];

function dayMarkup(day,selectedId){
  const appearance=activityAppearance(day.progress);
  return `<button class="activity-day${appearance.complete?' is-complete':''}" data-day="${day.id}" aria-label="${day.date}. Открыть центр активности" ${day.id===selectedId?'aria-current="date"':''}>
    <span class="activity-day-surface">
      <span class="activity-light" aria-hidden="true" style="--day-color:${day.accent||'#3c83e7'}"></span>
      <span class="activity-day-name">${day.label}</span><span class="activity-day-date">${day.shortDate}</span>
    </span>
  </button>`;
}

function connectDays(track,onOpenDay){
  track.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>onOpenDay(ACTIVITY_DAYS.find(day=>day.id===button.dataset.day))));
}

export function activityContext(day){
  return {id:`activity-${day.id}`,kind:'activity',title:'Центр активности',meta:day.date,day};
}

export function createActivity({container,onOpenDay}){
  container.className='activity-history';
  container.innerHTML=`<button class="activity-entry" aria-label="Открыть центр активности"><h2>Активность</h2><span class="activity-more">подробнее<span class="activity-more-icon icon" style="--icon:url('assets/iconsax/chevron-right.svg')" aria-hidden="true"></span></span></button><div class="activity-history-track" aria-label="История активности по дням">${ACTIVITY_DAYS.map(day=>dayMarkup(day,ACTIVITY_DAYS[0].id)).join('')}</div>`;
  container.querySelector('.activity-entry').addEventListener('click',()=>onOpenDay(ACTIVITY_DAYS[0]));
  const track=container.querySelector('.activity-history-track');
  connectDays(track,onOpenDay);
  return {reset(){track.scrollTo({left:0,behavior:'instant'});}};
}

export function renderActivityDetail({container,day,onOpenDay}){
  const content=document.createElement('div');
  content.className='activity-center';
  content.innerHTML=`<div class="activity-history-track activity-center-track" aria-label="Выбрать день">${ACTIVITY_DAYS.map(item=>dayMarkup(item,day.id)).join('')}</div><h2 class="activity-center-date">${day.date}</h2><dl class="activity-day-values">${GOALS.map((goal,index)=>`<div><dt><span style="background:${goal.color}" aria-hidden="true"></span>${goal.title}</dt><dd>${day.values[index]}</dd></div>`).join('')}</dl>`;
  connectDays(content,onOpenDay);
  container.append(content);
  const selected=content.querySelector('[aria-current="date"]');
  const track=content.querySelector('.activity-history-track');
  track.scrollLeft=Math.max(0,selected.offsetLeft-track.offsetLeft-(track.clientWidth-selected.offsetWidth)/2);
}
