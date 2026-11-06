// Status text per language. Keep the keys in sync with extension/languages.js.
const STRINGS = {
  en: { last: (time) => `Last solve: ${time}`, empty: 'No solves yet' },
  fr: { last: (time) => `Dernier temps : ${time}`, empty: 'Aucun temps pour le moment' },
  es: { last: (time) => `Último tiempo: ${time}`, empty: 'Aún no hay tiempos' },
  de: { last: (time) => `Letzte Zeit: ${time}`, empty: 'Noch keine Zeiten' },
  pt: { last: (time) => `Último tempo: ${time}`, empty: 'Ainda sem tempos' },
  it: { last: (time) => `Ultimo tempo: ${time}`, empty: 'Ancora nessun tempo' },
  ru: { last: (time) => `Последнее время: ${time}`, empty: 'Пока нет сборок' },
  zh: { last: (time) => `上次成绩：${time}`, empty: '暂无成绩' },
  ja: { last: (time) => `前回のタイム：${time}`, empty: '記録なし' },
  ko: { last: (time) => `마지막 기록: ${time}`, empty: '기록 없음' },
};

module.exports = { STRINGS };
