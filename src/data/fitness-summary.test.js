import { describe, expect, it } from 'vitest';
import { createFitnessEntry, getFitnessDraft, getFitnessSummary, parseFitnessValue } from './fitness-summary.js';

describe('减脂记录规则', () => {
  it('兼容旧自由文本并生成结构化记录', () => {
    expect(parseFitnessValue({ type: '饮食', value: '320 千卡' })).toEqual({ amount: 320, unit: '千卡' });
    expect(createFitnessEntry({ type: '运动', date: '2026-08-22', amount: '45', unit: '分钟', note: '快走' }, 1)).toMatchObject({ amount: 45, unit: '分钟', value: '45 分钟' });
    expect(getFitnessDraft({ type: '饮水', date: '2026-08-22', value: '1.2 升', note: '上午' })).toMatchObject({ amount: '1.2', unit: '升' });
  });

  it('汇总最近 7 天和最新体重变化', () => {
    const entries = [
      { id: 1, type: '饮食', date: '2026-08-22', value: '500 千卡' },
      { id: 2, type: '运动', date: '2026-08-18', amount: 30, unit: '分钟' },
      { id: 3, type: '饮水', date: '2026-08-16', amount: 1.5, unit: '升' },
      { id: 4, type: '体重', date: '2026-08-20', amount: 60, unit: '千克' },
      { id: 5, type: '体重', date: '2026-08-22', amount: 59.4, unit: '千克' },
    ];
    expect(getFitnessSummary(entries, new Date('2026-08-22T09:00:00'))).toMatchObject({ calories: 500, exerciseMinutes: 30, waterLiters: 1.5, latestWeight: 59.4, weightDelta: -0.6 });
  });
});
