import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  BookHeart,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CloudDownload,
  Dumbbell,
  Gift,
  Info,
  Laptop,
  Pencil,
  Moon,
  Plus,
  Settings,
  Sparkles,
  SunMedium,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import '../styles.css';
import kittyHome from '../assets/kitty/home.png';
import kittyTasks from '../assets/kitty/tasks.png';
import kittyAccounts from '../assets/kitty/accounts.png';
import kittyFitness from '../assets/kitty/fitness.png';
import kittySchedule from '../assets/kitty/schedule.png';
import kittyKeepsakes from '../assets/kitty/keepsakes.png';
import kittyDiary from '../assets/kitty/diary.png';
import kittyCycle from '../assets/kitty/cycle.png';
import kittySettings from '../assets/kitty/settings.png';
import kittyHero from '../assets/kitty/hero.png';
import { AccountSyncCard } from '../account/AccountSyncCard.jsx';
import { LoginDialog } from '../account/LoginDialog.jsx';
import { MigrationDialog } from '../account/MigrationDialog.jsx';
import { useAccountSync } from '../account/use-account-sync.js';
import { getHomeSummary } from '../data/home-summary.js';
import { FITNESS_UNITS, createFitnessEntry, formatFitnessValue, getDefaultFitnessUnit, getFitnessDraft, getFitnessSummary } from '../data/fitness-summary.js';
import { DEFAULT_DATA } from '../data/default-data.js';
import { formatCountdown, formatDate, getAverageCycleLength, getCycleDay, getCycleDuration, getCycleStatus, getCurrentCycle, getFertileWindow, getGreeting, getLowerFertilityWindows, getMonthKey, getNextAnnualDate, getNextCycleDate, getOvulationDate, getRecordIsoDate, getReminderMinutes, getTodayIso, toLocalIso } from '../utils/date.js';
import { Activity, EditActions, ModuleRecord, PageHeader, SettingRow, Sidebar, Toggle } from '../components/common.jsx';

const NAV_ITEMS = [
  { id: 'home', label: '桌面', image: kittyHome },
  { id: 'tasks', label: '待办', image: kittyTasks },
  { id: 'accounts', label: '记账', image: kittyAccounts },
  { id: 'fitness', label: '减脂', image: kittyFitness },
  { id: 'schedule', label: '日程', image: kittySchedule },
  { id: 'keepsakes', label: '纪念', image: kittyKeepsakes },
  { id: 'diary', label: '日记', image: kittyDiary },
  { id: 'cycle', label: '经期', image: kittyCycle },
  { id: 'settings', label: '设置', image: kittySettings },
];

export function usePersistentData() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('kitty-workbench');
      if (!saved) return DEFAULT_DATA;
      const parsed = JSON.parse(saved);
      const profile = { ...DEFAULT_DATA.profile, ...parsed.profile };
      if (!profile.nickname?.trim() || profile.nickname === '妍妍') profile.nickname = 'zjinx';
      return { ...DEFAULT_DATA, ...parsed, profile };
    } catch {
      return DEFAULT_DATA;
    }
  });
  useEffect(() => localStorage.setItem('kitty-workbench', JSON.stringify(data)), [data]);
  return [data, setData];
}

function App() {
  const [active, setActive] = useState('home');
  const [localData, setLocalData] = usePersistentData();
  const [toast, setToast] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const account = useAccountSync({ localData, defaults: DEFAULT_DATA, notify });
  const data = account.data;
  const setData = account.setData ?? setLocalData;
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    document.documentElement.dataset.theme = data.profile.dark ? 'dark' : 'light';
  }, [data.profile.dark]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [active]);

  const reminderKeys = useRef(new Set());
  useEffect(() => {
    if (!data.profile.reminders) return undefined;
    const checkReminders = () => {
      const now = new Date();
      data.events.forEach((event) => {
        const minutes = getReminderMinutes(event.reminder);
        if (minutes === null || !event.date || !event.time) return;
        const eventAt = new Date(`${event.date}T${event.time}:00`);
        const reminderAt = new Date(eventAt.getTime() - minutes * 60_000);
        const key = `${event.id}-${event.date}-${event.time}-${event.reminder}`;
        const elapsed = now.getTime() - reminderAt.getTime();
        if (elapsed >= 0 && elapsed < 60_000 && !reminderKeys.current.has(key)) {
          reminderKeys.current.add(key);
          notify(`日程提醒：${event.title}`);
        }
      });
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 60_000);
    return () => window.clearInterval(timer);
  }, [data.events, data.profile.reminders]);

  useEffect(() => {
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      notify('安装已开始');
    }
  };

  const pageProps = { data, setData, notify, setActive, installApp, canInstall: Boolean(installPrompt), isInstalled, account, openLogin: () => setLoginOpen(true) };
  const pages = {
    home: <HomePage {...pageProps} />,
    tasks: <TasksPage {...pageProps} />,
    accounts: <AccountsPage {...pageProps} />,
    fitness: <FitnessPage {...pageProps} />,
    schedule: <SchedulePage {...pageProps} />,
    keepsakes: <KeepsakesPage {...pageProps} />,
    diary: <DiaryPage {...pageProps} />,
    cycle: <CyclePage {...pageProps} />,
    settings: <SettingsPage {...pageProps} />,
  };

  return (
    <div className="app-shell">
      <Sidebar items={NAV_ITEMS} active={active} onSelect={setActive} />
      <main className="main-content">{pages[active]}</main>
      {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
      {needRefresh && <div className="update-toast" role="status">
        <span>工作台有新版本</span>
        <button onClick={() => updateServiceWorker(true)}>立即更新</button>
        <button className="update-later" onClick={() => setNeedRefresh(false)}>稍后</button>
      </div>}
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} onSendCode={account.sendCode} onVerifyCode={account.verifyCode} />
      <MigrationDialog migration={account.migration} onConfirm={account.confirmMigration} onDismiss={account.dismissMigration} />
    </div>
  );
}

