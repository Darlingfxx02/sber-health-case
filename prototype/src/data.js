import {
  PULSE_DEMO_DAY,
  PULSE_DEMO_ARCHIVE,
  PULSE_DEMO_WEEK,
  PULSE_DEMO_MONTH,
  PULSE_DEMO_YEAR,
} from "./pulse-demo.js";
import { pulseDaySeries, pulseLatestObservation } from "./pulse-chart.js";
export const makeChats = () => [
  {
    id: "chat-current",
    title: "Новый чат",
    date: "Сегодня",
    messages: [],
    contexts: [],
    draft: "",
    pending: 0,
  },
  {
    id: "chat-visit",
    title: "Вопросы к терапевту",
    date: "12 октября",
    messages: [
      { role: "user", text: "Помоги собрать вопросы к следующему приёму." },
      {
        role: "assistant",
        text: "Можно обсудить результаты последних анализов, назначения и план наблюдения. Что хотелось бы уточнить в первую очередь?",
      },
    ],
    contexts: [],
    draft: "",
    pending: 0,
  },
  {
    id: "chat-records",
    title: "Мои медицинские документы",
    date: "2 октября",
    messages: [
      { role: "user", text: "Где посмотреть заключение после приёма?" },
      {
        role: "assistant",
        text: "Заключение терапевта от 2 октября находится в медкарте. Откройте документ и нажмите «Обсудить», чтобы добавить его к разговору.",
      },
    ],
    contexts: [],
    draft: "",
    pending: 0,
  },
];
export const CARDS = [
  {
    id: "labs",
    group: "actions",
    kind: "action",
    title: "Контрольные анализы",
    description: "Общий анализ крови<br>Ферритин",
    eyebrow: "ЗАВТРА · 08:30",
    meta: "17 октября · 08:30",
    source: "Назначение терапевта от 02.10",
    appointment: {
      date: "2026-10-17",
      time: "08:30",
      title: "Анализы",
      icon: "labs-fill",
    },
  },
  {
    id: "appointment",
    group: "actions",
    kind: "action",
    title: "Приём терапевта",
    description: "Обсудить результаты<br>и план наблюдения",
    eyebrow: "22 ОКТЯБРЯ",
    meta: "22 октября · 16:00",
    appointment: {
      date: "2026-10-22",
      time: "16:00",
      title: "Терапевт",
      icon: "calendar-fill",
    },
  },
  {
    id: "document",
    group: "documents",
    kind: "wide",
    title: "Заключение терапевта",
    description: "Рекомендации и назначения",
    eyebrow: "МОЯ МЕДКАРТА",
    meta: "2 октября · PDF, 2 страницы",
    source: "Демонстрационный документ",
  },
  {
    id: "appointment-cardiology",
    group: "actions",
    kind: "action",
    title: "Приём кардиолога",
    description: "Консультация кардиолога",
    meta: "18 октября · 10:00",
    source: "Демонстрационная запись",
    details: [
      "18 октября, 10:00",
      "Консультация кардиолога",
      "Демонстрационная запись",
    ],
    appointment: {
      date: "2026-10-18",
      time: "10:00",
      title: "Кардиолог",
      icon: "heart-fill",
    },
  },
];
export const RESULTS = [
  {
    id: "result-blood",
    kind: "result",
    title: "Общий анализ крови",
    meta: "16 октября · PDF",
    preview: "assets/results/blood.svg",
    color: "#64A989",
  },
  {
    id: "result-ferritin",
    kind: "result",
    title: "Ферритин",
    meta: "16 октября · PDF",
    preview: "assets/results/ferritin.svg",
    color: "#6A95D1",
  },
  {
    id: "result-vitamin-d",
    kind: "result",
    title: "Витамин D",
    meta: "16 октября · PDF",
    preview: "assets/results/vitamin-d.svg",
    color: "#A18DC6",
  },
];
// Same fixed demo week as the activity history.
const days = [
  "9 окт",
  "10 окт",
  "11 окт",
  "12 окт",
  "13 окт",
  "14 окт",
  "15 окт",
];
const measurementDays = [
  "2026-10-09",
  "2026-10-10",
  "2026-10-11",
  "2026-10-12",
  "2026-10-13",
  "2026-10-14",
  "2026-10-15",
];
// Fictional daily resting-pulse history for the populated detail prototype.
// These are illustrative records, not the user's health data or a clinical baseline.
const pulseDemoHistory = [
  68, 67, 69, 66, 67, 68, 66, 65, 68, 66, 67, 65, 66, 64, 67, 66, 64, 65, 66,
  63, 65, 64, 66, 63, 64, 62, 65, 64,
].map((value, index) => ({
  date: new Date(Date.UTC(2026, 8, 11 + index)).toISOString().slice(0, 10),
  value,
}));
export const HEALTH_METRICS = [
  {
    id: "pulse",
    kind: "metric",
    title: "Пульс",
    value: "64 уд/мин",
    unit: "уд/мин",
    color: "#2fbc90",
    icon: "pulse",
    caption: "Последнее измерение",
    source: "Часы · сегодня, 09:35",
    history: pulseDemoHistory,
    pulseDays: PULSE_DEMO_ARCHIVE,
    detailSeries: {
      week: PULSE_DEMO_WEEK,
      month: PULSE_DEMO_MONTH,
      year: PULSE_DEMO_YEAR,
    },
    series: {
      day: PULSE_DEMO_DAY,
      week: { labels: days, values: [67, 65, 66, 63, 65, 62, 64] },
    },
  },
  {
    id: "oxygen",
    kind: "metric",
    title: "Кислород в крови",
    value: "98%",
    unit: "%",
    color: "#398eaf",
    icon: "activity",
    caption: "Последнее измерение",
    source: "Часы · сегодня, 09:30",
    series: {
      day: {
        labels: ["00:15", "02:20", "04:10", "06:30", "08:15", "09:30"],
        values: [98, 97, 98, 97, 99, 98],
      },
      week: { labels: days, values: [98, 98, 97, 99, 98, 97, 98] },
    },
  },
  {
    id: "sleep",
    kind: "metric",
    title: "Сон",
    value: "7 ч 24 мин",
    unit: "мин",
    color: "#7b83bd",
    icon: "moon",
    caption: "Сегодня ночью",
    source: "Часы · сегодня, 07:12",
    series: {
      week: { labels: days, values: [412, 458, 401, 469, 426, 438, 444] },
    },
  },
  {
    id: "steps",
    kind: "metric",
    title: "Шаги",
    value: "960 шагов",
    unit: "шагов",
    color: "#2fbc90",
    icon: "distance-fill",
    caption: "За день",
    source: "Часы · сегодня, 09:35",
    goal: 8000,
    series: {
      week: { labels: days, values: [4270, 9600, 3200, 7360, 5150, 8530, 960] },
    },
  },
];
export function formatHealthValue(metric, value) {
  return metric.id === "sleep"
    ? `${Math.floor(value / 60)} ч ${value % 60} мин`
    : metric.id === "oxygen"
      ? `${value}%`
      : `${metric.id === "steps" ? value.toLocaleString("ru-RU") : value} ${metric.unit}`;
}
export const ACTIVITY_DAYS = [
  {
    id: "2026-10-15",
    label: "Чт",
    date: "15 октября",
    shortDate: "15",
    progress: [60, 12, 86],
    values: ["360 ккал", "0,72 км", "1 720 ккал"],
  },
  {
    id: "2026-10-14",
    label: "Ср",
    date: "14 октября",
    shortDate: "14",
    progress: [100, 100, 100],
    values: ["620 ккал", "6,4 км", "2 000 ккал"],
  },
  {
    id: "2026-10-13",
    label: "Вт",
    date: "13 октября",
    shortDate: "13",
    progress: [95, 0, 0],
    values: ["570 ккал", "Нет записей", "Нет записей"],
  },
  {
    id: "2026-10-12",
    label: "Пн",
    date: "12 октября",
    shortDate: "12",
    progress: [18, 92, 0],
    values: ["108 ккал", "5,52 км", "Нет записей"],
  },
  {
    id: "2026-10-11",
    label: "Вс",
    date: "11 октября",
    shortDate: "11",
    progress: [0, 0, 100],
    values: ["Нет записей", "Нет записей", "2 000 ккал"],
  },
  {
    id: "2026-10-10",
    label: "Сб",
    date: "10 октября",
    shortDate: "10",
    progress: [100, 100, 100],
    values: ["685 ккал", "7,2 км", "2 000 ккал"],
  },
  {
    id: "2026-10-09",
    label: "Пт",
    date: "9 октября",
    shortDate: "9",
    progress: [70, 0, 35],
    values: ["420 ккал", "Нет записей", "700 ккал"],
  },
];

