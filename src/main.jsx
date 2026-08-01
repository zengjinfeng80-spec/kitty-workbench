import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
  Moon,
  Plus,
  Settings,
  Sparkles,
  SunMedium,
  Trash2,
} from 'lucide-react';
import './styles.css';
import kittyHome from './assets/kitty/home.png';
import kittyTasks from './assets/kitty/tasks.png';
import kittyAccounts from './assets/kitty/accounts.png';
import kittyFitness from './assets/kitty/fitness.png';
import kittySchedule from './assets/kitty/schedule.png';
import kittyKeepsakes from './assets/kitty/keepsakes.png';
import kittyDiary from './assets/kitty/diary.png';
import kittyCycle from './assets/kitty/cycle.png';
import kittySettings from './assets/kitty/settings.png';
import kittyHero from './assets/kitty/hero.png';

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

const DEFAULT_DATA = {
  profile: { nickname: 'zjinx', birthday: '2000-01-05', reminders: true, dark: false },
  tasks: [
    { id: 1, text: '整理今天的工作清单', done: true },
    { id: 2, text: '完成 30 分钟专注学习', done: false },
    { id: 3, text: '晚上散步 20 分钟', done: false },
  ],
  records: [
    { id: 1, amount: 35, note: '午餐', category: '餐饮', time: '今天 12:20' },
    { id: 2, amount: 68, note: '生活用品', category: '日用', time: '昨天 18:40' },
    { id: 3, amount: 25, note: '咖啡', category: '餐饮', time: '昨天 09:15' },
  ],
  events: [
    { id: 1, title: '复习经济法', date: '2026-07-31', time: '19:30', reminder: '提前15分钟' },
    { id: 2, title: '月度复盘', date: '2026-08-02', time: '20:00', reminder: '提前1小时' },
  ],
};

function usePersistentData() {
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

function getGreeting(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return '早安';
  if (hour >= 11 && hour < 18) return '午安';
  return '晚上好';
}

function App() {
  const [active, setActive] = useState('home');
  const [data, setData] = usePersistentData();
  const [toast, setToast] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
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

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      notify('安装已开始');
    }
  };

  const pageProps = { data, setData, notify, setActive, installApp, canInstall: Boolean(installPrompt), isInstalled };
  const pages = {
    home: <HomePage {...pageProps} />,
    tasks: <TasksPage {...pageProps} />,
    accounts: <AccountsPage {...pageProps} />,
    fitness: <SimpleModule title="减脂记录" icon={Dumbbell} color="blue" rows={[['今日摄入', '280 千卡'], ['运动时长', '32 分钟'], ['饮水', '1.2 升']]} />,
    schedule: <SchedulePage {...pageProps} />,
    keepsakes: <SimpleModule title="纪念日" icon={Gift} color="lavender" rows={[['相识纪念日', '还有 28 天'], ['生日提醒', '还有 158 天']]} />,
    diary: <SimpleModule title="心情日记" icon={BookHeart} color="peach" rows={[['今天', '平静、专注'], ['昨天', '完成了一个小目标']]} />,
    cycle: <SimpleModule title="周期记录" icon={Moon} color="sky" rows={[['当前周期', '第 3 天'], ['下次预计', '8 月 27 日']]} />,
    settings: <SettingsPage {...pageProps} />,
  };

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />
      <main className="main-content">{pages[active]}</main>
      {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
      {needRefresh && <div className="update-toast" role="status">
        <span>工作台有新版本</span>
        <button onClick={() => updateServiceWorker(true)}>立即更新</button>
        <button className="update-later" onClick={() => setNeedRefresh(false)}>稍后</button>
      </div>}
    </div>
  );
}

