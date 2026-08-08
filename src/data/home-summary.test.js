import { describe, expect, it } from 'vitest';
import { getHomeSummary } from './home-summary.js';

const today = new Date('2026-08-08T09:00:00');

describe('getHomeSummary', () => {
  it('从当前工作台数据实时计算首页摘要', () => {
    const data = {
      tasks: [
        { id: 1, text: '完成报告', done: true },
        { id: 2, text: '整理资料', done: false },
      ],
      records: [
        { id: 1, amount: 36, note: '午餐', category: '餐饮', time: '刚刚' },
        { id: 2, amount: 20, note: '昨天支出', category: '日用', time: '昨天 18:00' },
      ],
      fitnessEntries: [
        { id: 1, type: '饮食', value: '320 千卡', note: '早餐', date: '2026-08-08' },
        { id: 2, type: '饮食', value: '180 千卡', note: '昨天', date: '2026-08-07' },
      ],
      cycleEntries: [{ id: 1, startDate: '2026-08-06', cycleLength: 28, note: '当前周期' }],
    };

    expect(getHomeSummary(data, today)).toMatchObject({
      taskCount: 2,
      completedCount: 1,
      progress: 50,
      calories: 320,
      spending: 36,
      cycleDay: 3,
    });
  });

  it('没有记录时返回可直接展示的零值', () => {
    const empty = { tasks: [], records: [], fitnessEntries: [], cycleEntries: [] };

    expect(getHomeSummary(empty, today)).toMatchObject({
      taskCount: 0,
      completedCount: 0,
      progress: 0,
      calories: 0,
      spending: 0,
      cycleDay: null,
    });
  });
});