function HomePage({ data, setActive }) {
  const [now, setNow] = useState(() => new Date());
  const summary = getHomeSummary(data, now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="page home-page">
      <div className="hero-panel">
        <div className="hero-copy">
          <h1>{getGreeting(now)}，<strong>{data.profile.nickname}</strong>～</h1>
          <p><span aria-hidden="true">🌤️</span> 今天也要加油哦！</p>
        </div>
        <img className="kitty-hero" src={kittyHero} alt="" />
        <div className="progress-block">
          <div><span>💪 加油，继续努力</span><strong>{summary.progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${summary.progress}%` }} /></div>
        </div>
      </div>

      <div className="stat-grid">
        <button className="stat-card" onClick={() => setActive('tasks')}><strong className="pink">{summary.taskCount}</strong><span>待办总数</span></button>
        <button className="stat-card" onClick={() => setActive('fitness')}><strong className="green">{summary.calories}</strong><span>摄入千卡</span></button>
        <button className="stat-card" onClick={() => setActive('accounts')}><strong className="orange">¥{summary.spending}</strong><span>今日支出</span></button>
        <button className="stat-card" onClick={() => setActive('cycle')}><strong className="pink">{summary.cycleDay ? `第 ${summary.cycleDay} 天` : '暂无'}</strong><span>经期周期</span></button>
      </div>

      <section className="activity-section">
        <h2><span>🕘</span> 最近动态</h2>
        <div className="activity-list">
          <Activity icon="🍜" title="今日饮食摄入" detail={`${summary.calories} 千卡`} time="今日" tone="pink" />
          <Activity icon="✅" title="完成了待办" detail={summary.completedCount ? data.tasks.find((task) => task.done)?.text : '还没有完成项'} time="今日" tone="yellow" />
          <Activity icon="💰" title="记了一笔账" detail={`今日 ¥${summary.spending}`} time="今日" tone="mint" />
        </div>
      </section>
    </section>
  );
}

const TASK_PRIORITIES = ['高', '中', '低'];

function TasksPage({ data, setData, notify }) {
  const [draft, setDraft] = useState({ text: '', dueDate: getTodayIso(), priority: '中' });
  const [editing, setEditing] = useState(null);
  const today = getTodayIso();
  const groups = useMemo(() => {
    const result = { today: [], overdue: [], unscheduled: [], upcoming: [], completed: [] };
    data.tasks.forEach((task) => {
      if (task.done) result.completed.push(task);
      else if (!task.dueDate) result.unscheduled.push(task);
      else if (task.dueDate < today) result.overdue.push(task);
      else if (task.dueDate === today) result.today.push(task);
      else result.upcoming.push(task);
    });
    return result;
  }, [data.tasks, today]);
  const addTask = (event) => {
    event.preventDefault();
    if (!draft.text.trim()) return;
    setData((current) => ({ ...current, tasks: [...current.tasks, { id: Date.now(), text: draft.text.trim(), done: false, dueDate: draft.dueDate || null, priority: draft.priority }] }));
    setDraft({ text: '', dueDate: getTodayIso(), priority: '中' });
    notify('待办已添加');
  };
  const toggle = (id) => setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done, completedAt: !task.done ? new Date().toISOString() : null } : task) }));
  const remove = (id) => setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  const saveEdit = (event) => {
    event.preventDefault();
    if (!editing.text.trim()) return;
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === editing.id ? { ...task, text: editing.text.trim(), dueDate: editing.dueDate || null, priority: editing.priority || '中' } : task) }));
    setEditing(null);
    notify('待办已更新');
  };
  const renderTask = (task) => editing?.id === task.id ? (
    <form className="task-edit-row" key={task.id} onSubmit={saveEdit}>
      <input value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} aria-label={`编辑${task.text}`} required />
      <input type="date" value={editing.dueDate || ''} onChange={(event) => setEditing({ ...editing, dueDate: event.target.value })} aria-label={`编辑${task.text}截止日期`} />
      <select value={editing.priority || '中'} onChange={(event) => setEditing({ ...editing, priority: event.target.value })} aria-label={`编辑${task.text}优先级`}>{TASK_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>
      <div className="record-edit-actions"><button className="primary-button" type="submit"><Check size={18} />保存</button><button className="secondary-button" type="button" onClick={() => setEditing(null)}><X size={18} />取消</button></div>
    </form>
  ) : (
    <div className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
      <button className="check-button" onClick={() => toggle(task.id)} aria-label={task.done ? '标记为未完成' : '标记为完成'}>{task.done && <Check size={18} />}</button>
      <div className="task-copy"><span>{task.text}</span><small>{task.dueDate ? formatDate(task.dueDate) : '未安排'} · 优先级{task.priority || '中'}</small></div>
      <div className="task-actions"><button className="icon-button" onClick={() => setEditing({ ...task })} aria-label={`编辑${task.text}`}><Pencil size={17} /></button><button className="icon-button delete" onClick={() => remove(task.id)} aria-label="删除待办"><Trash2 size={18} /></button></div>
    </div>
  );
  const groupLabels = [['today', '今天'], ['overdue', '逾期'], ['unscheduled', '未安排'], ['upcoming', '以后'], ['completed', '已完成']];
  return (
    <section className="page">
      <PageHeader title="待办清单" icon={CheckCircle2} />
      <form className="quick-add task-add" onSubmit={addTask}>
        <input value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} placeholder="写下一件要完成的事" aria-label="新待办" />
        <input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} aria-label="新待办截止日期" />
        <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} aria-label="新待办优先级">{TASK_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>
        <button className="primary-button" type="submit"><Plus size={20} />添加</button>
      </form>
      <div className="task-list panel">
        {groupLabels.map(([key, label]) => groups[key].length ? <section className="task-group" key={key}><h2>{label}<span>{groups[key].length}</span></h2>{groups[key].map(renderTask)}</section> : null)}
        {!data.tasks.length && <p className="module-empty">还没有待办</p>}
      </div>
    </section>
  );
}

function AccountsPage({ data, setData, notify }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('餐饮');
  const [date, setDate] = useState(getTodayIso);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategory, setEditCategory] = useState('餐饮');
  const [editDate, setEditDate] = useState(getTodayIso);
  const [monthKey, setMonthKey] = useState(() => getMonthKey());
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const filteredRecords = useMemo(() => data.records.filter((item) => {
    const recordDate = getRecordIsoDate(item);
    const matchesMonth = recordDate ? getMonthKey(recordDate) === monthKey : monthKey === getMonthKey();
    const matchesCategory = categoryFilter === '全部' || item.category === categoryFilter;
    const matchesSearch = !search.trim() || item.note.toLowerCase().includes(search.trim().toLowerCase());
    return matchesMonth && matchesCategory && matchesSearch;
  }), [data.records, monthKey, categoryFilter, search]);
  const total = data.records.filter((item) => {
    const recordDate = getRecordIsoDate(item);
    return recordDate ? getMonthKey(recordDate) === monthKey : monthKey === getMonthKey();
  }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const moveMonth = (delta) => {
    const [year, month] = monthKey.split('-').map(Number);
    setMonthKey(getMonthKey(new Date(year, month - 1 + delta, 1)));
  };
  const addRecord = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || !note.trim()) return;
    const record = { id: Date.now(), amount: value, note: note.trim(), category, date, time: '刚刚' };
    setData((current) => ({ ...current, records: [record, ...current.records] }));
    setAmount(''); setNote(''); setDate(getTodayIso()); notify('账目已记录');
  };
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditNote(item.note);
    setEditCategory(item.category);
    setEditDate(item.date || getTodayIso());
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (event, id) => {
    event.preventDefault();
    const value = Number(editAmount);
    if (!value || value <= 0 || !editNote.trim()) return;
    setData((current) => ({
      ...current,
      records: current.records.map((item) => item.id === id ? { ...item, amount: value, note: editNote.trim(), category: editCategory, date: editDate } : item),
    }));
    cancelEdit();
    notify('账目已更新');
  };
  const removeRecord = (item) => {
    if (!window.confirm(`确定删除“${item.note}”这笔账目吗？`)) return;
    setData((current) => ({ ...current, records: current.records.filter((record) => record.id !== item.id) }));
    if (editingId === item.id) cancelEdit();
    notify('账目已删除');
  };
  return (
    <section className="page">
      <PageHeader title="轻松记账" icon={CircleDollarSign} action={<div className="month-total"><span>本月支出</span><strong>¥{total.toFixed(2)}</strong></div>} />
      <form className="entry-form panel" onSubmit={addRecord}>
        <label><span>金额</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-label="金额" /></label>
        <label><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="分类"><option>餐饮</option><option>交通</option><option>日用</option><option>学习</option><option>其他</option></select></label>
        <label className="wide"><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="记账日期" required /></label>
        <label className="wide"><span>备注</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="这笔钱花在了哪里" aria-label="备注" /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />记一笔</button>
      </form>
      <div className="record-filters">
        <div className="month-nav"><button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="上一个月"><ChevronLeft size={18} /></button><strong>{monthKey.replace('-', '年')}月</strong><button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="下一个月"><ChevronRight size={18} /></button></div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="账目分类筛选"><option>全部</option><option>餐饮</option><option>交通</option><option>日用</option><option>学习</option><option>其他</option></select>
        <input className="filter-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索备注" aria-label="搜索账目备注" />
      </div>
      <h2 className="section-title">账目记录</h2>
      <div className="record-list panel">
        {filteredRecords.length ? filteredRecords.map((item) => editingId === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={(event) => saveEdit(event, item.id)}>
            <label><span>金额</span><input inputMode="decimal" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} aria-label={`编辑${item.note}金额`} required /></label>
            <label><span>分类</span><select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} aria-label={`编辑${item.note}分类`}><option>餐饮</option><option>交通</option><option>日用</option><option>学习</option><option>其他</option></select></label>
            <label className="wide"><span>日期</span><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} aria-label={`编辑${item.note}日期`} required /></label>
            <label className="wide"><span>备注</span><input value={editNote} onChange={(event) => setEditNote(event.target.value)} aria-label={`编辑${item.note}备注`} required /></label>
            <div className="record-edit-actions"><button className="primary-button" type="submit"><Check size={18} />保存</button><button className="secondary-button" type="button" onClick={cancelEdit}><X size={18} />取消</button></div>
          </form>
        ) : (
          <div className="record-row" key={item.id}>
            <span className="record-emoji">{item.category === '餐饮' ? '🍜' : item.category === '学习' ? '📚' : '🧾'}</span>
            <div><strong>{item.note}</strong><span>{item.category} · {item.date ? formatDate(item.date) : item.time}</span></div>
            <b>-¥{Number(item.amount || 0).toFixed(2)}</b>
            <div className="record-actions"><button type="button" className="icon-button" onClick={() => startEdit(item)} aria-label={`编辑${item.note}`}><Pencil size={17} /></button><button type="button" className="icon-button delete" onClick={() => removeRecord(item)} aria-label={`删除${item.note}`}><Trash2 size={17} /></button></div>
          </div>
        )) : <p className="module-empty">没有符合条件的账目</p>}
      </div>
    </section>
  );
}

function buildMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - first.getDay() + 1);
    return { day: date.getDate(), iso: toLocalIso(date), outside: date.getMonth() !== month };
  });
}

function SchedulePage({ data, setData, notify }) {
  const todayIso = getTodayIso();
  const [monthKey, setMonthKey] = useState(() => getMonthKey(todayIso));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState('提前15分钟');
  const [year, month] = monthKey.split('-').map(Number);
  const days = useMemo(() => buildMonthDays(year, month - 1), [year, month]);
  const moveMonth = (delta) => setMonthKey(getMonthKey(new Date(year, month - 1 + delta, 1)));
  const addEvent = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setData((current) => ({ ...current, events: [...current.events, { id: Date.now(), title: title.trim(), date: selectedDate, time, reminder }] }));
    setTitle(''); notify('日程已添加');
  };
  const sortedEvents = [...data.events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const upcoming = sortedEvents.filter((item) => item.date >= todayIso);
  const past = sortedEvents.filter((item) => item.date < todayIso).reverse();
  const renderEvent = (item) => <div className="event-card" key={item.id}><div className="event-date"><strong>{Number(item.date.slice(8))}</strong><span>{Number(item.date.slice(5, 7))}月</span></div><div><strong>{item.title}</strong><span>{item.time} · {item.reminder}</span></div></div>;
  return (
    <section className="page schedule-page">
      <PageHeader title="日程安排" icon={CalendarDays} action={<strong className="date-accent">{year}年{month}月</strong>} />
      <div className="calendar-layout">
        <div className="calendar panel">
          <h2><button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="上一个月"><ChevronLeft size={18} /></button><CalendarDays size={21} />{year}年{month}月<button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="下一个月"><ChevronRight size={18} /></button></h2>
          <div className="weekdays">{'日一二三四五六'.split('').map((day) => <span key={day}>{day}</span>)}</div>
          <div className="days">{days.map((item, index) => {
            const isSelected = item.iso === selectedDate;
            return <button key={`${item.iso}-${index}`} disabled={item.outside} className={`${item.outside ? 'outside' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDate(item.iso)}>{item.day}</button>;
          })}</div>
        </div>
        <form className="schedule-form panel" onSubmit={addEvent}>
          <h2><Sparkles size={21} />添加日程</h2>
          <label><span>日程内容</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="要做什么" aria-label="日程内容" /></label>
          <div className="form-pair"><label><span>日期</span><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="日期" /></label><label><span>时间</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="时间" /></label></div>
          <label><span>提醒</span><select value={reminder} onChange={(e) => setReminder(e.target.value)} aria-label="提醒"><option>不提醒</option><option>提前15分钟</option><option>提前1小时</option><option>提前1天</option></select></label>
          <button className="primary-button" type="submit"><Plus size={20} />添加日程</button>
        </form>
      </div>
      <h2 className="section-title">即将到来</h2>
      <div className="upcoming-list">{upcoming.length ? upcoming.map(renderEvent) : <p className="module-empty">没有即将到来的日程</p>}</div>
      {past.length ? <><h2 className="section-title">已过去</h2><div className="upcoming-list past-events">{past.map(renderEvent)}</div></> : null}
    </section>
  );
}

