import { describe, expect, it } from 'vitest';
import { getAverageCycleLength, getCycleDuration, getCycleStatus, getCurrentCycle, getFertileWindow, getLowerFertilityWindows, getNextCycleDate, getOvulationDate } from './date.js';

describe('经期日期规则', () => {
  const today = new Date('2026-08-22T09:00:00');

  it('按首尾日期计算包含首尾两天的持续天数', () => {
    expect(getCycleDuration('2026-08-01', '2026-08-05')).toBe(5);
    expect(getCycleDuration('2026-08-01', '')).toBeNull();
  });

  it('区分尚未开始、经期中和已结束', () => {
    expect(getCycleStatus({ startDate: '2026-08-25' }, today)).toBe('尚未开始');
    expect(getCycleStatus({ startDate: '2026-08-20', endDate: '2026-08-21' }, today)).toBe('已结束');
    expect(getCycleStatus({ startDate: '2026-08-20', endDate: '2026-08-22' }, today)).toBe('经期中');
    expect(getCycleStatus({ startDate: '2026-08-20' }, today)).toBe('进行中 · 未填写结束日期');
  });

  it('按历史开始日期计算平均周期，并选择当前记录', () => {
    const entries = [
      { startDate: '2026-06-01' },
      { startDate: '2026-06-29' },
      { startDate: '2026-07-27' },
    ];
    expect(getAverageCycleLength([...entries, { startDate: '2026-08-24' }], today)).toBe(28);
    expect(getCurrentCycle(entries, today)?.startDate).toBe('2026-07-27');
    expect(getNextCycleDate('2026-07-27', getAverageCycleLength(entries), today)).toBe('2026-08-24');
  });

  it('从下次预计日期推算排卵日、易孕期和非易孕区间', () => {
    expect(getOvulationDate('2026-08-29')).toBe('2026-08-15');
    expect(getFertileWindow('2026-08-29')).toEqual({ startDate: '2026-08-10', endDate: '2026-08-16' });
    expect(getLowerFertilityWindows('2026-08-01', '2026-08-29')).toEqual([
      { startDate: '2026-08-01', endDate: '2026-08-09' },
      { startDate: '2026-08-17', endDate: '2026-08-28' },
    ]);
  });
});
