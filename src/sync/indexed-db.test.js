import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeWorkbenchDb,
  enqueueChanges,
  loadAccountRecords,
  readPendingChanges,
  removePendingChanges,
  saveAccountRecords,
} from './indexed-db.js';

beforeEach(async () => {
  closeWorkbenchDb();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('kitty-workbench-sync');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

describe('账号缓存', () => {
  it('不同账号的数据相互隔离', async () => {
    await saveAccountRecords('user-a', [{ id: 'record-a', payload: { text: 'A' } }]);
    await saveAccountRecords('user-b', [{ id: 'record-b', payload: { text: 'B' } }]);

    expect(await loadAccountRecords('user-a')).toEqual([{ id: 'record-a', payload: { text: 'A' } }]);
    expect(await loadAccountRecords('user-b')).toEqual([{ id: 'record-b', payload: { text: 'B' } }]);
  });
});

describe('离线队列', () => {
  it('关闭并重新打开数据库后仍保留待同步记录', async () => {
    await enqueueChanges('user-a', [{ id: 'record-a', updated_at: '2026-08-06T01:00:00.000Z' }]);
    closeWorkbenchDb();

    expect(await readPendingChanges('user-a')).toEqual([{ id: 'record-a', updated_at: '2026-08-06T01:00:00.000Z' }]);
  });

  it('同步成功后只移除指定记录', async () => {
    await enqueueChanges('user-a', [{ id: 'a' }, { id: 'b' }]);
    await removePendingChanges('user-a', ['a']);

    expect(await readPendingChanges('user-a')).toEqual([{ id: 'b' }]);
  });
});
