import { getCycleDay, toLocalIso } from '../utils/date.js';

function parseLeadingNumber(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function isTodayRecord(record, todayIso) {
  if (record.date) return record.date === todayIso;
  return record.time === '刚刚' || record.time?.startsWith('今天');
}

export function getHomeSummary(data, now = new Date()) {
  const todayIso = toLocalIso(now);
  const tasks = data.tasks ?? [];
  const completedCount = tasks.filter((task) => task.done).length;
  const currentCycle = [...(data.cycleEntries ?? [])]
    .filter((entry) => entry.startDate <= todayIso)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))[0];

  return {
    taskCount: tasks.length,
    completedCount,
    progress: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
    calories: (data.fitnessEntries ?? [])
      .filter((entry) => entry.type === '饮食' && entry.date === todayIso)
      .reduce((sum, entry) => sum + parseLeadingNumber(entry.value), 0),
    spending: (data.records ?? [])
      .filter((record) => isTodayRecord(record, todayIso))
      .reduce((sum, record) => sum + Number(record.amount || 0), 0),
    cycleDay: currentCycle ? getCycleDay(currentCycle.startDate, currentCycle.cycleLength, now) : null,
  };
}
