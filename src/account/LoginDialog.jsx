import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, X } from 'lucide-react';

export function LoginDialog({ open, onClose, onSendCode, onVerifyCode }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep('email'); setCode(''); setError(''); setBusy(false); setSeconds(0);
  }, [open]);

  useEffect(() => {
    if (!seconds) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  if (!open) return null;

  const send = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await onSendCode(email.trim());
      setStep('code'); setSeconds(60);
    } catch (sendError) {
      setError(sendError.message || '验证码发送失败，请稍后重试');
    } finally { setBusy(false); }
  };

  const verify = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await onVerifyCode(email.trim(), code);
      onClose();
    } catch (verifyError) {
      setError(verifyError.message || '验证码不正确或已过期');
    } finally { setBusy(false); }
  };

  const maskEmail = email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  return <div className="account-dialog-backdrop" role="presentation">
    <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button className="dialog-close" onClick={onClose} aria-label="关闭登录"><X size={20} /></button>
      <div className="account-dialog-icon">{step === 'email' ? <Mail size={25} /> : <ShieldCheck size={25} />}</div>
      <h2 id="login-title">{step === 'email' ? '登录并同步' : '输入邮箱验证码'}</h2>
      <p>{step === 'email' ? '登录同一账号，即可在手机和电脑同步工作台数据。' : `验证码已发送至 ${maskEmail}`}</p>
      {step === 'email' ? <form onSubmit={send}>
        <label><span>邮箱地址</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required autoFocus /></label>
        {error && <div className="account-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? '正在发送…' : '发送 6 位验证码'}</button>
      </form> : <form onSubmit={verify}>
        <label><span>6 位验证码</span><input className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required autoFocus /></label>
        {error && <div className="account-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={busy || code.length !== 6}>{busy ? '正在验证…' : '验证并登录'}</button>
        <button type="button" className="text-button" disabled={seconds > 0 || busy} onClick={() => send({ preventDefault() {} })}>{seconds > 0 ? `${seconds} 秒后可重新发送` : '重新发送验证码'}</button>
        <button type="button" className="text-button back" onClick={() => setStep('email')}><ArrowLeft size={16} />修改邮箱</button>
      </form>}
      <small>未登录时仍可继续使用本地模式，原记录不会被清除。</small>
    </section>
  </div>;
}
