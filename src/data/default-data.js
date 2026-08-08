export const DEFAULT_DATA = {
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
  fitnessEntries: [
    { id: 1, type: '饮食', value: '280 千卡', note: '今日摄入', date: '2026-08-01' },
    { id: 2, type: '运动', value: '32 分钟', note: '运动时长', date: '2026-08-01' },
    { id: 3, type: '饮水', value: '1.2 升', note: '饮水', date: '2026-08-01' },
  ],
  keepsakes: [
    { id: 1, title: '相识纪念日', date: '2026-08-29' },
    { id: 2, title: '生日提醒', date: '2027-01-06' },
  ],
  diaryEntries: [
    { id: 1, date: '2026-08-01', mood: '平静', content: '今天保持专注，完成了一个小目标。' },
    { id: 2, date: '2026-07-31', mood: '开心', content: '认真生活的一天。' },
  ],
  cycleEntries: [
    { id: 1, startDate: '2026-07-30', cycleLength: 28, note: '当前周期' },
  ],
};
