import React, { useState, useEffect, useCallback, useRef } from 'react';
<<<<<<< HEAD
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
=======

// ---------- Default program (used on first launch / after reset) ----------
const DEFAULT_PROGRAM = [
  {
    id: 'd1', label: 'День 1', name: 'Push', sub: 'грудь · плечи · трицепс',
    exercises: [
      { id: 'd1e1', name: 'Жим штанги лёжа', target: '4×6-8' },
      { id: 'd1e2', name: 'Жим гантелей на наклонной', target: '3×8-10' },
      { id: 'd1e3', name: 'Жим штанги стоя', target: '3×8-10' },
      { id: 'd1e4', name: 'Разведение гантелей в стороны', target: '3×12-15' },
      { id: 'd1e5', name: 'Отжимания на брусьях / блок на трицепс', target: '3×10-12' },
      { id: 'd1e6', name: 'Французский жим', target: '3×10-12' },
    ],
  },
  {
    id: 'd2', label: 'День 2', name: 'Pull', sub: 'спина · бицепс',
    exercises: [
      { id: 'd2e1', name: 'Становая тяга', target: '4×5-6' },
      { id: 'd2e2', name: 'Подтягивания', target: '4×6-10' },
      { id: 'd2e3', name: 'Тяга штанги в наклоне', target: '3×8-10' },
      { id: 'd2e4', name: 'Тяга верхнего блока широким хватом', target: '3×10-12' },
      { id: 'd2e5', name: 'Подъём штанги на бицепс', target: '3×10-12' },
      { id: 'd2e6', name: 'Молотки с гантелями', target: '3×12' },
    ],
  },
  {
    id: 'd3', label: 'День 3', name: 'Legs', sub: 'ноги',
    exercises: [
      { id: 'd3e1', name: 'Приседания со штангой', target: '4×6-8' },
      { id: 'd3e2', name: 'Жим ногами', target: '3×10-12' },
      { id: 'd3e3', name: 'Румынская тяга', target: '3×8-10' },
      { id: 'd3e4', name: 'Разгибания ног', target: '3×12-15' },
      { id: 'd3e5', name: 'Сгибания ног', target: '3×12-15' },
      { id: 'd3e6', name: 'Икры стоя', target: '4×15-20' },
    ],
  },
  {
    id: 'd4', label: 'День 4', name: 'Push', sub: 'вариация',
    exercises: [
      { id: 'd4e1', name: 'Жим гантелей лёжа', target: '4×8-10' },
      { id: 'd4e2', name: 'Жим на наклонной в Смите/штанге', target: '3×8-10' },
      { id: 'd4e3', name: 'Жим Арнольда', target: '3×10-12' },
      { id: 'd4e4', name: 'Разведение в кроссовере', target: '3×12-15' },
      { id: 'd4e5', name: 'Жим узким хватом', target: '3×10-12' },
      { id: 'd4e6', name: 'Разгибание на блоке', target: '3×12-15' },
    ],
  },
  {
    id: 'd5', label: 'День 5', name: 'Pull', sub: 'вариация',
    exercises: [
      { id: 'd5e1', name: 'Тяга Т-грифа / гантели одной рукой', target: '4×8-10' },
      { id: 'd5e2', name: 'Тяга нижнего блока', target: '3×10-12' },
      { id: 'd5e3', name: 'Пуловер', target: '3×12-15' },
      { id: 'd5e4', name: 'Шраги', target: '3×12-15' },
      { id: 'd5e5', name: 'Подъём на бицепс на скамье Скотта', target: '3×10-12' },
      { id: 'd5e6', name: 'Обратные разведения на заднюю дельту', target: '3×12-15' },
    ],
  },
];

const DEFAULT_TARGETS = { kcal: 3050, proteinLo: 105, proteinHi: 130 };

const KEYS = {
  program: 'gt-program',
  logs: 'gt-logs',
  nutrition: 'gt-nutrition',
  targets: 'gt-targets',
};

// ---------- Storage helpers (localStorage, safe) ----------
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const todayKey = () => new Date().toISOString().slice(0, 10);

// ---------- Inline editable text ----------
function Editable({ value, onChange, placeholder, style, multiline = false, ariaLabel }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onChange(next);
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); } }}
        style={{ ...style, ...S.editableIdle, color: value ? style?.color : '#5C6250' }}
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      autoFocus
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
      style={{ ...style, ...S.editableInput }}
    />
  );
}

