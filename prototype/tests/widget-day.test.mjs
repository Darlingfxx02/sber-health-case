import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_DAYS,HEALTH_METRICS,metricsForDay} from '../src/data.js';
import {PULSE_STATES,pulseLatestObservation} from '../src/pulse-chart.js';

test('date keys join the reverse day picker to matching metric readings',()=>{
  const readings=id=>metricsForDay(ACTIVITY_DAYS.find(day=>day.id===id)).map(metric=>metric.reading);
  assert.deepEqual(readings('2026-10-15'),[64,98,444,960]);
  assert.deepEqual(readings('2026-10-14'),[62,97,438,8530]);
  assert.deepEqual(readings('2026-10-09'),[67,98,412,4270]);
  for(const day of ACTIVITY_DAYS){
    for(const metric of metricsForDay(day)){
      assert.equal(metric.series.week.dates[metric.selectedIndex],day.id);
    }
  }
});
test('historical dates do not reuse the latest intraday measurements or mutate source data',()=>{
  const original=JSON.stringify(HEALTH_METRICS);
  const historical=metricsForDay(ACTIVITY_DAYS[1]);
  assert.equal(historical[0].series.day,undefined);
  assert.equal(historical[0].source,'Часы · 14 октября');
  assert.equal(historical[2].value,'7 ч 18 мин');
  assert.ok(metricsForDay(ACTIVITY_DAYS[0])[0].series.day);
  assert.equal(JSON.stringify(HEALTH_METRICS),original);
});
test('a missing date produces no data rather than silently using the latest day',()=>{
  for(const metric of metricsForDay({id:'2026-10-01',date:'1 октября'})){
    assert.equal(metric.reading,null);
    assert.equal(metric.value,'Нет данных');
    assert.equal(metric.selectedIndex,-1);
    assert.equal(metric.series.day,undefined);
  }
});

test('pulse card uses the latest matching observation and shared state palette',()=>{
  const latest=metricsForDay(ACTIVITY_DAYS[0])[0];
  assert.equal(latest.title,'Пульс');
  assert.equal(latest.lastObservation.time,'09:35');
  assert.equal(latest.lastObservation.context,'recovery');
  assert.equal(latest.lastObservation.color,PULSE_STATES.recovery.color);
  assert.equal(latest.reading,latest.lastObservation.value);
  const historical=metricsForDay(ACTIVITY_DAYS[1])[0];
  assert.equal(historical.lastObservation.date,'2026-10-14');
  assert.equal(historical.lastObservation.time,'21:00');
  assert.equal(historical.reading,historical.lastObservation.value);
  assert.equal(metricsForDay({id:'2026-10-01',date:'1 октября'})[0].lastObservation,null);
});
test('pulse state follows the recorded context rather than inferring it from bpm',()=>{
  const metric=HEALTH_METRICS[0];
  for(const context of ['sleep','rest','activity','stress','recovery']){
    const changed={...metric,series:{...metric.series,day:{labels:['09:35'],values:[64],contexts:[context]}}};
    const reading=pulseLatestObservation(changed,'2026-10-15');
    assert.equal(reading.value,64);
    assert.equal(reading.color,PULSE_STATES[context].color);
    assert.equal(reading.label,PULSE_STATES[context].label);
  }
  assert.equal(pulseLatestObservation(metric,'2026-10-16'),null);
});