function FitnessPage({ data, setData, notify }) {
  const [type, setType] = useState('饮食');
  const [date, setDate] = useState(getTodayIso);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(getDefaultFitnessUnit('饮食'));
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const emoji = { 饮食: '🍜', 运动: '🏃', 饮水: '💧', 体重: '⚖️' };
  const summary = getFitnessSummary(data.fitnessEntries);
  const addEntry = (event) => {
    event.preventDefault();
    const entry = createFitnessEntry({ type, date, amount, unit, note }, Date.now());
    if (!entry) return;
    setData((current) => ({ ...current, fitnessEntries: [entry, ...current.fitnessEntries] }));
    setAmount(''); setNote(''); notify('减脂记录已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    const entry = createFitnessEntry(editing, editing.id);
    if (!entry) return;
    setData((current) => ({ ...current, fitnessEntries: current.fitnessEntries.map((item) => item.id === editing.id ? entry : item) }));
    setEditing(null); notify('减脂记录已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, fitnessEntries: current.fitnessEntries.filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="减脂记录" icon={Dumbbell} />
      <div className="fitness-summary panel">
        <div><span>近 7 天摄入</span><strong>{summary.calories.toFixed(0)} 千卡</strong></div>
        <div><span>近 7 天运动</span><strong>{summary.exerciseMinutes.toFixed(0)} 分钟</strong></div>
        <div><span>近 7 天饮水</span><strong>{summary.waterLiters.toFixed(1)} 升</strong></div>
        <div><span>最新体重</span><strong>{summary.latestWeight === null ? '暂无' : `${summary.latestWeight} 千克`}</strong><small>{summary.weightDelta === null ? '暂无上一条记录' : `较上一条 ${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta.toFixed(1)} 千克`}</small></div>
      </div>
      <form className="entry-form panel fitness-form" onSubmit={addEntry}>
        <label><span>记录类型</span><select value={type} onChange={(event) => { const nextType = event.target.value; setType(nextType); setUnit(getDefaultFitnessUnit(nextType)); }} aria-label="减脂记录类型"><option>饮食</option><option>运动</option><option>饮水</option><option>体重</option></select></label>
        <label><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="减脂记录日期" required /></label>
        <label><span>数值</span><div className="value-with-unit"><input type="number" min="0" step="0.1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" aria-label="减脂记录数值" required /><select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="减脂记录单位">{FITNESS_UNITS[type].map((option) => <option key={option}>{option}</option>)}</select></div></label>
        <label><span>备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" aria-label="减脂记录备注" /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />保存记录</button>
      </form>
      <h2 className="section-title">历史记录</h2>
      <div className="module-record-list panel">
        {data.fitnessEntries.length ? data.fitnessEntries.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>记录类型</span><select value={editing.type} onChange={(event) => { const nextType = event.target.value; setEditing({ ...editing, type: nextType, unit: getDefaultFitnessUnit(nextType) }); }} aria-label="编辑减脂记录类型"><option>饮食</option><option>运动</option><option>饮水</option><option>体重</option></select></label>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑减脂记录日期" required /></label>
            <label><span>数值</span><div className="value-with-unit"><input type="number" min="0" step="0.1" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: event.target.value })} aria-label="编辑减脂记录数值" required /><select value={editing.unit} onChange={(event) => setEditing({ ...editing, unit: event.target.value })} aria-label="编辑减脂记录单位">{FITNESS_UNITS[editing.type].map((option) => <option key={option}>{option}</option>)}</select></div></label>
            <label><span>备注</span><input value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} aria-label="编辑减脂记录备注" /></label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon={emoji[item.type] ?? '📝'} title={item.type} detail={`${formatDate(item.date)}${item.note ? ` · ${item.note}` : ''}`} value={formatFitnessValue(item)} onEdit={() => setEditing({ id: item.id, ...getFitnessDraft(item) })} onRemove={() => remove(item.id)} />) : <p className="module-empty">还没有减脂记录</p>}
      </div>
    </section>
  );
}

