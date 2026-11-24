import { getPreference, setPreference } from './ui.js';

export const audioDefaults = Object.freeze({ listens: 1, reading: 0, interval: 15, initial: false, repeat: false, rate: 1 });
export const paperFields = {
  size: { min: 10, max: 20, step: 1, default: 11 },
  leading: { min: 1, max: 2, step: .05, default: 1.45 },
  questionGap: { min: 0, max: 14, step: 1, default: 3 },
  lineGap: { min: 4, max: 12, step: 1, default: 6 },
  marginTop: { min: 5, max: 30, step: 1, default: 12 },
  marginRight: { min: 5, max: 30, step: 1, default: 12 },
  marginBottom: { min: 5, max: 30, step: 1, default: 12 },
  marginLeft: { min: 5, max: 30, step: 1, default: 12 }
};
export const fonts = { sans: 'Arial, sans-serif', serif: 'Georgia, serif', verdana: 'Verdana, sans-serif' };
export const rates = [.8, .9, 1, 1.1, 1.2];
export const lineLimit = 12;

export function within(value, min, max, fallback, step = 1) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = min + Math.round((value - min) / step) * step;
  return Math.max(min, Math.min(max, Number(rounded.toFixed(2))));
}

export function audioSettings(activity, values = {}) {
  const listens = within(values.listens, 1, 5, audioDefaults.listens);
  const reading = within(values.reading, 0, 300, audioDefaults.reading);
  return {
    listens, reading,
    interval: within(values.interval, 0, 300, audioDefaults.interval),
    initial: Boolean(activity.audioPrompts?.initial && reading && values.initial === true),
    repeat: Boolean(activity.audioPrompts?.repeat && listens > 1 && values.repeat === true),
    rate: rates.includes(values.rate) ? values.rate : audioDefaults.rate
  };
}

export function paperSettings(activity, values = {}) {
  const layout = { font: Object.hasOwn(fonts, values.font) ? values.font : 'serif', questions: {} };
  for (const [key, field] of Object.entries(paperFields)) {
    layout[key] = within(values[key], field.min, field.max, field.default, field.step);
  }
  for (const question of activity.questions) {
    const saved = values.questions?.[question.numero];
    const lines = question.lines ?? (question.opcions ? 0 : 2);
    layout.questions[question.numero] = {
      visible: saved?.visible !== false,
      lines: within(saved?.lines, 0, lineLimit, lines)
    };
  }
  return layout;
}

function readSettings(type, activity) {
  try { return JSON.parse(getPreference(type + ':' + activity.id, '{}')) || {}; }
  catch { return {}; }
}

export function savedAudio(activity) {
  return audioSettings(activity, readSettings('audio', activity));
}

export function savedPaper(activity) {
  return paperSettings(activity, readSettings('paper', activity));
}

export function saveSettings(type, activity, settings) {
  setPreference(type + ':' + activity.id, JSON.stringify(settings));
}
