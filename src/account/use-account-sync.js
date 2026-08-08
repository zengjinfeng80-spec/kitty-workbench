import { useCallback, useEffect, useRef, useState } from 'react';
import { countLocalRecords, createChangeSet, recordsToWorkbench } from '../sync/data-model.js';
import { getDeviceId } from '../sync/device.js';
import { loadAccountRecords, readPendingChanges, saveAccountRecords } from '../sync/indexed-db.js';
import { createSyncEngine } from '../sync/sync-engine.js';
import { createSerialTaskQueue } from '../sync/serial-task-queue.js';
import { isSupabaseConfigured, supabase } from '../supabase/client.js';

function emptyAccountData(defaults) {
  return {
    ...defaults,
    profile: { ...defaults.profile },
    tasks: [], records: [], events: [], fitnessEntries: [], keepsakes: [], diaryEntries: [], cycleEntries: [],
  };
}

export function useAccountSync({ localData, defaults, notify }) {
  const [session, setSession] = useState(null);
  const [accountData, setAccountDataState] = useState(() => emptyAccountData(defaults));
  const [status, setStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [migration, setMigration] = useState({ open: false, busy: false, error: '', counts: countLocalRecords(localData) });
  const engineRef = useRef(null);
  const dataRef = useRef(accountData);
  const migrationDecisionRef = useRef(false);
  const writeQueueRef = useRef(createSerialTaskQueue());

  useEffect(() => { dataRef.current = accountData; }, [accountData]);

  const refreshPending = useCallback(async (userId) => setPendingCount((await readPendingChanges(userId)).length), []);

  const applyRecords = useCallback(async (records) => {
    const next = recordsToWorkbench(records, defaults);
    dataRef.current = next;
    setAccountDataState(next);
    return next;
  }, [defaults]);

  const syncNow = useCallback(async () => {
    if (!engineRef.current || !session || !navigator.onLine) {
      if (session && !navigator.onLine) setStatus('offline');
      return;
    }
    setStatus('syncing');
    try {
      const records = await engineRef.current.sync();
      await applyRecords(records);
      await refreshPending(session.user.id);
      const timestamp = new Date().toISOString();
      setLastSyncedAt(timestamp); setStatus('synced');
    } catch {
      setStatus('error');
    }
  }, [applyRecords, refreshPending, session]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const blankData = emptyAccountData(defaults);
    if (!session) {
      engineRef.current = null;
      migrationDecisionRef.current = false;
      dataRef.current = blankData;
      setAccountDataState(blankData);
      setMigration((current) => ({ ...current, open: false, busy: false, error: '' }));
      return;
    }
    let cancelled = false;
    (async () => {
      const userId = session.user.id;
      const deviceId = await getDeviceId();
      engineRef.current = createSyncEngine({ client: supabase, userId, deviceId });
      const cached = await loadAccountRecords(userId);
      if (cancelled) return;
      if (cached.length) await applyRecords(cached);
      else {
        dataRef.current = blankData;
        setAccountDataState(blankData);
      }
      const decision = localStorage.getItem(`kitty-migration-decision:${userId}`);
      if (!decision && countLocalRecords(localData).total > 0) {
        setMigration({ open: true, busy: false, error: '', counts: countLocalRecords(localData) });
      } else {
        migrationDecisionRef.current = true;
        await syncNow();
      }
      await refreshPending(userId);
    })();
    return () => { cancelled = true; };
  }, [applyRecords, defaults, localData, refreshPending, session, syncNow]);

  useEffect(() => {
    const online = () => { setStatus('idle'); syncNow(); };
    const offline = () => session && setStatus('offline');
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [session, syncNow]);

  const setAccountData = useCallback((update) => {
    if (!session || !engineRef.current) return;
    const previous = dataRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    dataRef.current = next;
    setAccountDataState(next);
    writeQueueRef.current.enqueue(async () => {
      const deviceId = await getDeviceId();
      const changes = await createChangeSet(previous, next, { userId: session.user.id, deviceId, now: new Date().toISOString() });
      if (!changes.length) return;
      await saveAccountRecords(session.user.id, changes);
      await engineRef.current.enqueue(changes);
      await refreshPending(session.user.id);
      if (navigator.onLine) await syncNow(); else setStatus('offline');
    }).catch(() => setStatus('error'));
  }, [refreshPending, session, syncNow]);

  const sendCode = async (email) => {
    const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo },
    });
    if (error) throw new Error('验证码发送失败，请稍后重试');
  };

  const verifyCode = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error('验证码不正确或已过期');
  };

  const confirmMigration = async () => {
    if (!session || !engineRef.current) return;
    setMigration((current) => ({ ...current, busy: true, error: '' }));
    try {
      const records = await engineRef.current.migrate(localData);
      await applyRecords(records);
      localStorage.setItem(`kitty-migration-decision:${session.user.id}`, 'completed');
      migrationDecisionRef.current = true;
      setMigration((current) => ({ ...current, open: false, busy: false }));
      setStatus('synced'); setLastSyncedAt(new Date().toISOString());
      notify('本地记录已安全迁移并同步');
    } catch {
      setMigration((current) => ({ ...current, busy: false, error: '迁移未完成，本地记录仍然安全。请检查网络后重试。' }));
    }
  };

  const dismissMigration = async () => {
    if (!session) return;
    localStorage.setItem(`kitty-migration-decision:${session.user.id}`, 'dismissed');
    migrationDecisionRef.current = true;
    setMigration((current) => ({ ...current, open: false }));
    await syncNow();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    engineRef.current = null; setSession(null); setPendingCount(0); setStatus('idle');
    notify('已退出登录，本地原始记录仍然保留');
  };

  return {
    configured: isSupabaseConfigured,
    session,
    data: session && migrationDecisionRef.current ? accountData : localData,
    setData: session && migrationDecisionRef.current ? setAccountData : null,
    status, pendingCount, lastSyncedAt,
    sendCode, verifyCode, signOut, syncNow,
    migration, confirmMigration, dismissMigration,
  };
}
