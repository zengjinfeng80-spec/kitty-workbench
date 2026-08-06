import React from 'react';
import { CloudUpload, X } from 'lucide-react';

const LABELS = {
  tasks: '待办', records: '账目', events: '日程', fitnessEntries: '减脂记录',
  keepsakes: '纪念日', diaryEntries: '日记', cycleEntries: '经期记录',
};

export function MigrationDialog({ migration, onConfirm, onDismiss }) {
  if (!migration?.open) return null;
  return <div className="account-dialog-backdrop" role="presentation">
    <section className="account-dialog migration-dialog" role="dialog" aria-modal="true" aria-labelledby="migration-title">
      <button className="dialog-close" onClick={onDismiss} aria-label="暂不迁移"><X size={20} /></button>
      <div className="account-dialog-icon"><CloudUpload size={25} /></div>
      <h2 id="migration-title">发现本地记录</h2>
      <p>登录不会自动上传。请确认是否将这台设备的数据合并到账号。</p>
      <div className="migration-counts">
        {Object.entries(LABELS).map(([key, label]) => <div key={key}><span>{label}</span><strong>{migration.counts[key]} 条</strong></div>)}
      </div>
      <div className="migration-notice">本地数据会继续保留为安全副本。上传中断可以重新尝试，不会重复创建记录。</div>
      {migration.error && <div className="account-error" role="alert">{migration.error}</div>}
      <button className="primary-button" onClick={onConfirm} disabled={migration.busy}>{migration.busy ? '正在安全迁移…' : '确认上传并合并'}</button>
      <button className="text-button" onClick={onDismiss} disabled={migration.busy}>暂不迁移，仅查看云端数据</button>
    </section>
  </div>;
}