function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <nav>
        {NAV_ITEMS.map(({ id, label, image }) => (
          <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onSelect(id)} aria-current={active === id ? 'page' : undefined}>
            <span className="nav-icon"><img src={image} alt="" /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function PageHeader({ title, icon: Icon, action }) {
  return (
    <header className="page-header">
      <div><span className="heading-icon"><Icon size={24} /></span><h1>{title}</h1></div>
      {action}
    </header>
  );
}

function HomePage({ data, setActive }) {
  const [now, setNow] = useState(() => new Date());
  const taskCount = data.tasks.length;
  const completed = data.tasks.filter((task) => task.done).length;
  const progress = 45;
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
          <div><span>💪 加油，继续努力</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="stat-grid">
        <button className="stat-card" onClick={() => setActive('tasks')}><strong className="pink">{taskCount}</strong><span>今日待办</span></button>
        <button className="stat-card" onClick={() => setActive('fitness')}><strong className="green">280</strong><span>摄入千卡</span></button>
        <button className="stat-card" onClick={() => setActive('accounts')}><strong className="orange">¥{data.records.reduce((sum, item) => sum + item.amount, 0)}</strong><span>今日支出</span></button>
        <button className="stat-card" onClick={() => setActive('cycle')}><strong className="pink">第 3 天</strong><span>经期周期</span></button>
      </div>

      <section className="activity-section">
        <h2><span>🕘</span> 最近动态</h2>
        <div className="activity-list">
          <Activity icon="🍜" title="记录了午餐" detail="280 千卡" time="刚刚" tone="pink" />
          <Activity icon="✅" title="完成了待办" detail={completed ? data.tasks.find((task) => task.done)?.text : '还没有完成项'} time="10 分钟前" tone="yellow" />
          <Activity icon="💰" title="记了一笔账" detail={`最近一笔 ¥${data.records[0]?.amount ?? 0}`} time="2 小时前" tone="mint" />
        </div>
      </section>
    </section>
  );
}

function Activity({ icon, title, detail, time, tone }) {
  return <div className="activity-row"><span className={`activity-icon tone-${tone}`}>{icon}</span><div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>;
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
  const total = data.records.reduce((sum, item) => sum + item.amount, 0);
  const addRecord = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || !note.trim()) return;
    const record = { id: Date.now(), amount: value, note: note.trim(), category, time: '刚刚' };
    setData((current) => ({ ...current, records: [record, ...current.records] }));
    setAmount(''); setNote(''); notify('账目已记录');
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
      <div className="record-list panel">{data.records.map((item) => <div className="record-row" key={item.id}><span className="record-emoji">{item.category === '餐饮' ? '🍜' : item.category === '学习' ? '📚' : '🧾'}</span><div><strong>{item.note}</strong><span>{item.category} · {item.time}</span></div><b>-¥{item.amount}</b></div>)}</div>
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

function SettingsPage({ data, setData, notify, installApp, canInstall, isInstalled }) {
  const updateProfile = (patch) => setData((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'Kitty工作台数据.json'; anchor.click(); URL.revokeObjectURL(url); notify('数据已导出');
  };
  return (
    <section className="page">
      <PageHeader title="设置" icon={Settings} />
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
        <button className="settings-button" onClick={exportData}><span className="setting-icon tone-blue"><CloudDownload size={21} /></span><span><strong>数据备份</strong><small>导出所有记录数据</small></span><ChevronRight size={20} /></button>
        <div className="settings-button static"><span className="setting-icon tone-gray"><Info size={21} /></span><span><strong>关于</strong><small>Hello Kitty 工作台 v1.0</small></span></div>
      </section>
      <p className="made-with">Made with <span>💖</span> for {data.profile.nickname}<br />Hello Kitty © Sanrio</p>
    </section>
  );
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

function SettingRow({ icon: Icon, title, detail, tone, children }) {
  return <div className="setting-row"><span className={`setting-icon tone-${tone}`}><Icon size={21} /></span><div><strong>{title}</strong><small>{detail}</small></div>{children}</div>;
}

function SimpleModule({ title, icon: Icon, color, rows }) {
  return <section className="page"><PageHeader title={title} icon={Icon} /><div className="simple-summary panel"><div className={`module-illustration tone-${color}`}><Icon size={42} /></div>{rows.map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
