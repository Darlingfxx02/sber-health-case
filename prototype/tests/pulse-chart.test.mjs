import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_DAYS,metricsForDay} from '../src/data.js';
import {pulseSeries,pulseInitialIndex,pulseSelectionLabel,pulsePeriodLabel,pulseChart,pulsePointLabel,pulseObservation,pulseBreakdown,pulseDuration,nearestPulsePoint,pulseContext,pulseComparison,pulseReferenceRange,pulseReadingHistory,pulseDurationTrend} from '../src/pulse-chart.js';

const latest=metricsForDay(ACTIVITY_DAYS[0])[0];
test('history starts with seven full days and only appends older records',()=>{
  const initial=pulseReadingHistory(latest),more=pulseReadingHistory(latest,14),all=pulseReadingHistory(latest,21);
  assert.equal(initial.readings.length,64);
  assert.equal(new Set(initial.readings.map(row=>row.date)).size,7);
  assert.equal(new Set(initial.readings.map(row=>`${row.date} ${row.time}`)).size,64);
  assert.equal(initial.readings[0].label,'15 окт, 09:35');
  assert.equal(initial.readings.at(-1).date,'2026-10-09');
  assert.ok(initial.hasMore&&more.hasMore);assert.equal(all.hasMore,false);
  assert.deepEqual(more.readings.slice(0,64),initial.readings);
  assert.equal(more.readings.at(-1).date,'2026-10-02');
  assert.ok(more.readings.slice(64).every(row=>row.label.endsWith(' · среднее')&&!row.time));
  for(const row of all.readings)assert.equal(pulseSeries(latest,row.period).values[row.index],row.reading);
});
test('historical-day history excludes future dates and does not copy latest-day samples',()=>{
  const historical=metricsForDay(ACTIVITY_DAYS[1])[0];
  const {readings}=pulseReadingHistory(historical);
  assert.ok(readings.every(row=>row.date<='2026-10-14'&&row.date>='2026-10-08'&&row.period!=='day'));
  assert.equal(readings[0].label,'14 окт, 21:00');
  assert.equal(readings.at(-1).label,'8 окт · среднее');
});
test('intraday chart reflects minutes rather than distributing samples equally',()=>{
  const plot=pulseChart(latest.series.day);
  const firstHour=plot.points[latest.series.day.labels.indexOf('01:00')].x-plot.points[0].x;
  const lastQuarter=plot.points.at(-1).x-plot.points[latest.series.day.labels.indexOf('09:20')].x;
  assert.ok(Math.abs(firstHour/lastQuarter-4)<1e-8);
  assert.equal(plot.points[0].x,plot.left);
  assert.equal(plot.points.at(-1).x,plot.right);
  assert.equal(plot.low,54);assert.equal(plot.high,105);
});
test('selection clamps to endpoints and finds nearby irregular samples',()=>{
  const plot=pulseChart(latest.series.day);
  assert.equal(nearestPulsePoint(plot.points,-100),0);
  assert.equal(nearestPulsePoint(plot.points,1000),plot.points.length-1);
  assert.equal(nearestPulsePoint(plot.points,plot.points[10].x+1),10);
  const single=pulseChart({labels:['09:35'],values:[64]});
  assert.ok(Number.isFinite(single.points[0].x));assert.equal(single.axis.length,1);
});
test('full-width geometry leaves room for the right axis at different phone widths',()=>{
  for(const width of [320,375,402,480]){
    const plot=pulseChart(latest.series.day,width);
    assert.equal(plot.width,width);assert.equal(plot.left,16);assert.equal(plot.edgeFade,16);
    assert.ok(plot.right<width-40);assert.equal(plot.points.at(-1).x,plot.right);
    assert.equal(nearestPulsePoint(plot.points,0),0);
    assert.equal(nearestPulsePoint(plot.points,width),plot.points.length-1);
  }
});
test('point label flips below high points and stays readable at either horizontal edge',()=>{
  const plot=pulseChart({labels:['00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','09:20','09:35'],values:[60,58,55,57,54,58,66,61,77,70,67,64]});
  const high=pulsePointLabel(plot,8),low=pulsePointLabel(plot,4);
  assert.equal(high.placement,'below');assert.ok(high.y>plot.points[8].y);
  assert.equal(low.placement,'above');assert.ok(low.y<plot.points[4].y);
  assert.equal(pulsePointLabel(plot,0).anchor,'start');
  assert.equal(pulsePointLabel(plot,11).anchor,'end');
  for(let index=0;index<plot.points.length;index++){
    const label=pulsePointLabel(plot,index);
    assert.ok(label.y-14>=0&&label.y+4<plot.axisY);
  }
});
test('chat context keeps selected time, date and reading together',()=>{
  const daily=pulseContext(latest,'day',latest.series.day.labels.indexOf('09:00'));
  assert.equal(daily.title,'Пульс · 15 октября, 09:00');
  assert.equal(daily.value,'70 уд/мин');
  assert.match(daily.meta,/Стресс/);
  const historical=metricsForDay(ACTIVITY_DAYS[1])[0];
  const selected=pulseContext(historical,'week',pulseInitialIndex(historical,'week'));
  assert.equal(selected.title,'Пульс · 14 окт, 21:00');
  assert.equal(selected.value,'62 уд/мин');
  assert.match(selected.meta,/Отдых · диапазон 59–63 уд\/мин/);
  assert.notEqual(selected.id,pulseContext(historical,'week',0).id);
});
test('week range bars and trend describe the same chronological observation windows',()=>{
  assert.equal(latest.series.day.values.length,16);
  assert.equal(pulseChart(latest.series.day).ranges.length,0);
  const series=pulseSeries(latest,'week'),plot=pulseChart(series);
  assert.equal(plot.ranges.length,56);
  assert.deepEqual(plot.ticks.map(tick=>tick.value),[0,50,100,150]);
  plot.ranges.forEach(range=>{
    assert.ok(range.low<=series.values[range.index]&&range.high>=series.values[range.index]);
    assert.ok(range.top>=plot.top&&range.bottom<=plot.bottom);
    assert.equal(range.x,plot.points[range.index].x);
    assert.ok(plot.points[range.index].y>=range.top&&plot.points[range.index].y<=range.bottom);
    assert.ok(range.width>0&&range.width<=3.5);
  });
  assert.equal(plot.ranges.filter(range=>series.dates[range.index]==='2026-10-11'&&range.context==='activity').length,0);
  assert.equal(plot.axis.length,7);assert.match(plot.path,/ C/);
  assert.ok(plot.points.every((point,index)=>!index||point.x>plot.points[index-1].x));
  const threeHours=plot.points[1].x-plot.points[0].x,last35Minutes=plot.points.at(-1).x-plot.points.at(-2).x;
  assert.ok(Math.abs(threeHours/last35Minutes-180/35)<1e-8);
  series.dates.forEach((date,index)=>{
    if(date!=='2026-10-15')return;
    assert.equal(series.values[index],latest.series.day.values[latest.series.day.labels.indexOf(series.labels[index])]);
  });
  const day=latest.series.day,index=day.labels.indexOf('08:00'),observation=pulseObservation(day,index);
  assert.equal(observation.label,'Активность');assert.equal(observation.time,'08:00');
  assert.equal(observation.low,undefined);
  assert.equal(pulseObservation({...day,values:day.values.map(()=>60)},index).label,'Активность');
  assert.equal(pulseObservation(series,55).label,'Отдых');
});
test('breakdown totals use only the selected period and stress is a separate authored estimate',()=>{
  const day=pulseBreakdown(latest,'day'),week=pulseBreakdown(latest,'week');
  assert.deepEqual(day.map(item=>item.minutes),[444,60,20,45]);
  assert.deepEqual(week.map(item=>item.minutes),[3048,260,540,385]);
  assert.deepEqual([week[0].low,week[0].high],[50,71]);
  assert.deepEqual([week[1].low,week[1].high],[74,144]);
  assert.equal(week[1].rows.length,6);
  assert.equal(pulseDuration(385),'6 ч 25 мин');assert.equal(pulseDuration(540),'9 ч');
  const changedPulse={...latest,series:{...latest.series,day:{...latest.series.day,values:latest.series.day.values.map(()=>200)}}};
  assert.deepEqual(pulseBreakdown(changedPulse,'day'),day);
  const historical=metricsForDay(ACTIVITY_DAYS[4])[0];
  assert.equal(pulseBreakdown(historical,'day')[1].minutes,0);
  assert.deepEqual(pulseBreakdown(historical,'week'),week);
});
test('personal comparison excludes the selected day and future dates',()=>{
  const shortHistory={...latest,history:[]};
  const comparison=pulseComparison(shortHistory,'day',0);
  assert.equal(comparison.current,64);assert.equal(comparison.average,65);
  assert.equal(comparison.count,6);assert.equal(comparison.delta,-1);
  assert.deepEqual(comparison,pulseComparison(shortHistory,'day',8));
  assert.equal(pulseComparison(shortHistory,'week',0),null);
  const historicalIndex=pulseSeries(latest,'week').dates.indexOf('2026-10-10');
  const historical=pulseComparison(shortHistory,'week',historicalIndex);
  assert.equal(historical.count,1);assert.equal(historical.average,67);
  const changedFuture={...shortHistory,series:{...latest.series,week:{...latest.series.week,values:[67,65,900,900,900,900,900]}}};
  assert.deepEqual(historical,pulseComparison(changedFuture,'week',historicalIndex));
});
test('populated reference range uses earlier daily history and keeps intraday selection separate',()=>{
  const range=pulseReferenceRange(latest,'day',11);
  assert.equal(range.count,28);assert.equal(range.low,63);assert.equal(range.high,67);
  assert.equal(range.current,64);assert.equal(range.label,'15 окт');
  assert.ok(range.currentPosition>range.lowPosition&&range.currentPosition<range.highPosition);
  assert.deepEqual(range,pulseReferenceRange(latest,'day',8));
  const comparison=pulseComparison(latest,'day',11);
  assert.equal(comparison.count,7);assert.equal(comparison.average,65);assert.equal(comparison.delta,-1);
  const history=pulseReferenceRange(latest,'week',0);
  assert.equal(history.count,28);assert.equal(history.current,67);
  const changedFuture={...latest,series:{week:{...latest.series.week,values:[67,900,900,900,900,900,900]}}};
  assert.deepEqual(history,pulseReferenceRange(changedFuture,'week',0));
});
test('range model rejects missing selected dates and empty history without inventing limits',()=>{
  assert.equal(pulseReferenceRange({...latest,selectedDayId:'2026-10-01'},'day',0),null);
  assert.equal(pulseReferenceRange({...latest,history:[]},'week',0),null);
  assert.equal(pulseReferenceRange({...latest,history:[]},'week',1),null);
});
test('month and year aggregate only available records, with matching ranges and totals',()=>{
  const month=pulseSeries(latest,'month'),year=pulseSeries(latest,'year');
  assert.equal(month.values.length,15);assert.equal(year.values.length,10);
  assert.equal(month.starts[0],'2026-10-01');assert.equal(year.starts[0],'2026-01-01');
  for(const series of [month,year]){
    assert.equal(series.dates.at(-1),'2026-10-15');
    const plot=pulseChart(series);
    assert.equal(plot.ranges.length,series.values.length);
    assert.ok(plot.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
    series.ranges.forEach((range,index)=>assert.ok(range.low<=series.values[index]&&range.high>=series.values[index]));
  }
  const daily=pulseBreakdown(latest,'day'),monthly=pulseBreakdown(latest,'month'),yearly=pulseBreakdown(latest,'year');
  monthly.forEach((item,index)=>{
    assert.equal(item.dayCount,15);
    assert.equal(item.rows.at(-1).minutes,daily[index].minutes);
    assert.equal(item.minutes,item.rows.reduce((sum,row)=>sum+row.minutes,0));
    assert.deepEqual([yearly[index].rows.at(-1).low,yearly[index].rows.at(-1).high],[item.low,item.high]);
    assert.equal(yearly[index].rows.at(-1).minutes,item.minutes);
    assert.equal(yearly[index].dayCount,288);
    assert.equal(yearly[index].minutes,yearly[index].rows.reduce((sum,row)=>sum+row.minutes,0));
  });
});
test('long-period selection, labels and assistant context describe the same calendar bucket',()=>{
  const month=pulseSeries(latest,'month'),year=pulseSeries(latest,'year');
  assert.equal(pulseInitialIndex(latest,'month'),14);assert.equal(pulseInitialIndex(latest,'year'),9);
  assert.equal(pulseInitialIndex(metricsForDay(ACTIVITY_DAYS[1])[0],'month'),13);
  assert.equal(pulsePeriodLabel(latest,'month'),'Октябрь 2026');
  assert.equal(pulsePeriodLabel(latest,'year'),'2026 год');
  assert.equal(pulseSelectionLabel(month,0,'month'),'1 окт');
  assert.equal(pulseSelectionLabel(year,0,'year'),'Январь');
  assert.equal(pulseContext(latest,'year',0).title,'Пульс · Январь 2026');
  assert.equal(pulseContext(latest,'month',0).value,`${month.ranges[0].low}–${month.ranges[0].high} уд/мин`);
  assert.deepEqual(pulseChart(year).axisLabels,['янв','февр','март','апр','май','июнь','июль','авг','сент','окт']);
});

test('annual axis follows calendar months rather than rounding five sample indexes',()=>{
  const year=pulseSeries(latest,'year');
  const labels=series=>{const plot=pulseChart(series);return plot.axis.map(index=>plot.axisLabels[index]);};
  assert.deepEqual(labels(year),['янв','март','май','июль','сент']);
  const withoutFebruary=Object.fromEntries(Object.entries(year).map(([key,value])=>[key,Array.isArray(value)?value.filter((_,index)=>index!==1):value]));
  assert.deepEqual(labels(withoutFebruary),['янв','март','май','июль','сент']);
});

test('monthly axis keeps a seven-day calendar step for partial and sparse periods',()=>{
  const month=pulseSeries(latest,'month');
  const labels=series=>{const plot=pulseChart(series);return plot.axis.map(index=>plot.axisLabels[index]);};
  const filterDays=predicate=>Object.fromEntries(Object.entries(month).map(([key,value])=>[key,Array.isArray(value)?value.filter((_,index)=>predicate(index)):value]));
  assert.deepEqual(labels(month),[1,8,15]);
  assert.deepEqual(labels(filterDays(index=>index!==2)),[1,8,15]);
  assert.deepEqual(labels(filterDays(index=>index<13)),[1,8]);
});

test('duration sparklines average recorded durations, include zero and exclude future days',()=>{
  const rows=pulseDurationTrend(latest,'stress');
  assert.equal(rows.length,7);assert.equal(rows[0].date,'2026-10-09');
  assert.equal(rows.at(-1).minutes,(95+50+20)/3);
  assert.equal(pulseDurationTrend(latest,'recovery').at(-1).minutes,(50+70+45)/3);
  const historical=metricsForDay(ACTIVITY_DAYS[1])[0];
  assert.equal(pulseDurationTrend(historical,'stress').at(-1).date,'2026-10-14');
  const sparse={...latest,selectedDayId:'2026-10-10',pulseDays:[
    {date:'2026-10-01',stress:{minutes:900}},
    {date:'2026-10-08',stress:{minutes:0}},
    {date:'2026-10-09',stress:{}},
    {date:'2026-10-10',stress:{minutes:60}},
    {date:'2026-10-11',stress:{minutes:999}}
  ]};
  assert.deepEqual(pulseDurationTrend(sparse,'stress'),[{date:'2026-10-08',minutes:0},{date:'2026-10-10',minutes:30}]);
  assert.deepEqual(pulseDurationTrend({...latest,pulseDays:[]},'stress'),[]);
});
