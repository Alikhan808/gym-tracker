import React, { useState } from 'react';
import { C, F, btnPrimary, btnGhost, textInput, label } from '../theme';
import * as db from '../lib/db';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('in'); // 'in' | 'up'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const user = mode === 'up' ? await db.signUp(form) : await db.signIn(form);
      onAuthed(user);
    } catch (e) {
      setError(e.message || 'Не получилось войти');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = e => { if (e.key === 'Enter' && !busy) submit(); };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '32px 22px', maxWidth: 440, margin: '0 auto',
    }}>
      <div style={{ marginBottom: 30 }}>
        <div style={{ fontFamily: F.display, fontSize: 34, fontWeight: 600, color: '#F5F7EC', lineHeight: 1.1 }}>
          Трекер тренировок
        </div>
        <div style={{ fontSize: 14, color: C.textMid, marginTop: 10, lineHeight: 1.6 }}>
          Записывай подходы, следи за рекордами и смотри, как растут веса.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['in', 'Вход'], ['up', 'Регистрация']].map(([key, text]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(''); }}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: `2px solid ${mode === key ? C.lime : C.line}`,
              color: mode === key ? C.text : C.textDim,
              fontSize: 14, fontWeight: 600, padding: '10px 0',
            }}
          >{text}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'up' && (
          <div>
            <div style={{ ...label, marginBottom: 6 }}>Имя</div>
            <input
              value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={onKeyDown}
              placeholder="Как к тебе обращаться" autoComplete="name" style={textInput}
            />
          </div>
        )}

        <div>
          <div style={{ ...label, marginBottom: 6 }}>Email</div>
          <input
            type="email" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={onKeyDown}
            placeholder="you@example.com" autoComplete="email" inputMode="email" style={textInput}
          />
        </div>

        <div>
          <div style={{ ...label, marginBottom: 6 }}>Пароль</div>
          <input
            type="password" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={onKeyDown}
            placeholder="От 6 символов"
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            style={textInput}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12.5, color: C.ember, lineHeight: 1.5 }}>{error}</div>
        )}

        <button onClick={submit} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1, marginTop: 4 }}>
          {busy ? 'Минуту…' : mode === 'up' ? 'Создать аккаунт' : 'Войти'}
        </button>

        <button onClick={() => onAuthed(db.signInAsGuest())} style={{ ...btnGhost, width: '100%' }}>
          Продолжить без аккаунта
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.textFaint, lineHeight: 1.6, marginTop: 24 }}>
        Аккаунт и все записи хранятся в этом браузере и никуда не отправляются. На другом устройстве данных не будет — перенести их можно выгрузкой файла в настройках.
      </div>
    </div>
  );
}
