// Stable calendar for the fictional appointments, independent of the metric day picker.
export const APPOINTMENT_DEMO_TODAY='2026-10-17';
const nextDay=date=>new Date(Date.parse(`${date}T12:00:00Z`)+86400000).toISOString().slice(0,10);
const dateLabel=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

export function appointmentDays(cards,planned,today=APPOINTMENT_DEMO_TODAY){
  const entries=cards.filter(item=>item.appointment).map(item=>({id:item.id,...item.appointment,item}));
  const tomorrow=nextDay(today);
  if(planned){
    const [day,time]=planned.slot.split(', ');
    entries.push({id:'planned',date:day==='Завтра'?tomorrow:today,time,title:planned.specialty,icon:'calendar-fill',format:planned.format});
  }
  entries.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const groups=new Map();
  for(const entry of entries){
    if(!groups.has(entry.date))groups.set(entry.date,{date:entry.date,label:entry.date===today?'Сегодня':entry.date===tomorrow?'Завтра':dateLabel(entry.date),entries:[]});
    groups.get(entry.date).entries.push(entry);
  }
  return [...groups.values()];
}