// The latest recorded day is "today" in this fixed prototype dataset.
export const TODAY_ACTIVITY = ACTIVITY_DAYS[0];

export function demoReply(prompt, context) {
  const files = context.filter((c) => c.kind === "file");
  const metrics = context.filter((c) => c.kind === "metric");
  if (files.length)
    return `В контексте ${files.length === 1 ? "добавлен файл" : "добавлены файлы"}: ${files.map((c) => c.title).join(", ")}.\n\nФайл доступен в этом разговоре. В демонстрационном режиме содержимое документов не анализируется. Можно проверить добавление, удаление и сочетание файлов с карточками.`;
  if (context.some((c) => c.kind === "result"))
    return `В контексте: ${context
      .filter((c) => c.kind === "result")
      .map((c) => c.title)
      .join(
        ", ",
      )}. Это демонстрационные документы от 16 октября. Можно обсудить каждый отдельно или добавить другие результаты.`;
  if (context.some((c) => c.id === "labs"))
    return "В карточке на завтра, 17 октября в 08:30, указаны общий анализ крови и ферритин. Источник — назначение терапевта от 2 октября.\n\nВ самой карточке инструкции по подготовке нет. Добавьте памятку лаборатории, чтобы связать её с назначением.";
  if (metrics.length)
    return (
      metrics.map((c) => `${c.title}: ${c.value}.`).join("\n") +
      "\n\nОткройте показатель на главной, чтобы посмотреть дни на графике. Отдельный день тоже можно добавить в контекст разговора."
    );
  if (context.length)
    return `В разговоре учитываются: ${context.map((c) => c.title).join(", ")}.\n\nМожно сопоставить эти записи, уточнить даты и подготовить вопросы для следующего приёма. О чём хотите узнать подробнее?`;
  if (/самочувств|чувствую/i.test(prompt))
    return "Расскажите, как вы себя чувствуете и когда заметили изменение. Можно добавить показатель активности или документ, чтобы связать вопрос с конкретными данными.";
  return "На главной — история активности по дням. Ближайшее событие — контрольные анализы завтра.\n\nОткройте нужную карточку и нажмите «Обсудить», чтобы добавить её к вопросу.";
}

