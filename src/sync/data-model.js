export const MODULE_FIELDS = {
  tasks: 'task',
  records: 'account',
  events: 'event',
  fitnessEntries: 'fitness',
  keepsakes: 'keepsake',
  diaryEntries: 'diary',
  cycleEntries: 'cycle',
};

const RECORD_FIELDS = Object.keys(MODULE_FIELDS);

export function countLocalRecords(data) {
  const counts = Object.fromEntries(RECORD_FIELDS.map((field) => [field, Array.isArray(data?.[field]) ? data[field].length : 0]));
  return { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}

function bytesToUuid(bytes) {
  const value = [...bytes.slice(0, 16)];
  value[6] = (value[6] & 0x0f) | 0x40;
  value[8] = (value[8] & 0x3f) | 0x80;
  const hex = value.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function stableUuid(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return bytesToUuid(new Uint8Array(digest));
}

export async function toCloudRecords(data, context) {
  const { userId, deviceId, migrationId = null, now = new Date().toISOString() } = context;
  const result = [];

  for (const [field, recordType] of Object.entries(MODULE_FIELDS)) {
    for (const [index, item] of (data?.[field] ?? []).entries()) {
      const legacyId = item.id ?? `${field}-${index}`;
      result.push({
        id: await stableUuid(`${userId}:${recordType}:${legacyId}`),
        user_id: userId,
        record_type: recordType,
        payload: item,
        created_at: item.created_at ?? now,
        updated_at: item.updated_at ?? now,
        deleted_at: item.deleted_at ?? null,
        migration_id: migrationId,
        device_id: deviceId,
      });
    }
  }

  result.push({
    id: await stableUuid(`${userId}:profile`),
    user_id: userId,
    record_type: 'profile',
    payload: data?.profile ?? {},
    created_at: now,
    updated_at: now,
    deleted_at: null,
    migration_id: migrationId,
    device_id: deviceId,
  });

  return result;
}

export function mergeRecordSets(localRecords, remoteRecords) {
  const merged = new Map(localRecords.map((record) => [record.id, record]));
  for (const remote of remoteRecords) {
    const local = merged.get(remote.id);
    if (!local || remote.updated_at >= local.updated_at) merged.set(remote.id, remote);
  }
  return [...merged.values()];
}

export function recordsToWorkbench(records, defaults) {
  const data = {
    ...defaults,
    profile: { ...defaults.profile },
    ...Object.fromEntries(RECORD_FIELDS.map((field) => [field, []])),
  };
  const fieldByType = Object.fromEntries(Object.entries(MODULE_FIELDS).map(([field, type]) => [type, field]));

  for (const record of records) {
    if (record.deleted_at) continue;
    if (record.record_type === 'profile') {
      data.profile = { ...defaults.profile, ...record.payload };
      continue;
    }
    const field = fieldByType[record.record_type];
    if (field) data[field].push(record.payload);
  }

  return data;
}

export async function createChangeSet(previousData, nextData, context) {
  const previousRecords = await toCloudRecords(previousData, context);
  const nextRecords = await toCloudRecords(nextData, context);
  const previousById = new Map(previousRecords.map((record) => [record.id, record]));
  const nextById = new Map(nextRecords.map((record) => [record.id, record]));
  const changes = [];

  for (const record of nextRecords) {
    const previous = previousById.get(record.id);
    if (!previous || JSON.stringify(previous.payload) !== JSON.stringify(record.payload)) changes.push(record);
  }

  for (const [id, previous] of previousById) {
    if (!nextById.has(id)) {
      changes.push({ ...previous, updated_at: context.now, deleted_at: context.now, device_id: context.deviceId });
    }
  }

  return changes;
}
