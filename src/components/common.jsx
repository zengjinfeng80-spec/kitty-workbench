import React from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';

export function Sidebar({ items, active, onSelect }) {
  return <aside className="sidebar" aria-label="主导航"><nav>{items.map(({ id, label, image }) => (
    <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onSelect(id)} aria-current={active === id ? 'page' : undefined}>
      <span className="nav-icon"><img src={image} alt="" /></span><span>{label}</span>
    </button>
  ))}</nav></aside>;
}

export function PageHeader({ title, icon: Icon, action }) {
  return <header className="page-header"><div><span className="heading-icon"><Icon size={24} /></span><h1>{title}</h1></div>{action}</header>;
}

export function Activity({ icon, title, detail, time, tone }) {
  return <div className="activity-row"><span className={`activity-icon tone-${tone}`}>{icon}</span><div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>;
}

export function EditActions({ onCancel }) {
  return <div className="record-edit-actions"><button className="primary-button" type="submit"><Check size={18} />保存</button><button className="secondary-button" type="button" onClick={onCancel}><X size={18} />取消</button></div>;
}

export function ModuleRecord({ icon, title, detail, value, onEdit, onRemove }) {
  return <div className="module-record-row"><span className="module-record-icon" aria-hidden="true">{icon}</span><div className="module-record-copy"><strong>{title}</strong><span>{detail}</span></div><div className="module-record-value">{value}</div><div className="module-record-actions"><button type="button" className="icon-button" onClick={onEdit} aria-label={`编辑${title}`}><Pencil size={17} /></button><button type="button" className="icon-button delete" onClick={onRemove} aria-label={`删除${title}`}><Trash2 size={18} /></button></div></div>;
}

export function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

export function SettingRow({ icon: Icon, title, detail, tone, children }) {
  return <div className="setting-row"><span className={`setting-icon tone-${tone}`}><Icon size={21} /></span><div><strong>{title}</strong><small>{detail}</small></div>{children}</div>;
}
