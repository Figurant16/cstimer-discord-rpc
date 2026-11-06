const MAX_LEN = 128;

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

function buildActivity({ avg1, avg2, last }, startedAt) {
  const lastTime = formatTime(last);
  return {
    details: `${text(avg1, 'ao5: -')} • ${text(avg2, 'ao12: -')}`.slice(0, MAX_LEN),
    state: lastTime ? `Dernier temps : ${lastTime}` : 'Aucun temps pour le moment',
    timestamps: { start: startedAt },
  };
}

module.exports = { formatTime, buildActivity };
