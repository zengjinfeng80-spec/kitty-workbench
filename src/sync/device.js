import { getMetadata, setMetadata } from './indexed-db.js';

export async function getDeviceId() {
  const existing = await getMetadata('device-id');
  if (existing) return existing;
  const deviceId = globalThis.crypto.randomUUID();
  await setMetadata('device-id', deviceId);
  return deviceId;
}
