const icon=name=>`<span class="icon" style="--icon:url('assets/iconsax/${name}.svg')" aria-hidden="true"></span>`;
const times=['00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','09:20','09:35'];
// Same fixed demo week as the activity history.
const days=['9 окт','10 окт','11 окт','12 окт','13 окт','14 окт','15 окт'];
const weekdays=['Пт','Сб','Вс','Пн','Вт','Ср','Чт'];
export const HEALTH_METRICS=[
  {id:'pulse',kind:'metric',title:'Пульс в покое',value:'64 уд/мин',unit:'уд/мин',color:'#309879',icon:'pulse',caption:'В покое',source:'Часы · сегодня, 09:35',series:{day:{labels:times,values:[60,58,55,57,54,58,66,61,77,70,67,64]},week:{labels:days,values:[67,65,66,63,65,62,64]}}},
  {id:'oxygen',kind:'metric',title:'Кислород в крови',value:'98%',unit:'%',color:'#398eaf',icon:'activity',caption:'Последнее измерение',source:'Часы · сегодня, 09:30',series:{day:{labels:['00:15','02:20','04:10','06:30','08:15','09:30'],values:[98,97,98,97,99,98]},week:{labels:days,values:[98,98,97,99,98,97,98]}}},
  {id:'sleep',kind:'metric',title:'Сон',value:'7 ч 24 мин',unit:'мин',color:'#7b83bd',icon:'moon',caption:'Сегодня ночью',source:'Часы · сегодня, 07:12',series:{week:{labels:days,values:[412,458,401,469,426,438,444]}}},
  {id:'hrv',kind:'metric',title:'Вариабельность пульса',value:'48 мс',unit:'мс',color:'#309879',icon:'pulse',caption:'За ночь',source:'Часы · сегодня, 07:12',series:{week:{labels:days,values:[43,46,42,49,45,47,48]}}}
];
export function formatHealthValue(metric,value){return metric.id==='sleep'?`${Math.floor(value/60)} ч ${value%60} мин`:metric.id==='oxygen'?`${value}%`:`${value} ${metric.unit}`;}
function points(values,width,height,pad=8){const low=Math.min(...values),high=Math.max(...values);const span=Math.max(high-low,1);return values.map((v,i)=>[pad+i*(width-pad*2)/(values.length-1),height-pad-(.2+.65*(v-low)/span)*(height-pad*2)]);}
function linePath(values,width,height){return points(values,width,height).map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');}
// Compact weekly charts share one axis and a restrained, metric-specific scale.
function weekChart(metric){
  const values=metric.series.week.values, width=144, height=64, pad=10;
  const domains={pulse:[50,80],oxygen:[94,100],sleep:[0,600],hrv:[20,80]};
  const [low,high]=domains[metric.id];
  const coords=values.map((value,i)=>[pad+i*(width-pad*2)/6,8+(1-(value-low)/(high-low))*(height-16)]);
  const plot=metric.id==='sleep'
    ?coords.map(([x,y],i)=>`<rect x="${x-6}" y="${y}" width="12" height="${height-y}" rx="6" fill="${metric.color}" opacity="${i===6?1:.38}"/>`).join('')
    :`<path d="${coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" stroke="${metric.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===6?4:3}" fill="${metric.color}" stroke="#fff" stroke-width="2"/>`).join('')}`;
  return `<span class="metric-week-chart" aria-hidden="true"><svg viewBox="0 0 ${width} ${height}" fill="none">${plot}</svg><span class="metric-week-axis">${weekdays.map((day,i)=>`<span class="${i===6?'is-current':''}">${day[0]}</span>`).join('')}</span></span>`;
}
function valueMarkup(metric,value=metric.series.week.values.at(-1)){
  return metric.id==='sleep'
    ?`<span class="metric-pair">${Math.floor(value/60)}<small>ч</small></span><span class="metric-pair">${value%60}<small>м</small></span>`
    :`<span>${value}</span><small>${metric.unit}</small>`;
}
function metricTile(metric){
  const title=metric.id==='oxygen'?'Кислород в крови':metric.title;
  const displayTitle=title.replace('Вариабельность','Вариа&shy;бельность');
  return `<button class="health-tile ${metric.id}-tile" data-health="${metric.id}" aria-label="${title}, ${metric.value}. Открыть динамику за неделю">
    <span class="health-tile-title">${displayTitle}</span>
    <span class="health-number">${valueMarkup(metric)}</span>
    ${weekChart(metric)}
  </button>`;
}
const careContext={id:'care',kind:'care',title:'Врач и обследования',meta:'Записи и назначения'};

export function createHealthOverview({container,onOpenMetric,onOpenCare,onOpenRecord}){
  let planned=null;
  container.className='health-bento';
  const render=()=>{
    container.innerHTML=`<div class="health-section-heading"><h2>Показатели</h2><span>За неделю</span></div>
      ${HEALTH_METRICS.map(metricTile).join('')}
      <section class="care-tile" aria-label="Врач и обследования">
        <div class="care-intro"><h2>Врач и обследования</h2><button class="care-book" id="care-book">Записаться ${icon('chevron-right')}</button></div>
        <div class="care-events">
          ${planned?`<button data-care-record="planned">${icon('chat')}<span><strong>${planned.specialty} · ${planned.format.toLowerCase()}</strong><small>${planned.when} · демо</small></span>${icon('chevron-right')}</button>`:''}
          <button data-care-record="labs">${icon('labs')}<span><strong>Анализы</strong><small>Завтра · 08:30</small></span>${icon('chevron-right')}</button>
          <button data-care-record="appointment">${icon('calendar')}<span><strong>Терапевт</strong><small>22 октября · 16:00</small></span>${icon('chevron-right')}</button>
        </div>
      </section>`;
    container.querySelectorAll('[data-health]').forEach(button=>button.addEventListener('click',()=>onOpenMetric(HEALTH_METRICS.find(m=>m.id===button.dataset.health))));
    container.querySelector('#care-book').addEventListener('click',()=>onOpenCare(careContext));
    container.querySelectorAll('[data-care-record]').forEach(button=>button.addEventListener('click',()=>button.dataset.careRecord==='planned'?onOpenCare(careContext):onOpenRecord(button.dataset.careRecord)));
  };
  render();
  return {
    reset(){planned=null;render();},
    renderCareDetail({container:detail,onSelect}){
      const section=document.createElement('div');section.className='care-detail';detail.append(section);
      let format='Онлайн',specialty='Терапевт',slot='Сегодня, 12:30',complete=false;
      const sync=()=>onSelect({...careContext,title:complete?`Запись: ${specialty}`:'Обращение к врачу',meta:`${specialty} · ${format.toLowerCase()} · ${slot}`,description:complete?'Добавлено в демонстрационный план':'Выбранные параметры консультации'});
      const draw=()=>{
        if(complete){section.innerHTML=`<div class="care-success"><h2>В вашем плане</h2><p>${specialty} · ${format.toLowerCase()}<br>${slot}</p><span>Демонстрационная запись</span></div><button class="care-secondary" id="care-edit">Изменить</button>`;section.querySelector('#care-edit').addEventListener('click',()=>{complete=false;draw();});sync();return;}
        section.innerHTML=`<div class="care-formats" aria-label="Формат приёма">${['Онлайн','В клинике'].map(v=>`<button data-format="${v}" aria-pressed="${v===format}">${icon(v==='Онлайн'?'chat':'home')}${v}</button>`).join('')}</div>
          <h2 class="care-field-label">Специалист</h2><div class="care-specialties">${['Терапевт','Кардиолог','Эндокринолог'].map(v=>`<button data-specialty="${v}" aria-pressed="${v===specialty}"><span>${v}</span>${icon(v===specialty?'check':'chevron-right')}</button>`).join('')}</div>
          <h2 class="care-field-label">Ближайшее время</h2><div class="care-slots">${['Сегодня, 12:30','Сегодня, 15:00','Завтра, 10:00'].map(v=>`<button data-slot="${v}" aria-pressed="${v===slot}">${v}</button>`).join('')}</div>
          <button class="care-confirm" id="care-confirm">Добавить в план ${icon('add')}</button><p class="care-demo-note">Демо · без отправки записи в клинику</p>`;
        for(const field of ['format','specialty','slot'])section.querySelectorAll(`[data-${field}]`).forEach(button=>button.addEventListener('click',()=>{if(field==='format')format=button.dataset.format;else if(field==='specialty')specialty=button.dataset.specialty;else slot=button.dataset.slot;draw();section.querySelector(`[data-${field}="${field==='format'?format:field==='specialty'?specialty:slot}"]`).focus({preventScroll:true});}));
        section.querySelector('#care-confirm').addEventListener('click',()=>{planned={specialty,when:slot,format};complete=true;render();draw();});sync();
      };
      if(planned){({specialty,when:slot,format}=planned);complete=true;}draw();
    }
  };
}

export function renderHealthMetricDetail({container,metric,onSelect}){
  const view=document.createElement('div');view.className=`health-metric-detail ${metric.id}-detail`;view.style.setProperty('--metric-color',metric.color);container.append(view);
  let period='week',selected=metric.series[period].values.length-1;
  const draw=()=>{
    const series=metric.series[period],value=series.values[selected];
    const path=linePath(series.values,320,160);
    const valueMarkup=metric.id==='sleep'?`<span class="metric-pair">${Math.floor(value/60)}<small>ч</small></span><span class="metric-pair">${value%60}<small>мин</small></span>`:`<span>${value}</span><small>${metric.unit}</small>`;
    view.innerHTML=`<div class="metric-detail-summary"><div class="metric-detail-number">${valueMarkup}</div><p>${series.labels[selected]}${period==='day'?' · сегодня':''}${metric.id==='sleep'&&selected===series.values.length-1?' · 23:48–07:12':''}</p></div>
      <div class="metric-period" aria-label="Период показателя">${Object.keys(metric.series).map(key=>`<button data-period="${key}" aria-pressed="${period===key}">${key==='day'?'День':'Неделя'}</button>`).join('')}</div>
      <div class="metric-detail-chart"><svg viewBox="0 0 320 160" fill="none" aria-hidden="true"><path d="M8 25H312M8 80H312M8 135H312" stroke="#e8ecf0" stroke-dasharray="3 5"/><path d="${path}" stroke="${metric.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${points(series.values,320,160)[selected][0]}" cy="${points(series.values,320,160)[selected][1]}" r="6" fill="${metric.color}" stroke="#fff" stroke-width="3"/></svg><div class="metric-chart-targets">${series.values.map((v,i)=>`<button data-measurement="${i}" aria-pressed="${selected===i}" aria-label="${series.labels[i]}, ${formatHealthValue(metric,v)}">${series.values.length<=7||[0,Math.floor(series.values.length/2),series.values.length-1].includes(i)?`<span aria-hidden="true">${series.labels[i]}</span>`:''}</button>`).join('')}</div></div>
      <dl class="metric-summary-row"><div><dt>Минимум</dt><dd>${formatHealthValue(metric,Math.min(...series.values))}</dd></div><div><dt>Максимум</dt><dd>${formatHealthValue(metric,Math.max(...series.values))}</dd></div></dl>
      <p class="metric-source">${icon('activity')}${metric.source}<span>Демонстрационные измерения</span></p>`;
    view.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{period=button.dataset.period;selected=metric.series[period].values.length-1;draw();view.querySelector(`[data-period="${period}"]`).focus({preventScroll:true});}));
    view.querySelectorAll('[data-measurement]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.measurement);draw();view.querySelector(`[data-measurement="${selected}"]`).focus({preventScroll:true});}));
    onSelect({...metric,id:`${metric.id}-${period}-${selected}`,title:`${metric.title} · ${series.labels[selected]}`,value:formatHealthValue(metric,value),meta:period==='day'?'Сегодня · выбранное измерение':'Выбранный день',source:metric.source});
  };draw();
}
