import { mergeRecordSets, toCloudRecords } from './data-model.js';
import {
  enqueueChanges,
  loadAccountRecords,
  readPendingChanges,
  removePendingChanges,
  saveAccountRecords,
} from './indexed-db.js';

function assertNoError(error) {
  if (error) throw error;
}

export function createSyncEngine({ client, userId, deviceId }) {
  if (!client || !userId) throw new Error('同步引擎缺少账号配置');

  async function pull() {
    const { data = [], error } = await client.from('workbench_records').select('*').eq('user_id', userId);
    assertNoError(error);
    const local = await loadAccountRecords(userId);
    const merged = mergeRecordSets(local, data);
    await saveAccountRecords(userId, merged);
    return merged;
  }

  async function push() {
    const pending = await readPendingChanges(userId);
    if (!pending.length) return [];
    const { error } = await client.from('workbench_records').upsert(pending, { onConflict: 'user_id,id' });
    assertNoError(error);
    await saveAccountRecords(userId, pending);
    await removePendingChanges(userId, pending.map((record) => record.id));
    return pending;
  }

  async function sync() {
    await push();
    return pull();
  }

  async function migrate(localData, migrationId = crypto.randomUUID()) {
    const counts = Object.fromEntries(Object.entries(localData)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, value.length]));
    const { error: batchError } = await client.from('migration_batches').insert({
      id: migrationId,
      user_id: userId,
      device_id: deviceId,
      module_counts: counts,
      status: 'running',
    });
    assertNoError(batchError);

    const records = await toCloudRecords(localData, { userId, deviceId, migrationId });
    const { error: recordsError } = await client.from('workbench_records').upsert(records, { onConflict: 'user_id,id' });
    assertNoError(recordsError);
    await saveAccountRecords(userId, records);

    const { error: completeError } = await client.from('migration_batches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', migrationId);
    assertNoError(completeError);
    return pull();
  }

  return { pull, push, sync, migrate, enqueue: (records) => enqueueChanges(userId, records) };
}
