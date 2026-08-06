import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeWorkbenchDb, enqueueChanges, readPendingChanges } from './indexed-db.js';
import { createSyncEngine } from './sync-engine.js';

function createClient({ remote = [], upsertError = null } = {}) {
  const upsert = vi.fn(async () => ({ error: upsertError }));
  const insert = vi.fn(async () => ({ error: null }));
  const updateEq = vi.fn(async () => ({ error: null }));
  const client = {
    from: vi.fn((table) => {
      if (table === 'workbench_records') {
        return {
          select: () => ({ eq: async () => ({ data: remote, error: null }) }),
          upsert,
        };
      }
      return {
        insert,
        update: () => ({ eq: updateEq }),
      };
    }),
  };
  return { client, upsert, insert, updateEq };
}

beforeEach(async () => {
  closeWorkbenchDb();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('kitty-workbench-sync');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
});

describe('同步引擎', () => {
  it('上传成功后移除待同步记录', async () => {
    const { client, upsert } = createClient();
    const record = { id: 'a', user_id: 'user-a', updated_at: '2026-08-06T01:00:00.000Z' };
    await enqueueChanges('user-a', [record]);

    const engine = createSyncEngine({ client, userId: 'user-a', deviceId: 'device-a' });
    await engine.push();

    expect(upsert).toHaveBeenCalledWith([record], { onConflict: 'user_id,id' });
    expect(await readPendingChanges('user-a')).toEqual([]);
  });

  it('上传失败时保留待同步记录', async () => {
    const { client } = createClient({ upsertError: new Error('offline') });
    const record = { id: 'a', user_id: 'user-a' };
    await enqueueChanges('user-a', [record]);

    const engine = createSyncEngine({ client, userId: 'user-a', deviceId: 'device-a' });
    await expect(engine.push()).rejects.toThrow('offline');
    expect(await readPendingChanges('user-a')).toEqual([record]);
  });

  it('迁移使用固定批次并 upsert 记录', async () => {
    const { client, insert, upsert, updateEq } = createClient();
    const data = {
      profile: { nickname: '小樱' }, tasks: [{ id: 1, text: '迁移', done: false }], records: [], events: [],
      fitnessEntries: [], keepsakes: [], diaryEntries: [], cycleEntries: [],
    };
    const engine = createSyncEngine({ client, userId: 'user-a', deviceId: 'device-a' });

    await engine.migrate(data, 'migration-a');

    expect(insert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(updateEq).toHaveBeenCalledWith('id', 'migration-a');
  });

  it('迁移完成后拉取并合并账号原有云端记录', async () => {
    const remoteRecord = {
      id: 'remote-a', user_id: 'user-a', record_type: 'task',
      payload: { id: 2, text: '另一台设备', done: false },
      updated_at: '2026-08-06T02:00:00.000Z', deleted_at: null,
    };
    const { client } = createClient({ remote: [remoteRecord] });
    const data = {
      profile: { nickname: '小樱' }, tasks: [{ id: 1, text: '本机记录', done: false }], records: [], events: [],
      fitnessEntries: [], keepsakes: [], diaryEntries: [], cycleEntries: [],
    };
    const engine = createSyncEngine({ client, userId: 'user-a', deviceId: 'device-a' });

    const merged = await engine.migrate(data, 'migration-a');

    expect(merged).toContainEqual(remoteRecord);
    expect(merged.some((record) => record.payload?.text === '本机记录')).toBe(true);
  });
});