function KeepsakesPage({ data, setData, notify }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayIso);
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [editing, setEditing] = useState(null);
  const addKeepsake = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    const keepsake = { id: Date.now(), title: title.trim(), date, repeatYearly };
    setData((current) => ({ ...current, keepsakes: [keepsake, ...current.keepsakes] }));
    setTitle(''); setRepeatYearly(false); notify('纪念日已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    if (!editing.title.trim()) return;
    setData((current) => ({ ...current, keepsakes: current.keepsakes.map((item) => item.id === editing.id ? { ...editing, title: editing.title.trim() } : item) }));
    setEditing(null); notify('纪念日已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, keepsakes: current.keepsakes.filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="纪念日" icon={Gift} />
      <form className="entry-form panel keepsake-form" onSubmit={addKeepsake}>
        <label><span>纪念日名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：入职纪念日" aria-label="纪念日名称" required /></label>
        <label><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="纪念日日期" required /></label>
        <label className="checkbox-label"><input type="checkbox" checked={repeatYearly} onChange={(event) => setRepeatYearly(event.target.checked)} />每年重复</label>
        <button className="primary-button wide" type="submit"><Plus size={20} />新增纪念日</button>
      </form>
      <h2 className="section-title">我的纪念日</h2>
      <div className="module-record-list panel">
        {data.keepsakes.length ? data.keepsakes.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>纪念日名称</span><input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} aria-label="编辑纪念日名称" required /></label>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑纪念日日期" required /></label>
            <label className="checkbox-label"><input type="checkbox" checked={Boolean(editing.repeatYearly)} onChange={(event) => setEditing({ ...editing, repeatYearly: event.target.checked })} />每年重复</label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon="🎁" title={item.title} detail={`${formatDate(item.date)}${item.repeatYearly ? ' · 每年重复' : ''}`} value={item.repeatYearly ? formatCountdown(getNextAnnualDate(item.date)) : formatCountdown(item.date)} onEdit={() => setEditing({ repeatYearly: false, ...item })} onRemove={() => remove(item.id)} />) : <p className="module-empty">还没有纪念日</p>}
      </div>
    </section>
  );
}

