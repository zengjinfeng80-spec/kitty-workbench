import { describe, expect, it } from 'vitest';
import {
  createChangeSet,
  countLocalRecords,
  mergeRecordSets,
  recordsToWorkbench,
  toCloudRecords,
} from './data-model.js';

const defaults = {
  profile: { nickname: 'zjinx', dark: false },
  tasks: [],
  records: [],
  events: [],
  fitnessEntries: [],
  keepsakes: [],
  diaryEntries: [],
  cycleEntries: [],
};

const localData = {
  ...defaults,
  profile: { nickname: '小樱', dark: true },
  tasks: [{ id: 7, text: '整理工作台', done: false }],
  records: [{ id: 9, amount: 35, note: '午餐', category: '餐饮' }],
};

const context = {
  userId: '11111111-1111-4111-8111-111111111111',
  deviceId: 'device-a',
  migrationId: '22222222-2222-4222-8222-222222222222',
  now: '2026-08-06T01:00:00.000Z',
};

describe('countLocalRecords', () => {
  it('按模块统计本地列表，不把个人设置计入记录总数', () => {
    expect(countLocalRecords(localData)).toEqual({
      tasks: 1,
      records: 1,
      events: 0,
      fitnessEntries: 0,
      keepsakes: 0,
      diaryEntries: 0,
      cycleEntries: 0,
      total: 2,
    });
  });
});

describe('toCloudRecords', () => {
  it('同一账号和旧记录多次转换会得到稳定 UUID', async () => {
    const first = await toCloudRecords(localData, context);
    const second = await toCloudRecords(localData, { ...context, now: '2026-08-07T01:00:00.000Z' });

    expect(first.map((record) => record.id)).toEqual(second.map((record) => record.id));
    expect(first.every((record) => /^[0-9a-f-]{36}$/.test(record.id))).toBe(true);
    expect(first.find((record) => record.record_type === 'task')?.payload.text).toBe('整理工作台');
  });
});

describe('mergeRecordSets', () => {
  it('同一记录保留 updated_at 较新的版本并保留软删除', () => {
    const older = { id: 'a', updated_at: '2026-08-06T01:00:00.000Z', deleted_at: null, payload: { text: '旧内容' } };
    const newerDeleted = { id: 'a', updated_at: '2026-08-06T02:00:00.000Z', deleted_at: '2026-08-06T02:00:00.000Z', payload: { text: '旧内容' } };

    expect(mergeRecordSets([older], [newerDeleted])).toEqual([newerDeleted]);
  });

  it('时间相同时服务端版本优先', () => {
    const timestamp = '2026-08-06T01:00:00.000Z';
    const local = { id: 'a', updated_at: timestamp, payload: { text: '本地' } };
    const remote = { id: 'a', updated_at: timestamp, payload: { text: '云端' } };

    expect(mergeRecordSets([local], [remote])).toEqual([remote]);
  });
});

describe('recordsToWorkbench', () => {
  it('过滤软删除记录并还原工作台结构', () => {
    const records = [
      { id: 'a', record_type: 'task', payload: { id: 7, text: '保留', done: false }, deleted_at: null },
      { id: 'b', record_type: 'task', payload: { id: 8, text: '删除', done: false }, deleted_at: '2026-08-06T02:00:00.000Z' },
      { id: 'p', record_type: 'profile', payload: { nickname: '小樱', dark: true }, deleted_at: null },
    ];

    const result = recordsToWorkbench(records, defaults);
    expect(result.tasks).toEqual([{ id: 7, text: '保留', done: false }]);
    expect(result.profile).toEqual({ nickname: '小樱', dark: true });
  });
});

describe('createChangeSet', () => {
  it('删除本地记录时生成带时间戳的软删除版本', async () => {
    const previous = { ...localData };
    const next = { ...localData, tasks: [] };

    const changes = await createChangeSet(previous, next, context);
    const deletedTask = changes.find((record) => record.record_type === 'task');

    expect(deletedTask.deleted_at).toBe(context.now);
    expect(deletedTask.updated_at).toBe(context.now);
  });
});
