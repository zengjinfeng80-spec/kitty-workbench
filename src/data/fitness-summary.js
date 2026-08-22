import { parseLocalDate, toLocalIso } from '../utils/date.js';

export const FITNESS_UNITS = {
  饮食: ['千卡'],
  运动: ['分钟'],
  饮水: ['升'],
  体重: ['千克'],
};

export function getDefaultFitnessUnit(type) {
  return FITNESS_UNITS[type]?.[0] ?? '';
}

export function parseFitnessValue(entry) {
  const numeric = Number(entry?.amount);
  if (Number.isFinite(numeric) && entry?.amount !== '') {
    return { amount: numeric, unit: entry.unit || getDefaultFitnessUnit(entry.type) };
  }
  const match = String(entry?.value ?? '').match(/-?\d+(?:\.\d+)?/);
  return {
    amount: match ? Number(match[0]) : 0,
    unit: entry?.unit || String(entry?.value ?? '').replace(/-?\d+(?:\.\d+)?\s*/, '').trim() || getDefaultFitnessUnit(entry?.type),
  };
}

export function formatFitnessValue(entry) {
  const { amount, unit } = parseFitnessValue(entry);
  return `${amount || 0} ${unit}`.trim();
}

export function getFitnessDraft(entry) {
  const parsed = parseFitnessValue(entry);
  return {
    type: entry.type,
    date: entry.date,
    amount: parsed.amount ? String(parsed.amount) : '',
    unit: parsed.unit || getDefaultFitnessUnit(entry.type),
    note: entry.note || '',
  };
}

export function createFitnessEntry(draft, id) {
  const amount = Number(draft.amount);
  if (!draft.date || !Number.isFinite(amount) || amount < 0) return null;
  return { id, type: draft.type, date: draft.date, amount, unit: draft.unit || getDefaultFitnessUnit(draft.type), value: `${amount} ${draft.unit || getDefaultFitnessUnit(draft.type)}`, note: draft.note.trim() };
}

export function getFitnessSummary(entries = [], now = new Date()) {
  const today = parseLocalDate(toLocalIso(now));
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const startIso = toLocalIso(start);
  const recent = entries.filter((entry) => entry.date >= startIso && entry.date <= toLocalIso(now));
  const sumType = (type) => recent.filter((entry) => entry.type === type).reduce((sum, entry) => sum + parseFitnessValue(entry).amount, 0);
  const weights = entries.filter((entry) => entry.type === '体重' && entry.date).sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));
  const latest = weights[0] ? parseFitnessValue(weights[0]).amount : null;
  const previous = weights[1] ? parseFitnessValue(weights[1]).amount : null;
  return { calories: sumType('饮食'), exerciseMinutes: sumType('运动'), waterLiters: sumType('饮水'), latestWeight: latest, weightDelta: latest !== null && previous !== null ? Number((latest - previous).toFixed(1)) : null };
}