function DiaryPage({ data, setData, notify }) {
  const [date, setDate] = useState(getTodayIso);
  const [mood, setMood] = useState('平静');
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMood, setFilterMood] = useState('全部');
  const filteredEntries = useMemo(() => data.diaryEntries.filter((item) => {
    const keyword = search.trim().toLowerCase();
    return (!keyword || item.content.toLowerCase().includes(keyword))
      && (!filterDate || item.date === filterDate)
      && (filterMood === '全部' || item.mood === filterMood);
  }), [data.diaryEntries, search, filterDate, filterMood]);
  const addDiary = (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    const entry = { id: Date.now(), date, mood, content: content.trim() };
    setData((current) => ({ ...current, diaryEntries: [entry, ...current.diaryEntries] }));
    setContent(''); notify('日记已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    if (!editing.content.trim()) return;
    setData((current) => ({ ...current, diaryEntries: current.diaryEntries.map((item) => item.id === editing.id ? { ...editing, content: editing.content.trim() } : item) }));
    setEditing(null); notify('日记已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, diaryEntries: current.diaryEntries.filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="心情日记" icon={BookHeart} />
      <form className="entry-form panel" onSubmit={addDiary}>
        <label><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="日记日期" required /></label>
        <label><span>今天的心情</span><select value={mood} onChange={(event) => setMood(event.target.value)} aria-label="日记心情"><option>开心</option><option>平静</option><option>充实</option><option>疲惫</option><option>难过</option></select></label>
        <label className="wide"><span>日记内容</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="记录今天发生的事情" aria-label="日记内容" required /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />保存日记</button>
      </form>
      <div className="record-filters diary-filters">
        <input className="filter-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索日记内容" aria-label="搜索日记内容" />
        <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} aria-label="按日期筛选日记" />
        <select value={filterMood} onChange={(event) => setFilterMood(event.target.value)} aria-label="按心情筛选日记"><option>全部</option><option>开心</option><option>平静</option><option>充实</option><option>疲惫</option><option>难过</option></select>
        {(search || filterDate || filterMood !== '全部') && <button type="button" className="secondary-button" onClick={() => { setSearch(''); setFilterDate(''); setFilterMood('全部'); }}><X size={18} />清空筛选</button>}
      </div>
      <h2 className="section-title">日记记录</h2>
      <div className="module-record-list panel">
        {filteredEntries.length ? filteredEntries.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑日记日期" required /></label>
            <label><span>心情</span><select value={editing.mood} onChange={(event) => setEditing({ ...editing, mood: event.target.value })} aria-label="编辑日记心情"><option>开心</option><option>平静</option><option>充实</option><option>疲惫</option><option>难过</option></select></label>
            <label className="wide"><span>日记内容</span><textarea value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} aria-label="编辑日记内容" required /></label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon="📖" title={formatDate(item.date)} detail={item.content} value={item.mood} onEdit={() => setEditing({ ...item })} onRemove={() => remove(item.id)} />) : <p className="module-empty">{data.diaryEntries.length ? '没有符合条件的日记' : '还没有日记'}</p>}
      </div>
    </section>
  );
}

