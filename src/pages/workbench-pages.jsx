import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  BookHeart,
  CalendarDays,
  Check,
  CheckCircle2,
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
import { DEFAULT_DATA } from '../data/default-data.js';
import { formatCountdown, formatDate, getCycleDay, getGreeting, getNextCycleDate, getTodayIso } from '../utils/date.js';
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
        <button className="stat-card" onClick={() => setActive('tasks')}><strong className="pink">{summary.taskCount}</strong><span>今日待办</span></button>
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

function TasksPage({ data, setData, notify }) {
  const [text, setText] = useState('');
  const addTask = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setData((current) => ({ ...current, tasks: [...current.tasks, { id: Date.now(), text: text.trim(), done: false }] }));
    setText('');
    notify('待办已添加');
  };
  const toggle = (id) => setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
  const remove = (id) => setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="今日待办" icon={CheckCircle2} />
      <form className="quick-add" onSubmit={addTask}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="写下一件要完成的事" aria-label="新待办" />
        <button className="primary-button" type="submit"><Plus size={20} />添加</button>
      </form>
      <div className="task-list panel">
        {data.tasks.map((task) => <div className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
          <button className="check-button" onClick={() => toggle(task.id)} aria-label={task.done ? '标记为未完成' : '标记为完成'}>{task.done && <Check size={18} />}</button>
          <span>{task.text}</span>
          <button className="icon-button delete" onClick={() => remove(task.id)} aria-label="删除待办"><Trash2 size={18} /></button>
        </div>)}
      </div>
    </section>
  );
}

