const { STRINGS } = require('./languages');

const DEFAULT_LANGUAGE = 'en';
const MAX_LEN = 128;
const LOGO_URL = 'https://cstimer.net/cstimer512x512.png';

function formatTime(raw) {
  if (!Array.isArray(raw)) return null;
  const [penalty, ms] = raw;
  if (!Number.isFinite(penalty) || !Number.isFinite(ms)) return null;
  if (penalty === -1) return 'DNF';
  const total = ms + penalty;
  const centis = Math.round(total / 10);
  const minutes = Math.floor(centis / 6000);
  const seconds = (centis - minutes * 6000) / 100;
  const text = minutes > 0
    ? `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
    : seconds.toFixed(2);
  return penalty > 0 ? `${text}+` : text;
}

const text = (value, fallback) => (typeof value === 'string' && value ? value : fallback);

function stringsFor(language) {
  const code = String(language).slice(0, 2).toLowerCase();
  return STRINGS[code] ?? STRINGS[DEFAULT_LANGUAGE];
}

function buildActivity({ session, avg1, avg2, last, language }, startedAt) {
  const lastTime = formatTime(last);
  const strings = stringsFor(language);
  const averages = `${text(avg1, 'ao5: -')} • ${text(avg2, 'ao12: -')}`;
  const name = typeof session === 'string' ? session.trim() : '';
  return {
    details: (name ? `${name} • ${averages}` : averages).slice(0, MAX_LEN),
    state: lastTime ? strings.last(lastTime) : strings.empty,
    timestamps: { start: startedAt },
    assets: { large_image: LOGO_URL, large_text: 'csTimer' },
  };
}

module.exports = { formatTime, buildActivity };