const EMPTY_SYMPTOMS = { pain: '', flow: '', mood: '' };
const symptomOptions = {
  pain: ['无', '轻', '中', '重'],
  flow: ['少', '中', '多'],
  mood: ['平稳', '低落', '烦躁', '疲倦'],
};

function CycleFormFields({ value, onChange, editing = false }) {
  const prefix = editing ? '编辑' : '';
  const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
  const updateSymptom = (key, nextValue) => onChange({ ...value, symptoms: { ...EMPTY_SYMPTOMS, ...value.symptoms, [key]: nextValue } });
  return <>
    <label><span>开始日期</span><input type="date" value={value.startDate} onChange={(event) => update('startDate', event.target.value)} aria-label={`${prefix}经期开始日期`} required /></label>
    <label><span>结束日期（可选）</span><input type="date" value={value.endDate} onChange={(event) => update('endDate', event.target.value)} aria-label={`${prefix}经期结束日期`} /></label>
    <label><span>周期天数</span><input type="number" min="20" max="45" value={value.cycleLength} onChange={(event) => update('cycleLength', event.target.value)} aria-label={`${prefix}周期天数`} required /></label>
    {Object.entries(symptomOptions).map(([key, options]) => <label key={key}><span>{{ pain: '腹痛', flow: '出血量', mood: '情绪' }[key]}</span><select value={value.symptoms?.[key] || ''} onChange={(event) => updateSymptom(key, event.target.value)} aria-label={`${prefix}${{ pain: '腹痛', flow: '出血量', mood: '情绪' }[key]}`}><option value="">未记录</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
    <label className="wide"><span>备注</span><input value={value.note} onChange={(event) => update('note', event.target.value)} placeholder="例如：状态正常" aria-label={`${prefix}经期备注`} /></label>
  </>;
}

function cycleDraftFromEntry(entry) {
  return {
    startDate: entry.startDate,
    endDate: entry.endDate || '',
    cycleLength: String(entry.cycleLength),
    note: entry.note || '',
    symptoms: { ...EMPTY_SYMPTOMS, ...(entry.symptoms || {}) },
  };
}

function createCycleEntry(draft, id) {
  const length = Number(draft.cycleLength);
  if (!draft.startDate || !Number.isInteger(length) || length < 20 || length > 45) return null;
  if (draft.endDate && draft.endDate < draft.startDate) return null;
  return {
    id,
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    cycleLength: length,
    note: draft.note.trim(),
    symptoms: { ...EMPTY_SYMPTOMS, ...draft.symptoms },
  };
}

function formatCycleSymptoms(symptoms = {}) {
  return [
    symptoms.pain && `腹痛${symptoms.pain}`,
    symptoms.flow && `出血${symptoms.flow}`,
    symptoms.mood && `情绪${symptoms.mood}`,
  ].filter(Boolean).join(' · ');
}

function formatDateRange(range) {
  return range ? `${formatDate(range.startDate)}～${formatDate(range.endDate)}` : '暂无';
}

function formatDateRanges(ranges = []) {
  return ranges.length ? ranges.map((range) => formatDateRange(range)).join('、') : '暂无';
}

function CyclePage({ data, setData, notify }) {
  const [draft, setDraft] = useState(() => ({ startDate: getTodayIso(), endDate: '', cycleLength: '28', note: '', symptoms: EMPTY_SYMPTOMS }));
  const [editing, setEditing] = useState(null);
  const now = new Date();
  const entries = data.cycleEntries ?? [];
  const currentCycle = getCurrentCycle(entries, now);
  const averageCycle = getAverageCycleLength(entries);
  const predictedNextDate = currentCycle ? getNextCycleDate(currentCycle.startDate, averageCycle ?? currentCycle.cycleLength, now) : null;
  const ovulationDate = getOvulationDate(predictedNextDate);
  const fertileWindow = getFertileWindow(predictedNextDate);
  const lowerFertilityWindows = currentCycle ? getLowerFertilityWindows(currentCycle.startDate, predictedNextDate) : [];
  const invalidMessage = '周期天数需为 20～45 天，且结束日期不能早于开始日期';
  const addCycle = (event) => {
    event.preventDefault();
    const entry = createCycleEntry(draft, Date.now());
    if (!entry) { notify(invalidMessage); return; }
    setData((current) => ({ ...current, cycleEntries: [entry, ...(current.cycleEntries ?? [])] }));
    setDraft({ startDate: getTodayIso(), endDate: '', cycleLength: '28', note: '', symptoms: EMPTY_SYMPTOMS });
    notify('经期记录已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    const entry = createCycleEntry(editing, editing.id);
    if (!entry) { notify(invalidMessage); return; }
    setData((current) => ({ ...current, cycleEntries: (current.cycleEntries ?? []).map((item) => item.id === editing.id ? entry : item) }));
    setEditing(null); notify('经期记录已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, cycleEntries: (current.cycleEntries ?? []).filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="周期记录" icon={Moon} />
      <form className="entry-form panel" onSubmit={addCycle}>
        <CycleFormFields value={draft} onChange={setDraft} />
        <button className="primary-button wide" type="submit"><Plus size={20} />保存周期</button>
      </form>
      <div className="cycle-summary panel">
        <div><span>当前状态</span><strong>{currentCycle ? getCycleStatus(currentCycle, now) : '暂无记录'}</strong></div>
        <div><span>平均周期</span><strong>{averageCycle ? `${averageCycle} 天` : '记录不足'}</strong></div>
        <div><span>下次预计</span><strong>{predictedNextDate ? formatDate(predictedNextDate) : '暂无'}</strong></div>
      </div>
      <div className="cycle-predictions panel">
        <div><span>排卵日估算</span><strong>{formatDate(ovulationDate) || '暂无'}</strong></div>
        <div><span>易孕期估算</span><strong>{formatDateRange(fertileWindow)}</strong></div>
        <div><span>安全期（仅估算）</span><strong>{formatDateRanges(lowerFertilityWindows)}</strong></div>
        <p className="cycle-disclaimer">以上日期按固定规则估算，不能作为避孕或医疗判断依据；周期不规律时误差可能较大。</p>
      </div>
      <h2 className="section-title">周期历史</h2>
      <div className="module-record-list panel">
        {entries.length ? entries.map((item) => {
          if (editing?.id === item.id) return (
            <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
              <CycleFormFields value={editing} onChange={setEditing} editing />
              <EditActions onCancel={() => setEditing(null)} />
            </form>
          );
          const day = getCycleDay(item.startDate, item.cycleLength, now);
          const duration = getCycleDuration(item.startDate, item.endDate);
          const symptoms = formatCycleSymptoms(item.symptoms);
          const detail = [`开始于 ${formatDate(item.startDate)}`, `${item.cycleLength} 天周期`, getCycleStatus(item, now), duration ? `持续 ${duration} 天` : null, symptoms || null].filter(Boolean).join(' · ');
          const nextDate = getNextCycleDate(item.startDate, averageCycle ?? item.cycleLength, now);
          return <ModuleRecord key={item.id} icon="🌙" title={item.note || '经期记录'} detail={detail} value={<><strong>{day ? `第 ${day} 天` : getCycleStatus(item, now)}</strong><small>下次预计 {formatDate(nextDate)}</small></>} onEdit={() => setEditing({ ...item, ...cycleDraftFromEntry(item) })} onRemove={() => remove(item.id)} />;
        }) : <p className="module-empty">还没有经期记录</p>}
      </div>
    </section>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toExcelDate(value) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function createExcelSheet(columns, rows) {
  const header = columns.map((column) => ({ value: column.header, fontWeight: 'bold', textColor: '#ffffff', backgroundColor: '#f25f95', height: 24 }));
  return [header, ...rows.map((row) => columns.map((column) => ({ value: row[column.key] ?? '', type: column.type, format: column.format, wrap: true })))];
}

function SettingsPage({ data, setData, notify, installApp, canInstall, isInstalled, account, openLogin }) {
  const backupInputRef = useRef(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const updateProfile = (patch) => setData((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  const exportBackup = () => {
    const backup = { version: 2, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `Kitty工作台完整备份-${getTodayIso()}.json`);
    notify('完整数据备份已导出');
  };
  const exportExcel = async () => {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const sheets = [];
    const addSheet = (name, columns, rows) => {
      sheets.push({ data: createExcelSheet(columns, rows), sheet: name, columns: columns.map((column) => ({ width: column.width })), stickyRowsCount: 1 });
    };
    addSheet('待办', [
      { header: '内容', key: 'text', width: 34 }, { header: '状态', key: 'status', width: 14 },
    ], data.tasks.map((item) => ({ text: item.text, status: item.done ? '已完成' : '未完成' })));
    addSheet('记账', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '记录时间', key: 'time', width: 20 }, { header: '分类', key: 'category', width: 14 }, { header: '金额', key: 'amount', width: 14, type: Number, format: '¥#,##0.00' }, { header: '备注', key: 'note', width: 32 },
    ], data.records.map((item) => ({ date: toExcelDate(item.date), time: item.time, category: item.category, amount: item.amount, note: item.note })));
    addSheet('减脂', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '类型', key: 'type', width: 14 }, { header: '数值', key: 'value', width: 18 }, { header: '备注', key: 'note', width: 32 },
    ], data.fitnessEntries.map((item) => ({ date: toExcelDate(item.date), type: item.type, value: item.value, note: item.note })));
    addSheet('日程', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '时间', key: 'time', width: 12 }, { header: '内容', key: 'title', width: 32 }, { header: '提醒', key: 'reminder', width: 18 },
    ], data.events.map((item) => ({ date: toExcelDate(item.date), time: item.time, title: item.title, reminder: item.reminder })));
    addSheet('纪念', [
      { header: '名称', key: 'title', width: 32 }, { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '每年重复', key: 'repeatYearly', width: 14 }, { header: '倒计时', key: 'countdown', width: 18 },
    ], data.keepsakes.map((item) => ({ title: item.title, date: toExcelDate(item.date), repeatYearly: item.repeatYearly ? '是' : '否', countdown: formatCountdown(item.repeatYearly ? getNextAnnualDate(item.date) : item.date) })));
    addSheet('日记', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '心情', key: 'mood', width: 14 }, { header: '日记内容', key: 'content', width: 54 },
    ], data.diaryEntries.map((item) => ({ date: toExcelDate(item.date), mood: item.mood, content: item.content })));
    const averageCycle = getAverageCycleLength(data.cycleEntries);
    addSheet('经期', [
      { header: '开始日期', key: 'startDate', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '结束日期', key: 'endDate', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '周期天数', key: 'cycleLength', width: 14, type: Number }, { header: '持续天数', key: 'duration', width: 14, type: Number }, { header: '状态', key: 'status', width: 24 }, { header: '腹痛', key: 'pain', width: 12 }, { header: '出血量', key: 'flow', width: 12 }, { header: '情绪', key: 'mood', width: 12 }, { header: '备注', key: 'note', width: 32 }, { header: '下次预计', key: 'nextDate', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '排卵日估算', key: 'ovulationDate', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '易孕期估算', key: 'fertileWindow', width: 24 }, { header: '安全期估算', key: 'lowerFertilityWindows', width: 42 },
    ], data.cycleEntries.map((item) => {
      const nextDate = getNextCycleDate(item.startDate, averageCycle ?? item.cycleLength);
      return { startDate: toExcelDate(item.startDate), endDate: toExcelDate(item.endDate), cycleLength: item.cycleLength, duration: getCycleDuration(item.startDate, item.endDate), status: getCycleStatus(item), pain: item.symptoms?.pain || '', flow: item.symptoms?.flow || '', mood: item.symptoms?.mood || '', note: item.note, nextDate: toExcelDate(nextDate), ovulationDate: toExcelDate(getOvulationDate(nextDate)), fertileWindow: formatDateRange(getFertileWindow(nextDate)), lowerFertilityWindows: formatDateRanges(getLowerFertilityWindows(item.startDate, nextDate)) };
    }));
    await writeXlsxFile(sheets).toFile(`Kitty工作台记录-${getTodayIso()}.xlsx`);
    notify('Excel 表格已导出');
  };
  const restoreBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const restored = parsed?.version && parsed.data ? parsed.data : parsed;
      const version = parsed?.version && parsed.data ? parsed.version : 1;
      const listKeys = ['tasks', 'records', 'events', 'fitnessEntries', 'keepsakes', 'diaryEntries', 'cycleEntries'];
      const isValid = restored && typeof restored === 'object' && restored.profile && listKeys.every((key) => Array.isArray(restored[key]));
      if (!isValid) throw new Error('invalid backup');
      setBackupPreview({ version, exportedAt: parsed?.exportedAt || null, data: restored });
    } catch {
      notify('备份文件无法识别');
    } finally {
      event.target.value = '';
    }
  };
  const confirmRestore = () => {
    if (!backupPreview) return;
    setData({ ...DEFAULT_DATA, ...backupPreview.data, profile: { ...DEFAULT_DATA.profile, ...backupPreview.data.profile } });
    setBackupPreview(null);
    notify('完整数据已恢复');
  };
  return (
    <section className="page">
      <PageHeader title="设置" icon={Settings} />
      <AccountSyncCard account={account} onOpenLogin={openLogin} onSync={account.syncNow} onSignOut={account.signOut} />
      <section className="settings-card panel">
        <h2><img className="heading-kitty" src={kittyHero} alt="" />个人信息</h2>
        <div className="profile-row"><div className="avatar"><img src={kittyHero} alt="" /></div><div><strong>{data.profile.nickname}</strong><span>Hello Kitty 工作台</span></div></div>
        <label><span>昵称</span><input value={data.profile.nickname} onChange={(e) => updateProfile({ nickname: e.target.value })} aria-label="昵称" /></label>
        <label><span>生日</span><input type="date" value={data.profile.birthday} onChange={(e) => updateProfile({ birthday: e.target.value })} aria-label="生日" /></label>
      </section>
      <section className="settings-list panel">
        <button className="settings-button" onClick={installApp} disabled={!canInstall || isInstalled}>
          <span className="setting-icon tone-pink"><Laptop size={21} /></span>
          <span><strong>{isInstalled ? '已安装到电脑' : '安装到电脑'}</strong><small>{isInstalled ? '可从桌面或开始菜单打开' : canInstall ? '作为独立应用安装，无需开发环境' : '用 Chrome 或 Edge 打开公网地址后可安装'}</small></span>
          {!isInstalled && <ChevronRight size={20} />}
        </button>
        <SettingRow icon={SunMedium} title="消息提醒" detail="待办、日程到期提醒" tone="pink"><Toggle checked={data.profile.reminders} onChange={(checked) => updateProfile({ reminders: checked })} label="消息提醒" /></SettingRow>
        <SettingRow icon={Moon} title="深色模式" detail="夜间使用更舒适" tone="yellow"><Toggle checked={data.profile.dark} onChange={(checked) => updateProfile({ dark: checked })} label="深色模式" /></SettingRow>
        <button className="settings-button" onClick={exportExcel}><span className="setting-icon tone-blue"><CloudDownload size={21} /></span><span><strong>导出 Excel 表格</strong><small>按模块生成工作表，方便查看、统计和打印</small></span><ChevronRight size={20} /></button>
        <button className="settings-button" onClick={exportBackup}><span className="setting-icon tone-mint"><CloudDownload size={21} /></span><span><strong>完整数据备份</strong><small>导出 JSON 文件，用于保留工作台全部数据</small></span><ChevronRight size={20} /></button>
        <button className="settings-button" onClick={() => backupInputRef.current?.click()}><span className="setting-icon tone-yellow"><Upload size={21} /></span><span><strong>从备份恢复</strong><small>选择完整备份文件，恢复工作台全部数据</small></span><ChevronRight size={20} /></button>
        <input ref={backupInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restoreBackup} aria-label="选择完整备份文件" />
        {backupPreview && <div className="backup-preview">
          <strong>恢复预览</strong>
          <span>备份版本：v{backupPreview.version}</span>
          <span>导出时间：{backupPreview.exportedAt ? new Date(backupPreview.exportedAt).toLocaleString('zh-CN') : '旧版备份，未记录'}</span>
          <span>待办 {backupPreview.data.tasks.length} 条 · 账目 {backupPreview.data.records.length} 条 · 日记 {backupPreview.data.diaryEntries.length} 条 · 经期 {backupPreview.data.cycleEntries.length} 条</span>
          <div className="backup-preview-actions"><button type="button" className="primary-button" onClick={confirmRestore}><Check size={18} />确认恢复</button><button type="button" className="secondary-button" onClick={() => setBackupPreview(null)}><X size={18} />取消恢复</button></div>
        </div>}
        <div className="settings-button static"><span className="setting-icon tone-gray"><Info size={21} /></span><span><strong>关于</strong><small>Hello Kitty 工作台 v1.0</small></span></div>
      </section>
      <p className="made-with">Made with <span>💖</span> for {data.profile.nickname}<br />Hello Kitty © Sanrio</p>
    </section>
  );
}

export { AccountsPage, App, TasksPage };
