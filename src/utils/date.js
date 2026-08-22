export function toLocalIso(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function getGreeting(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return '早安';
  if (hour >= 11 && hour < 18) return '午安';
  return '晚上好';
}

export function getTodayIso() {
  return toLocalIso(new Date());
}

export function parseLocalDate(value) {
  return new Date(`${value}T00:00:00`);
}

export function formatDate(value) {
  return value ? value.replaceAll('-', '/') : '';
}

export function formatCountdown(value, now = new Date()) {
  const days = Math.ceil((parseLocalDate(value) - parseLocalDate(toLocalIso(now))) / 86_400_000);
  if (days === 0) return '就是今天';
  return days > 0 ? `还有 ${days} 天` : `已过去 ${Math.abs(days)} 天`;
}

export function getCycleDay(startDate, cycleLength, now = new Date()) {
  const elapsed = Math.floor((parseLocalDate(toLocalIso(now)) - parseLocalDate(startDate)) / 86_400_000);
  if (elapsed < 0) return null;
  return (elapsed % cycleLength) + 1;
}

export function getCycleDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const duration = Math.floor((parseLocalDate(endDate) - parseLocalDate(startDate)) / 86_400_000) + 1;
  return duration > 0 ? duration : null;
}

export function getCycleStatus(entry, now = new Date()) {
  if (!entry?.startDate) return '暂无开始日期';
  const today = toLocalIso(now);
  if (entry.startDate > today) return '尚未开始';
  if (!entry.endDate) return '进行中 · 未填写结束日期';
  return today <= entry.endDate ? '经期中' : '已结束';
}

export function getCurrentCycle(entries = [], now = new Date()) {
  const today = toLocalIso(now);
  return [...entries]
    .filter((entry) => entry?.startDate && entry.startDate <= today)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))[0] ?? null;
}

export function getAverageCycleLength(entries = [], now = new Date()) {
  const today = toLocalIso(now);
  const starts = [...new Set(entries
    .map((entry) => entry?.startDate)
    .filter((startDate) => startDate && startDate <= today))].sort();
  const intervals = [];
  for (let index = 1; index < starts.length; index += 1) {
    const days = Math.floor((parseLocalDate(starts[index]) - parseLocalDate(starts[index - 1])) / 86_400_000);
    if (days >= 20 && days <= 45) intervals.push(days);
  }
  if (!intervals.length) return null;
  return Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length);
}

function shiftIsoDate(value, days) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
}

export function getOvulationDate(nextCycleDate) {
  return nextCycleDate ? shiftIsoDate(nextCycleDate, -14) : null;
}

export function getFertileWindow(nextCycleDate) {
  if (!nextCycleDate) return null;
  const ovulationDate = getOvulationDate(nextCycleDate);
  return { startDate: shiftIsoDate(ovulationDate, -5), endDate: shiftIsoDate(ovulationDate, 1) };
}

export function getLowerFertilityWindows(startDate, nextCycleDate) {
  const fertileWindow = getFertileWindow(nextCycleDate);
  if (!startDate || !fertileWindow || startDate >= nextCycleDate) return [];
  const windows = [];
  if (startDate < fertileWindow.startDate) windows.push({ startDate, endDate: shiftIsoDate(fertileWindow.startDate, -1) });
  if (fertileWindow.endDate < shiftIsoDate(nextCycleDate, -1)) windows.push({ startDate: shiftIsoDate(fertileWindow.endDate, 1), endDate: shiftIsoDate(nextCycleDate, -1) });
  return windows;
}

export function getNextCycleDate(startDate, cycleLength, now = new Date()) {
  const start = parseLocalDate(startDate);
  const elapsed = Math.max(0, Math.floor((parseLocalDate(toLocalIso(now)) - start) / 86_400_000));
  const cycles = Math.floor(elapsed / cycleLength) + 1;
  const next = new Date(start);
  next.setDate(next.getDate() + cycles * cycleLength);
  return toLocalIso(next);
}
