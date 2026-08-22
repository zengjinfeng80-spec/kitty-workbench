import { getCycleDay, getRecordIsoDate, toLocalIso } from '../utils/date.js';
import { parseFitnessValue } from './fitness-summary.js';

function isTodayRecord(record, todayIso) {
  return getRecordIsoDate(record, new Date(`${todayIso}T12:00:00`)) === todayIso;
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
      .reduce((sum, entry) => sum + parseFitnessValue(entry).amount, 0),
    spending: (data.records ?? [])
      .filter((record) => isTodayRecord(record, todayIso))
      .reduce((sum, record) => sum + Number(record.amount || 0), 0),
    cycleDay: currentCycle ? getCycleDay(currentCycle.startDate, currentCycle.cycleLength, now) : null,
  };
}
