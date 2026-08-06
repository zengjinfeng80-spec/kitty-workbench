import React from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw, UserRound } from 'lucide-react';

function maskEmail(email = '') {
  return email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
}

export function AccountSyncCard({ account, onOpenLogin, onSync, onSignOut }) {
  if (!account.configured) return <section className="account-sync-card panel unavailable">
    <span className="account-card-icon"><CloudOff size={24} /></span>
    <div><h2>云同步尚未配置</h2><p>当前仍是安全的本地模式。连接 Supabase 后即可登录并跨设备同步。</p></div>
  </section>;

  if (!account.session) return <section className="account-sync-card panel">
    <span className="account-card-icon"><UserRound size={24} /></span>
    <div><h2>登录并同步</h2><p>使用邮箱 6 位验证码登录，手机和电脑可同步同一份数据。</p></div>
    <button className="primary-button" onClick={onOpenLogin}>开始登录</button>
  </section>;

  const statusText = account.status === 'offline' ? '离线使用中' : account.status === 'syncing' ? '正在同步…' : account.status === 'error' ? '同步失败，可重试' : account.pendingCount ? `有 ${account.pendingCount} 条待同步` : '所有数据已同步';
  return <section className="account-sync-card panel signed-in">
    <span className="account-card-icon"><Cloud size={24} /></span>
    <div className="account-copy"><h2>账号与同步</h2><p>{maskEmail(account.session.user.email)}</p><strong>{statusText}</strong><small>{account.lastSyncedAt ? `最后同步：${new Date(account.lastSyncedAt).toLocaleString('zh-CN')}` : '尚未完成首次同步'}</small></div>
    <div className="account-actions"><button className="secondary-button" onClick={onSync} disabled={account.status === 'syncing'}><RefreshCw size={17} />立即同步</button><button className="text-button danger" onClick={onSignOut}><LogOut size={16} />退出登录</button></div>
  </section>;
}
