const DATABASE_NAME = 'kitty-workbench-sync';
const DATABASE_VERSION = 1;
let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openWorkbenchDb() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const records = database.createObjectStore('records', { keyPath: ['userId', 'id'] });
      records.createIndex('by-user', 'userId');
      const queue = database.createObjectStore('queue', { keyPath: ['userId', 'id'] });
      queue.createIndex('by-user', 'userId');
      database.createObjectStore('metadata', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

export function closeWorkbenchDb() {
  if (!databasePromise) return;
  databasePromise.then((database) => database.close()).catch(() => {});
  databasePromise = undefined;
}

async function readByUser(storeName, userId) {
  const database = await openWorkbenchDb();
  const transaction = database.transaction(storeName, 'readonly');
  const rows = await requestResult(transaction.objectStore(storeName).index('by-user').getAll(userId));
  return rows.map(({ userId: ignoredUserId, ...record }) => record);
}

async function putByUser(storeName, userId, records) {
  const database = await openWorkbenchDb();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  records.forEach((record) => store.put({ ...record, userId }));
  await transactionDone(transaction);
}

export function loadAccountRecords(userId) {
  return readByUser('records', userId);
}

export function saveAccountRecords(userId, records) {
  return putByUser('records', userId, records);
}

export function enqueueChanges(userId, records) {
  return putByUser('queue', userId, records);
}

export function readPendingChanges(userId) {
  return readByUser('queue', userId);
}

export async function removePendingChanges(userId, ids) {
  const database = await openWorkbenchDb();
  const transaction = database.transaction('queue', 'readwrite');
  const store = transaction.objectStore('queue');
  ids.forEach((id) => store.delete([userId, id]));
  await transactionDone(transaction);
}

export async function getMetadata(key) {
  const database = await openWorkbenchDb();
  const transaction = database.transaction('metadata', 'readonly');
  const result = await requestResult(transaction.objectStore('metadata').get(key));
  return result?.value;
}

export async function setMetadata(key, value) {
  const database = await openWorkbenchDb();
  const transaction = database.transaction('metadata', 'readwrite');
  transaction.objectStore('metadata').put({ key, value });
  await transactionDone(transaction);
}