export default function App() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const [logs, setLogs] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [activeDay, setActiveDay] = useState(DEFAULT_PROGRAM[0].id);
  const [editMode, setEditMode] = useState(false);
  const [nutOpen, setNutOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageBroken, setStorageBroken] = useState(false);
  const [savedFlash, setSavedFlash] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ---- Load ----
  useEffect(() => {
    const prog = readJSON(KEYS.program, null);
    const validProgram = Array.isArray(prog) && prog.length > 0 ? prog : DEFAULT_PROGRAM;
    setProgram(validProgram);
    setActiveDay(validProgram[0].id);
    setLogs(readJSON(KEYS.logs, {}));
    setNutrition(readJSON(KEYS.nutrition, {}));
    setTargets({ ...DEFAULT_TARGETS, ...readJSON(KEYS.targets, {}) });
    try {
      localStorage.setItem('gt-probe', '1');
      localStorage.removeItem('gt-probe');
    } catch (e) {
      setStorageBroken(true);
    }
    setLoaded(true);
  }, []);

  // ---- Persist ----
  const persistProgram = useCallback(next => { setProgram(next); writeJSON(KEYS.program, next); }, []);
  const persistTargets = useCallback(next => { setTargets(next); writeJSON(KEYS.targets, next); }, []);

  const flash = id => {
    setSavedFlash(id);
    setTimeout(() => setSavedFlash(f => (f === id ? null : f)), 700);
  };

  const updateLog = useCallback((exId, field, value) => {
    setLogs(prev => {
      const next = { ...prev, [exId]: { ...(prev[exId] || {}), [field]: value } };
      writeJSON(KEYS.logs, next);
      return next;
    });
    flash(exId);
  }, []);

  const dateKey = todayKey();
  const nut = nutrition[dateKey] || { kcal: '', protein: '' };

  const updateNut = (field, value) => {
    setNutrition(prev => {
      const next = { ...prev, [dateKey]: { ...(prev[dateKey] || {}), [field]: value } };
      writeJSON(KEYS.nutrition, next);
      return next;
    });
  };

  // ---- Day CRUD ----
  const addDay = () => {
    const n = program.length + 1;
    const day = {
      id: uid(),
      label: `День ${n}`,
      name: 'Новый день',
      sub: 'группы мышц',
      exercises: [{ id: uid(), name: 'Новое упражнение', target: '3×10' }],
    };
    const next = [...program, day];
    persistProgram(next);
    setActiveDay(day.id);
    setEditMode(true);
  };

  const deleteDay = dayId => {
    if (program.length <= 1) return;
    const idx = program.findIndex(d => d.id === dayId);
    const next = program.filter(d => d.id !== dayId);
    persistProgram(next);
    if (activeDay === dayId) {
      setActiveDay(next[Math.max(0, idx - 1)].id);
    }
  };

  const moveDay = (dayId, dir) => {
    const idx = program.findIndex(d => d.id === dayId);
    const target = idx + dir;
    if (target < 0 || target >= program.length) return;
    const next = [...program];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistProgram(next);
  };

  const patchDay = (dayId, field, value) => {
    persistProgram(program.map(d => (d.id === dayId ? { ...d, [field]: value } : d)));
  };

  // ---- Exercise CRUD ----
  const addExercise = dayId => {
    persistProgram(program.map(d => (
      d.id === dayId
        ? { ...d, exercises: [...d.exercises, { id: uid(), name: 'Новое упражнение', target: '3×10' }] }
        : d
    )));
  };

  const deleteExercise = (dayId, exId) => {
    persistProgram(program.map(d => (
      d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d
    )));
  };

  const moveExercise = (dayId, exId, dir) => {
    persistProgram(program.map(d => {
      if (d.id !== dayId) return d;
      const idx = d.exercises.findIndex(e => e.id === exId);
      const target = idx + dir;
      if (target < 0 || target >= d.exercises.length) return d;
      const list = [...d.exercises];
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...d, exercises: list };
    }));
  };

  const patchExercise = (dayId, exId, field, value) => {
    persistProgram(program.map(d => (
      d.id === dayId
        ? { ...d, exercises: d.exercises.map(e => (e.id === exId ? { ...e, [field]: value } : e)) }
        : d
    )));
  };

  // ---- Reset ----
  const resetAll = () => {
    persistProgram(DEFAULT_PROGRAM);
    persistTargets(DEFAULT_TARGETS);
    setLogs({}); writeJSON(KEYS.logs, {});
    setNutrition({}); writeJSON(KEYS.nutrition, {});
    setActiveDay(DEFAULT_PROGRAM[0].id);
    setConfirmReset(false);
    setEditMode(false);
  };

  const day = program.find(d => d.id === activeDay) || program[0];
  const kcalPct = nut.kcal ? Math.min(100, Math.round((Number(nut.kcal) / (targets.kcal || 1)) * 100)) : 0;
  const protPct = nut.protein ? Math.min(100, Math.round((Number(nut.protein) / (targets.proteinLo || 1)) * 100)) : 0;

  if (!day) return null;

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0B0D0A; }
        ::selection { background: #C9FF3D; color: #0B0D0A; }
        input:focus { border-color: #C9FF3D !important; }
      `}</style>

      {/* ---------- Header ---------- */}
      <header style={S.header}>
        <div style={S.headerTop}>
          <div style={{ minWidth: 0 }}>
            <div style={S.kicker}>{loaded ? 'ТРЕНИРОВОЧНЫЙ ПЛАН' : 'ЗАГРУЗКА…'}</div>
            <h1 style={S.title}>Трекер тренировок</h1>
          </div>
          <div style={S.headerBtns}>
            <button
              onClick={() => setEditMode(v => !v)}
              style={{ ...S.pillBtn, ...(editMode ? S.pillBtnActive : {}) }}
            >
              {editMode ? '✓ Готово' : '✎ Редактировать'}
            </button>
            <button
              onClick={() => setNutOpen(v => !v)}
              style={{ ...S.pillBtn, ...(nutOpen ? S.pillBtnActive : {}) }}
            >
              {nutOpen ? '× Питание' : '⛽ Питание'}
            </button>
          </div>
        </div>
        {storageBroken && (
          <div style={S.errorNote}>
            Браузер блокирует сохранение — изменения пропадут при перезагрузке. Отключи режим инкогнито или разреши хранилище для сайта.
          </div>
        )}
      </header>

      {/* ---------- Nutrition panel ---------- */}
      {nutOpen && (
        <section style={S.nutPanel}>
          <div style={S.nutRow}>
            <div style={S.nutCol}>
              <div style={S.nutLabel}>Калории сегодня</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={nut.kcal} onChange={e => updateNut('kcal', e.target.value)}
                style={S.nutInput}
              />
              <div style={S.nutTargetRow}>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${kcalPct}%`, background: '#C9FF3D' }} />
                </div>
                <span style={S.nutTargetText}>
                  цель{' '}
                  <Editable
                    value={String(targets.kcal)}
                    onChange={v => persistTargets({ ...targets, kcal: Number(v) || 0 })}
                    placeholder="0" ariaLabel="Цель по калориям"
                    style={S.inlineNum}
                  />
                </span>
              </div>
            </div>

            <div style={S.nutCol}>
              <div style={S.nutLabel}>Белок сегодня, г</div>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={nut.protein} onChange={e => updateNut('protein', e.target.value)}
                style={S.nutInput}
              />
              <div style={S.nutTargetRow}>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${protPct}%`, background: '#FF6B4A' }} />
                </div>
                <span style={S.nutTargetText}>
                  <Editable
                    value={String(targets.proteinLo)}
                    onChange={v => persistTargets({ ...targets, proteinLo: Number(v) || 0 })}
                    placeholder="0" ariaLabel="Минимум белка" style={S.inlineNum}
                  />
                  –
                  <Editable
                    value={String(targets.proteinHi)}
                    onChange={v => persistTargets({ ...targets, proteinHi: Number(v) || 0 })}
                    placeholder="0" ariaLabel="Максимум белка" style={S.inlineNum}
                  />
                  {' '}г
                </span>
              </div>
            </div>
          </div>
          <div style={S.nutHint}>
            Нормы можно менять — нажми на цифру цели. Профицит калорий и достаточный белок решают в наборе массы не меньше, чем сами тренировки.
          </div>
        </section>
      )}

      {/* ---------- Day tabs ---------- */}
      <div style={S.tabsWrap}>
        <div style={S.tabs}>
          {program.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDay(d.id)}
              style={{ ...S.tab, ...(activeDay === d.id ? S.tabActive : {}) }}
            >
              <div style={S.tabLabelSmall}>{d.label}</div>
              <div style={S.tabName}>{d.name}</div>
            </button>
          ))}
          <button onClick={addDay} style={S.tabAdd} aria-label="Добавить день">+</button>
        </div>
      </div>

      {/* ---------- Day content ---------- */}
      <main style={S.content}>
        <div style={S.dayHeading}>
          <div style={S.dayHeadingText}>
            {editMode ? (
              <>
                <Editable
                  value={day.label} onChange={v => patchDay(day.id, 'label', v)}
                  placeholder="День N" ariaLabel="Номер дня" style={S.dayLabelEdit}
                />
                <Editable
                  value={day.name} onChange={v => patchDay(day.id, 'name', v)}
                  placeholder="Название" ariaLabel="Название дня" style={S.dayHeadingName}
                />
                <Editable
                  value={day.sub} onChange={v => patchDay(day.id, 'sub', v)}
                  placeholder="группы мышц" ariaLabel="Описание дня" style={S.dayHeadingSub}
                />
              </>
            ) : (
              <>
                <span style={S.dayHeadingName}>{day.name}</span>
                <span style={S.dayHeadingSub}>{day.sub}</span>
              </>
            )}
          </div>

          {editMode && (
            <div style={S.dayTools}>
              <button onClick={() => moveDay(day.id, -1)} style={S.iconBtn} title="Переместить влево">↑</button>
              <button onClick={() => moveDay(day.id, 1)} style={S.iconBtn} title="Переместить вправо">↓</button>
              <button
                onClick={() => deleteDay(day.id)}
                disabled={program.length <= 1}
                style={{ ...S.iconBtn, ...S.iconBtnDanger, ...(program.length <= 1 ? S.iconBtnDisabled : {}) }}
                title={program.length <= 1 ? 'Нельзя удалить последний день' : 'Удалить день'}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div style={S.exList}>
          {day.exercises.map((ex, i) => {
            const log = logs[ex.id] || {};
            return (
              <div key={ex.id} style={S.exCard}>
                <div style={S.exTop}>
                  <span style={S.exIndex}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={S.exNameWrap}>
                    {editMode ? (
                      <>
                        <Editable
                          value={ex.name}
                          onChange={v => patchExercise(day.id, ex.id, 'name', v)}
                          placeholder="Название упражнения"
                          ariaLabel="Название упражнения" style={S.exName}
                        />
                        <Editable
                          value={ex.target}
                          onChange={v => patchExercise(day.id, ex.id, 'target', v)}
                          placeholder="3×10"
                          ariaLabel="Рекомендуемые подходы и повторы" style={S.exTarget}
                        />
                      </>
                    ) : (
                      <>
                        <div style={S.exName}>{ex.name}</div>
                        <div style={S.exTarget}>{ex.target}</div>
                      </>
                    )}
                  </div>
                  {editMode ? (
                    <div style={S.exTools}>
                      <button onClick={() => moveExercise(day.id, ex.id, -1)} style={S.iconBtnSm} title="Выше">↑</button>
                      <button onClick={() => moveExercise(day.id, ex.id, 1)} style={S.iconBtnSm} title="Ниже">↓</button>
                      <button
                        onClick={() => deleteExercise(day.id, ex.id)}
                        style={{ ...S.iconBtnSm, ...S.iconBtnDanger }} title="Удалить"
                      >✕</button>
                    </div>
                  ) : (
                    savedFlash === ex.id && <span style={S.savedTag}>сохранено</span>
                  )}
                </div>

                <div style={S.exInputs}>
                  {[
                    { key: 'weight', label: 'Вес, кг', mode: 'decimal' },
                    { key: 'reps', label: 'Повторы', mode: 'numeric' },
                    { key: 'sets', label: 'Подходы', mode: 'numeric' },
                  ].map(f => (
                    <label key={f.key} style={S.inputLabel}>
                      <span>{f.label}</span>
                      <input
                        type="number" inputMode={f.mode} placeholder="—"
                        value={log[f.key] || ''}
                        onChange={e => updateLog(ex.id, f.key, e.target.value)}
                        style={S.numInput}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {day.exercises.length === 0 && (
            <div style={S.emptyNote}>В этом дне пока нет упражнений.</div>
          )}

          <button onClick={() => addExercise(day.id)} style={S.addExBtn}>
            + Добавить упражнение
          </button>
        </div>

        <div style={S.footer}>
          <div style={S.footerNote}>
            Всё редактируется: нажми «Редактировать», чтобы менять названия дней, упражнения и рекомендуемые подходы. Данные сохраняются в браузере автоматически.
          </div>
          {confirmReset ? (
            <div style={S.confirmRow}>
              <span style={S.confirmText}>Удалить весь план и записи?</span>
              <button onClick={resetAll} style={S.confirmYes}>Да, сбросить</button>
              <button onClick={() => setConfirmReset(false)} style={S.confirmNo}>Отмена</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={S.resetBtn}>
              Сбросить к стандартной программе
            </button>
          )}
        </div>
      </main>
>>>>>>> 5d22a0f028b09d42b8fb28d9cff8142e1cb047d6
    </div>
  );
}

<<<<<<< HEAD
/** Start a workout with as many rows as the target asks for, capped so the
 *  screen does not open with a wall of empty inputs. */
function startingSetCount(exercise) {
  const parsed = St.parseTarget(exercise.target);
  return Math.min(6, Math.max(1, parsed?.sets || 3));
}
=======
// ---------- Styles ----------
const S = {
  page: {
    minHeight: '100vh',
    background: '#0B0D0A',
    color: '#EDEFE6',
    fontFamily: "'Inter', sans-serif",
    paddingBottom: '56px',
  },
  header: { padding: '26px 20px 18px', borderBottom: '1px solid #1E211A' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  kicker: { fontFamily: "'Oswald', sans-serif", fontSize: '11px', letterSpacing: '0.14em', color: '#8A9078', marginBottom: '6px' },
  title: { fontFamily: "'Oswald', sans-serif", fontSize: '30px', fontWeight: 600, margin: 0, color: '#F5F7EC', letterSpacing: '-0.01em' },
  headerBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  pillBtn: {
    fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
    background: 'transparent', color: '#C9FF3D', border: '1px solid #3A4230',
    borderRadius: '999px', padding: '9px 15px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  pillBtnActive: { background: '#C9FF3D', color: '#0B0D0A', border: '1px solid #C9FF3D' },
  errorNote: { marginTop: '12px', fontSize: '11.5px', color: '#FF9B7A', lineHeight: 1.5 },

  nutPanel: { padding: '18px 20px 22px', borderBottom: '1px solid #1E211A', background: '#10130D' },
  nutRow: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  nutCol: { flex: '1 1 150px', minWidth: 0 },
  nutLabel: { fontSize: '12px', color: '#9AA089', marginBottom: '6px' },
  nutInput: {
    width: '100%', background: '#191C14', border: '1px solid #2C3123', borderRadius: '10px',
    color: '#F5F7EC', fontFamily: "'Oswald', sans-serif", fontSize: '22px', padding: '8px 12px', outline: 'none',
  },
  nutTargetRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' },
  barTrack: { flex: 1, height: '4px', background: '#22261A', borderRadius: '4px', overflow: 'hidden', minWidth: '30px' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  nutTargetText: { fontSize: '11px', color: '#767C67', whiteSpace: 'nowrap' },
  inlineNum: { fontSize: '11px', color: '#C9FF3D', fontWeight: 600 },
  nutHint: { marginTop: '14px', fontSize: '12px', lineHeight: 1.5, color: '#7C8270' },

  tabsWrap: { padding: '16px 20px 0', overflowX: 'auto' },
  tabs: { display: 'flex', gap: '8px' },
  tab: {
    flexShrink: 0, background: '#141712', border: '1px solid #22261A', borderRadius: '12px',
    padding: '10px 16px', cursor: 'pointer', textAlign: 'left', minWidth: '86px',
  },
  tabActive: { background: '#1C2114', border: '1px solid #C9FF3D' },
  tabLabelSmall: { fontSize: '10px', color: '#767C67', letterSpacing: '0.05em', marginBottom: '2px' },
  tabName: { fontFamily: "'Oswald', sans-serif", fontSize: '15px', fontWeight: 600, color: '#EDEFE6' },
  tabAdd: {
    flexShrink: 0, background: 'transparent', border: '1px dashed #3A4230', borderRadius: '12px',
    color: '#8A9078', fontSize: '20px', lineHeight: 1, cursor: 'pointer', padding: '0 16px', minWidth: '52px',
  },

  content: { padding: '22px 20px 0' },
  dayHeading: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  dayHeadingText: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', minWidth: 0 },
  dayLabelEdit: { fontSize: '11px', color: '#767C67' },
  dayHeadingName: { fontFamily: "'Oswald', sans-serif", fontSize: '20px', fontWeight: 600, color: '#C9FF3D' },
  dayHeadingSub: { fontSize: '13px', color: '#8A9078' },
  dayTools: { display: 'flex', gap: '6px' },

  iconBtn: {
    background: '#141712', border: '1px solid #2C3123', borderRadius: '8px', color: '#9AA089',
    fontSize: '13px', width: '30px', height: '30px', cursor: 'pointer', lineHeight: 1,
  },
  iconBtnSm: {
    background: '#161A11', border: '1px solid #262B1D', borderRadius: '6px', color: '#8A9078',
    fontSize: '11px', width: '24px', height: '24px', cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  iconBtnDanger: { color: '#FF8A66', borderColor: '#3D2A22' },
  iconBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },

  exList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  exCard: { background: '#12140F', border: '1px solid #1E2217', borderRadius: '14px', padding: '14px 14px 16px' },
  exTop: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' },
  exIndex: { fontFamily: "'Oswald', sans-serif", fontSize: '13px', color: '#4A5140', fontWeight: 600, paddingTop: '2px' },
  exNameWrap: { flex: 1, minWidth: 0 },
  exName: { fontSize: '14.5px', fontWeight: 600, color: '#F0F2E8', display: 'block' },
  exTarget: { fontSize: '12px', color: '#767C67', marginTop: '2px', display: 'block' },
  exTools: { display: 'flex', gap: '4px', flexShrink: 0 },
  savedTag: { fontSize: '10px', color: '#C9FF3D', fontWeight: 600, flexShrink: 0 },

  exInputs: { display: 'flex', gap: '8px' },
  inputLabel: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10.5px', color: '#767C67', minWidth: 0 },
  numInput: {
    background: '#191C14', border: '1px solid #262B1D', borderRadius: '8px', color: '#F5F7EC',
    fontFamily: "'Oswald', sans-serif", fontSize: '16px', padding: '9px 10px', outline: 'none', width: '100%',
  },

  editableIdle: {
    cursor: 'text', borderBottom: '1px dashed #3A4230', paddingBottom: '1px',
    display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word',
  },
  editableInput: {
    background: '#191C14', border: '1px solid #C9FF3D', borderRadius: '6px',
    padding: '4px 8px', outline: 'none', width: '100%', maxWidth: '100%',
    fontFamily: 'inherit',
  },

  emptyNote: { fontSize: '12.5px', color: '#5C6250', padding: '14px 4px' },
  addExBtn: {
    background: 'transparent', border: '1px dashed #3A4230', borderRadius: '12px',
    color: '#8A9078', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 500,
    padding: '13px', cursor: 'pointer', marginTop: '2px',
  },

  footer: { marginTop: '24px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '14px' },
  footerNote: { fontSize: '11.5px', lineHeight: 1.6, color: '#5C6250' },
  resetBtn: {
    alignSelf: 'flex-start', background: 'transparent', border: '1px solid #2C3123', borderRadius: '999px',
    color: '#767C67', fontSize: '11.5px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  confirmText: { fontSize: '12px', color: '#C4C9B4' },
  confirmYes: {
    background: '#3D2A22', border: '1px solid #5A3A2C', borderRadius: '999px', color: '#FF9B7A',
    fontSize: '11.5px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },
  confirmNo: {
    background: 'transparent', border: '1px solid #2C3123', borderRadius: '999px', color: '#8A9078',
    fontSize: '11.5px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },
};
>>>>>>> 5d22a0f028b09d42b8fb28d9cff8142e1cb047d6
