import React, { useState, useEffect, useCallback, useRef } from 'react';
import { C, F, globalCSS, TAP } from './theme';
import * as db from './lib/db';
import * as St from './lib/stats';
import { Sheet } from './components/common';

import Auth from './views/Auth';
import Today from './views/Today';
import SessionView from './views/Session';
import History from './views/History';
import Progress from './views/Progress';
import Program from './views/Program';
import Account from './views/Account';

const TABS = [
  { id: 'today', label: 'Сегодня', icon: '⌂' },
  { id: 'program', label: 'План', icon: '☰' },
  { id: 'history', label: 'История', icon: '◴' },
  { id: 'progress', label: 'Прогресс', icon: '◪' },
  { id: 'account', label: 'Профиль', icon: '◎' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('today');
  const [active, setActive] = useState(null);   // workout in progress
  const [booted, setBooted] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [prSheet, setPrSheet] = useState(null); // records earned by the last save

  const scrollRef = useRef(null);

  // ---- boot ----
  useEffect(() => {
    setStorageOk(db.checkStorage());
    const existing = db.currentUser();
    if (existing) {
      setUser(existing);
      setData(db.loadData(existing.id));
    }
    setBooted(true);
  }, []);

  // ---- persist on every change ----
  const update = useCallback((next) => {
    setData(next);
    if (user) db.saveData(user.id, next);
  }, [user]);

  const authed = (u) => {
    setUser(u);
    setData(db.loadData(u.id));
    setTab('today');
  };

  const signOut = () => {
    db.signOut();
    setUser(null);
    setData(null);
    setActive(null);
    setTab('today');
  };

  // ---- workout lifecycle ----
  const startWorkout = (dayId) => {
    const day = data.program.find(d => d.id === dayId);
    if (!day) return;
    setActive({
      id: db.uid(),
      dayId: day.id,
      dayName: day.name,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      entries: day.exercises.map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        target: ex.target,
        sets: Array.from({ length: startingSetCount(ex) }, () => ({ weight: '', reps: '' })),
      })),
    });
    window.scrollTo(0, 0);
  };

  const finishWorkout = () => {
    // Drop blank sets, then blank exercises — an empty row should not become
    // history just because the screen offered it.
    const cleaned = {
      ...active,
      finishedAt: new Date().toISOString(),
      entries: active.entries
        .map(e => ({ ...e, sets: e.sets.filter(St.isLogged) }))
        .filter(e => e.sets.length > 0),
    };

    const nextSessions = [...data.sessions, cleaned];
    update({ ...data, sessions: nextSessions });

    const earned = St.recordsInSession(nextSessions, cleaned.id);
    setActive(null);
    setTab('today');
    window.scrollTo(0, 0);
    if (earned.length) setPrSheet({ records: earned, session: cleaned });
  };

  const deleteSession = (id) =>
    update({ ...data, sessions: data.sessions.filter(s => s.id !== id) });

  // ---- render ----
  if (!booted) return <div style={{ background: C.bg, minHeight: '100vh' }} />;

  if (!user || !data) {
    return (
      <>
        <style>{globalCSS}</style>
        <Auth onAuthed={authed} />
      </>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <style>{globalCSS}</style>

      {!storageOk && (
        <div style={{
          background: C.emberDim, color: '#FFBFA8', fontSize: 11.5,
          padding: '9px 18px', lineHeight: 1.5,
        }}>
          Браузер блокирует сохранение — записи пропадут после перезагрузки. Отключи приватный режим для этого сайта.
        </div>
      )}

      <div
        ref={scrollRef}
        style={{ paddingBottom: active ? 24 : `calc(${TAP + 30}px + env(safe-area-inset-bottom))`, maxWidth: 560, margin: '0 auto' }}
      >
        {active ? (
          <SessionView
            session={active}
            data={data}
            onChange={setActive}
            onFinish={finishWorkout}
            onDiscard={() => { setActive(null); setTab('today'); }}
          />
        ) : (
          <>
            {tab === 'today' && (
              <Today data={data} user={user} onStart={startWorkout} onGo={setTab} />
            )}
            {tab === 'program' && (
              <Program data={data} onChange={update} onStart={startWorkout} />
            )}
            {tab === 'history' && (
              <History data={data} onDelete={deleteSession} onGo={setTab} />
            )}
            {tab === 'progress' && <Progress data={data} />}
            {tab === 'account' && (
              <Account
                user={user}
                data={data}
                onChange={update}
                onSignOut={signOut}
                onRename={(name) => { db.renameUser(user.id, name); setUser({ ...user, name }); }}
                onImported={(next) => setData(next)}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom navigation: thumb-reachable, hidden during a workout so the
          logging screen keeps the full height. */}
      {!active && (
        <nav style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
          background: 'rgba(11,13,10,.94)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${C.line}`,
          display: 'flex',
          padding: `6px 4px calc(6px + env(safe-area-inset-bottom))`,
        }}>
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}
                aria-current={on ? 'page' : undefined}
                style={{
                  flex: 1, background: 'none', border: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '7px 2px', minHeight: TAP, color: on ? C.lime : C.textDim,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Records earned, shown once right after saving */}
      <Sheet open={!!prSheet} onClose={() => setPrSheet(null)} title={prSheet?.records.length === 1 ? 'Новый рекорд' : 'Новые рекорды'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {prSheet?.records.map(r => (
            <div key={r.exerciseId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              paddingBottom: 12, borderBottom: `1px solid ${C.line}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.text }}>{r.name}</div>
                {r.previous && (
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>
                    было {St.fmt(r.previous.weight)} × {r.previous.reps}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 19, color: C.lime, flexShrink: 0 }}>
                {St.fmt(r.weight)} × {r.reps}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPrSheet(null)}
          style={{
            background: C.lime, color: C.bg, border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600, padding: '14px 18px', width: '100%', minHeight: TAP,
          }}
        >
          Дальше
        </button>
      </Sheet>
    </div>
  );
}

/** Start a workout with as many rows as the target asks for, capped so the
 *  screen does not open with a wall of empty inputs. */
function startingSetCount(exercise) {
  const parsed = St.parseTarget(exercise.target);
  return Math.min(6, Math.max(1, parsed?.sets || 3));
}