export const CARE = {
  id: "care",
  kind: "care",
  title: "Врач и обследования",
  meta: "Записи и назначения",
};
export const activityContext = (day) => ({
  id: `activity-${day.id}`,
  kind: "activity",
  title: "Центр активности",
  meta: day.date,
  day,
});

// Stable date keys connect the ascending metric series to the descending day picker.
HEALTH_METRICS.forEach((metric) => {
  metric.series.week.dates = measurementDays;
});
export function metricsForDay(day) {
  return HEALTH_METRICS.map((metric) => {
    const selectedIndex = metric.series.week.dates.indexOf(day.id);
    const lastObservation =
      metric.id === "pulse" && selectedIndex >= 0
        ? pulseLatestObservation(metric, day.id)
        : null;
    const reading =
      selectedIndex < 0
        ? null
        : (lastObservation?.value ?? metric.series.week.values[selectedIndex]);
    const latest = selectedIndex === metric.series.week.values.length - 1;
    const daily =
      metric.id === "pulse" && selectedIndex >= 0
        ? pulseDaySeries(metric, day.id)
        : latest
          ? metric.series.day
          : undefined;
    return {
      ...metric,
      reading,
      lastObservation,
      selectedIndex,
      selectedDate: day.date,
      selectedDayId: day.id,
      value:
        reading === null ? "Нет данных" : formatHealthValue(metric, reading),
      source: latest
        ? metric.source.replace("сегодня", day.date)
        : `Часы · ${day.date}`,
      series: daily
        ? { ...metric.series, day: daily }
        : { week: metric.series.week },
    };
  });
}