function AccountsPage({ data, setData, notify }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('餐饮');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategory, setEditCategory] = useState('餐饮');
  const total = data.records.reduce((sum, item) => sum + item.amount, 0);
  const addRecord = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || !note.trim()) return;
    const record = { id: Date.now(), amount: value, note: note.trim(), category, time: '刚刚' };
    setData((current) => ({ ...current, records: [record, ...current.records] }));
    setAmount(''); setNote(''); notify('账目已记录');
  };
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditNote(item.note);
    setEditCategory(item.category);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (event, id) => {
    event.preventDefault();
    const value = Number(editAmount);
    if (!value || value <= 0 || !editNote.trim()) return;
    setData((current) => ({
      ...current,
      records: current.records.map((item) => item.id === id ? { ...item, amount: value, note: editNote.trim(), category: editCategory } : item),
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
      <PageHeader title="轻松记账" icon={CircleDollarSign} action={<div className="month-total"><span>本月支出</span><strong>¥{total}</strong></div>} />
      <form className="entry-form panel" onSubmit={addRecord}>
        <label><span>金额</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-label="金额" /></label>
        <label><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="分类"><option>餐饮</option><option>交通</option><option>日用</option><option>学习</option><option>其他</option></select></label>
        <label className="wide"><span>备注</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="这笔钱花在了哪里" aria-label="备注" /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />记一笔</button>
      </form>
      <h2 className="section-title">最近账目</h2>
      <div className="record-list panel">
        {data.records.map((item) => editingId === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={(event) => saveEdit(event, item.id)}>
            <label><span>金额</span><input inputMode="decimal" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} aria-label={`编辑${item.note}金额`} required /></label>
            <label><span>分类</span><select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} aria-label={`编辑${item.note}分类`}><option>餐饮</option><option>交通</option><option>日用</option><option>学习</option><option>其他</option></select></label>
            <label className="wide"><span>备注</span><input value={editNote} onChange={(event) => setEditNote(event.target.value)} aria-label={`编辑${item.note}备注`} required /></label>
            <div className="record-edit-actions"><button className="primary-button" type="submit"><Check size={18} />保存</button><button className="secondary-button" type="button" onClick={cancelEdit}><X size={18} />取消</button></div>
          </form>
        ) : (
          <div className="record-row" key={item.id}>
            <span className="record-emoji">{item.category === '餐饮' ? '🍜' : item.category === '学习' ? '📚' : '🧾'}</span>
            <div><strong>{item.note}</strong><span>{item.category} · {item.time}</span></div>
            <b>-¥{item.amount}</b>
            <div className="record-actions"><button type="button" className="icon-button" onClick={() => startEdit(item)} aria-label={`编辑${item.note}`}><Pencil size={17} /></button><button type="button" className="icon-button delete" onClick={() => removeRecord(item)} aria-label={`删除${item.note}`}><Trash2 size={17} /></button></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const previous = new Date(year, month, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const offset = index - first.getDay() + 1;
    if (offset < 1) return { day: previous + offset, outside: true };
    if (offset > days) return { day: offset - days, outside: true };
    return { day: offset, outside: false };
  });
}

function SchedulePage({ data, setData, notify }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState('提前15分钟');
  const days = useMemo(() => buildMonthDays(today.getFullYear(), today.getMonth()), []);
  const addEvent = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setData((current) => ({ ...current, events: [...current.events, { id: Date.now(), title: title.trim(), date: selectedDate, time, reminder }] }));
    setTitle(''); notify('日程已添加');
  };
  const upcoming = [...data.events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return (
    <section className="page schedule-page">
      <PageHeader title="日程安排" icon={CalendarDays} action={<strong className="date-accent">{today.getFullYear()}年{today.getMonth() + 1}月</strong>} />
      <div className="calendar-layout">
        <div className="calendar panel">
          <h2><CalendarDays size={21} />{today.getFullYear()}年{today.getMonth() + 1}月</h2>
          <div className="weekdays">{'日一二三四五六'.split('').map((day) => <span key={day}>{day}</span>)}</div>
          <div className="days">{days.map((item, index) => {
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
            const isSelected = !item.outside && iso === selectedDate;
            return <button key={`${item.day}-${index}`} disabled={item.outside} className={`${item.outside ? 'outside' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDate(iso)}>{item.day}</button>;
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
      <div className="upcoming-list">{upcoming.map((item) => <div className="event-card" key={item.id}><div className="event-date"><strong>{Number(item.date.slice(8))}</strong><span>{Number(item.date.slice(5, 7))}月</span></div><div><strong>{item.title}</strong><span>{item.time} · {item.reminder}</span></div></div>)}</div>
    </section>
  );
}

function FitnessPage({ data, setData, notify }) {
  const [type, setType] = useState('饮食');
  const [date, setDate] = useState(getTodayIso);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const emoji = { 饮食: '🍜', 运动: '🏃', 饮水: '💧', 体重: '⚖️' };
  const addEntry = (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    const entry = { id: Date.now(), type, date, value: value.trim(), note: note.trim() };
    setData((current) => ({ ...current, fitnessEntries: [entry, ...current.fitnessEntries] }));
    setValue(''); setNote(''); notify('减脂记录已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    if (!editing.value.trim()) return;
    setData((current) => ({ ...current, fitnessEntries: current.fitnessEntries.map((item) => item.id === editing.id ? { ...editing, value: editing.value.trim(), note: editing.note.trim() } : item) }));
    setEditing(null); notify('减脂记录已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, fitnessEntries: current.fitnessEntries.filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="减脂记录" icon={Dumbbell} />
      <form className="entry-form panel fitness-form" onSubmit={addEntry}>
        <label><span>记录类型</span><select value={type} onChange={(event) => setType(event.target.value)} aria-label="减脂记录类型"><option>饮食</option><option>运动</option><option>饮水</option><option>体重</option></select></label>
        <label><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="减脂记录日期" required /></label>
        <label><span>数值</span><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="例如：350 千卡、45 分钟" aria-label="减脂记录数值" required /></label>
        <label><span>备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" aria-label="减脂记录备注" /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />保存记录</button>
      </form>
      <h2 className="section-title">历史记录</h2>
      <div className="module-record-list panel">
        {data.fitnessEntries.length ? data.fitnessEntries.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>记录类型</span><select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })} aria-label="编辑减脂记录类型"><option>饮食</option><option>运动</option><option>饮水</option><option>体重</option></select></label>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑减脂记录日期" required /></label>
            <label><span>数值</span><input value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} aria-label="编辑减脂记录数值" required /></label>
            <label><span>备注</span><input value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} aria-label="编辑减脂记录备注" /></label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon={emoji[item.type] ?? '📝'} title={item.type} detail={`${formatDate(item.date)}${item.note ? ` · ${item.note}` : ''}`} value={item.value} onEdit={() => setEditing({ ...item })} onRemove={() => remove(item.id)} />) : <p className="module-empty">还没有减脂记录</p>}
      </div>
    </section>
  );
}

function KeepsakesPage({ data, setData, notify }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayIso);
  const [editing, setEditing] = useState(null);
  const addKeepsake = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    const keepsake = { id: Date.now(), title: title.trim(), date };
    setData((current) => ({ ...current, keepsakes: [keepsake, ...current.keepsakes] }));
    setTitle(''); notify('纪念日已保存');
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
        <button className="primary-button wide" type="submit"><Plus size={20} />新增纪念日</button>
      </form>
      <h2 className="section-title">我的纪念日</h2>
      <div className="module-record-list panel">
        {data.keepsakes.length ? data.keepsakes.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>纪念日名称</span><input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} aria-label="编辑纪念日名称" required /></label>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑纪念日日期" required /></label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon="🎁" title={item.title} detail={formatDate(item.date)} value={formatCountdown(item.date)} onEdit={() => setEditing({ ...item })} onRemove={() => remove(item.id)} />) : <p className="module-empty">还没有纪念日</p>}
      </div>
    </section>
  );
}

function DiaryPage({ data, setData, notify }) {
  const [date, setDate] = useState(getTodayIso);
  const [mood, setMood] = useState('平静');
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(null);
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
      <h2 className="section-title">日记记录</h2>
      <div className="module-record-list panel">
        {data.diaryEntries.length ? data.diaryEntries.map((item) => editing?.id === item.id ? (
          <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
            <label><span>日期</span><input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} aria-label="编辑日记日期" required /></label>
            <label><span>心情</span><select value={editing.mood} onChange={(event) => setEditing({ ...editing, mood: event.target.value })} aria-label="编辑日记心情"><option>开心</option><option>平静</option><option>充实</option><option>疲惫</option><option>难过</option></select></label>
            <label className="wide"><span>日记内容</span><textarea value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} aria-label="编辑日记内容" required /></label>
            <EditActions onCancel={() => setEditing(null)} />
          </form>
        ) : <ModuleRecord key={item.id} icon="📖" title={formatDate(item.date)} detail={item.content} value={item.mood} onEdit={() => setEditing({ ...item })} onRemove={() => remove(item.id)} />) : <p className="module-empty">还没有日记</p>}
      </div>
    </section>
  );
}

function CyclePage({ data, setData, notify }) {
  const [startDate, setStartDate] = useState(getTodayIso);
  const [cycleLength, setCycleLength] = useState('28');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const addCycle = (event) => {
    event.preventDefault();
    const length = Number(cycleLength);
    if (!Number.isInteger(length) || length < 20 || length > 45) return;
    const entry = { id: Date.now(), startDate, cycleLength: length, note: note.trim() };
    setData((current) => ({ ...current, cycleEntries: [entry, ...current.cycleEntries] }));
    setNote(''); notify('经期记录已保存');
  };
  const saveEdit = (event) => {
    event.preventDefault();
    const length = Number(editing.cycleLength);
    if (!Number.isInteger(length) || length < 20 || length > 45) return;
    setData((current) => ({ ...current, cycleEntries: current.cycleEntries.map((item) => item.id === editing.id ? { ...editing, cycleLength: length, note: editing.note.trim() } : item) }));
    setEditing(null); notify('经期记录已更新');
  };
  const remove = (id) => setData((current) => ({ ...current, cycleEntries: current.cycleEntries.filter((item) => item.id !== id) }));
  return (
    <section className="page">
      <PageHeader title="周期记录" icon={Moon} />
      <form className="entry-form panel" onSubmit={addCycle}>
        <label><span>开始日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="经期开始日期" required /></label>
        <label><span>周期天数</span><input type="number" min="20" max="45" value={cycleLength} onChange={(event) => setCycleLength(event.target.value)} aria-label="周期天数" required /></label>
        <label className="wide"><span>备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：状态正常" aria-label="经期备注" /></label>
        <button className="primary-button wide" type="submit"><Plus size={20} />保存周期</button>
      </form>
      <h2 className="section-title">周期历史</h2>
      <div className="module-record-list panel">
        {data.cycleEntries.length ? data.cycleEntries.map((item) => {
          if (editing?.id === item.id) return (
            <form className="record-edit-row" key={item.id} onSubmit={saveEdit}>
              <label><span>开始日期</span><input type="date" value={editing.startDate} onChange={(event) => setEditing({ ...editing, startDate: event.target.value })} aria-label="编辑经期开始日期" required /></label>
              <label><span>周期天数</span><input type="number" min="20" max="45" value={editing.cycleLength} onChange={(event) => setEditing({ ...editing, cycleLength: event.target.value })} aria-label="编辑周期天数" required /></label>
              <label className="wide"><span>备注</span><input value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} aria-label="编辑经期备注" /></label>
              <EditActions onCancel={() => setEditing(null)} />
            </form>
          );
          const day = getCycleDay(item.startDate, item.cycleLength);
          return <ModuleRecord key={item.id} icon="🌙" title={item.note || '经期记录'} detail={`开始于 ${formatDate(item.startDate)} · ${item.cycleLength} 天周期`} value={<><strong>{day ? `第 ${day} 天` : '尚未开始'}</strong><small>下次预计 {formatDate(getNextCycleDate(item.startDate, item.cycleLength))}</small></>} onEdit={() => setEditing({ ...item })} onRemove={() => remove(item.id)} />;
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
  const updateProfile = (patch) => setData((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
      { header: '记录时间', key: 'time', width: 20 }, { header: '分类', key: 'category', width: 14 }, { header: '金额', key: 'amount', width: 14, type: Number, format: '¥#,##0.00' }, { header: '备注', key: 'note', width: 32 },
    ], data.records.map((item) => ({ time: item.time, category: item.category, amount: item.amount, note: item.note })));
    addSheet('减脂', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '类型', key: 'type', width: 14 }, { header: '数值', key: 'value', width: 18 }, { header: '备注', key: 'note', width: 32 },
    ], data.fitnessEntries.map((item) => ({ date: toExcelDate(item.date), type: item.type, value: item.value, note: item.note })));
    addSheet('日程', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '时间', key: 'time', width: 12 }, { header: '内容', key: 'title', width: 32 }, { header: '提醒', key: 'reminder', width: 18 },
    ], data.events.map((item) => ({ date: toExcelDate(item.date), time: item.time, title: item.title, reminder: item.reminder })));
    addSheet('纪念', [
      { header: '名称', key: 'title', width: 32 }, { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '倒计时', key: 'countdown', width: 18 },
    ], data.keepsakes.map((item) => ({ title: item.title, date: toExcelDate(item.date), countdown: formatCountdown(item.date) })));
    addSheet('日记', [
      { header: '日期', key: 'date', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '心情', key: 'mood', width: 14 }, { header: '日记内容', key: 'content', width: 54 },
    ], data.diaryEntries.map((item) => ({ date: toExcelDate(item.date), mood: item.mood, content: item.content })));
    addSheet('经期', [
      { header: '开始日期', key: 'startDate', width: 14, type: Date, format: 'yyyy-mm-dd' }, { header: '周期天数', key: 'cycleLength', width: 14, type: Number }, { header: '备注', key: 'note', width: 32 }, { header: '下次预计', key: 'nextDate', width: 14, type: Date, format: 'yyyy-mm-dd' },
    ], data.cycleEntries.map((item) => ({ startDate: toExcelDate(item.startDate), cycleLength: item.cycleLength, note: item.note, nextDate: toExcelDate(getNextCycleDate(item.startDate, item.cycleLength)) })));
    await writeXlsxFile(sheets).toFile(`Kitty工作台记录-${getTodayIso()}.xlsx`);
    notify('Excel 表格已导出');
  };
  const restoreBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const restored = JSON.parse(await file.text());
      const listKeys = ['tasks', 'records', 'events', 'fitnessEntries', 'keepsakes', 'diaryEntries', 'cycleEntries'];
      const isValid = restored && typeof restored === 'object' && restored.profile && listKeys.every((key) => Array.isArray(restored[key]));
      if (!isValid) throw new Error('invalid backup');
      if (!window.confirm('恢复备份会覆盖当前工作台的全部数据，确定继续吗？')) return;
      setData({ ...DEFAULT_DATA, ...restored, profile: { ...DEFAULT_DATA.profile, ...restored.profile } });
      notify('完整数据已恢复');
    } catch {
      notify('备份文件无法识别');
    } finally {
      event.target.value = '';
    }
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
        <div className="settings-button static"><span className="setting-icon tone-gray"><Info size={21} /></span><span><strong>关于</strong><small>Hello Kitty 工作台 v1.0</small></span></div>
      </section>
      <p className="made-with">Made with <span>💖</span> for {data.profile.nickname}<br />Hello Kitty © Sanrio</p>
    </section>
  );
}

export { App, TasksPage };
