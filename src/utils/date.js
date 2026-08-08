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

export function getNextCycleDate(startDate, cycleLength, now = new Date()) {
  const start = parseLocalDate(startDate);
  const elapsed = Math.max(0, Math.floor((parseLocalDate(toLocalIso(now)) - start) / 86_400_000));
  const cycles = Math.floor(elapsed / cycleLength) + 1;
  const next = new Date(start);
  next.setDate(next.getDate() + cycles * cycleLength);
  return toLocalIso(next);
}
