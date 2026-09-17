import React, { useState, useEffect, useMemo } from 'react';
import { C, F, TAP, card, btnPrimary, btnGhost, btnDanger } from '../theme';
import { Stepper, Sheet } from '../components/common';
import * as St from '../lib/stats';

export default function Session({ session, data, onChange, onFinish, onDiscard }) {
  const [elapsed, setElapsed] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [restUntil, setRestUntil] = useState(null);
  const [now, setNow] = useState(Date.now());

  const settings = data.settings;

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setElapsed(Math.floor((Date.now() - new Date(session.startedAt)) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - new Date(session.startedAt)) / 1000));
    return () => clearInterval(t);
  }, [session.startedAt]);

  // History excluding the session in progress — a set logged a minute ago must
  // not become the "previous session" it is compared against.
  const priorSessions = useMemo(
    () => data.sessions.filter(s => s.id !== session.id),
    [data.sessions, session.id],
  );

  const suggestions = useMemo(() => {
    const out = {};
    for (const entry of session.entries) {
      out[entry.exerciseId] = St.suggestNext(
        { id: entry.exerciseId, name: entry.name, target: entry.target },
        priorSessions,
        settings.increment,
      );
    }
    return out;
  }, [session.entries, priorSessions, settings.increment]);

  const priorRecords = useMemo(() => St.personalRecords(priorSessions), [priorSessions]);

  const patchSet = (exerciseId, setIndex, field, value) => {
    onChange({
      ...session,
      entries: session.entries.map(e => {
        if (e.exerciseId !== exerciseId) return e;
        const sets = e.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
        return { ...e, sets };
      }),
    });
  };

  const addSet = (exerciseId) => {
    onChange({
      ...session,
      entries: session.entries.map(e => {
        if (e.exerciseId !== exerciseId) return e;
        const last = [...e.sets].reverse().find(St.isLogged);
        return { ...e, sets: [...e.sets, last ? { weight: last.weight, reps: '' } : { weight: '', reps: '' }] };
      }),
    });
  };

  const removeSet = (exerciseId, setIndex) => {
    onChange({
      ...session,
      entries: session.entries.map(e => (
        e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) } : e
      )),
    });
  };

  const applySuggestion = (exerciseId) => {
    const s = suggestions[exerciseId];
    if (!s || !s.weight) return;
    onChange({
      ...session,
      entries: session.entries.map(e => {
        if (e.exerciseId !== exerciseId) return e;
        const count = Math.max(s.sets || 3, 1);
        return {
          ...e,
          sets: Array.from({ length: count }, (_, i) => e.sets[i]?.reps
            ? e.sets[i]
            : { weight: String(s.weight), reps: '' }),
        };
      }),
    });
  };

  const startRest = (seconds) => setRestUntil(Date.now() + seconds * 1000);

  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;
  useEffect(() => { if (restUntil && restLeft === 0) setRestUntil(null); }, [restLeft, restUntil]);

  const loggedSets = St.sessionSetCount(session);
  const volume = St.sessionVolume(session);

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Sticky session header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: C.bg, borderBottom: `1px solid ${C.line}`,
        padding: '14px 18px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: F.display, fontSize: 19, fontWeight: 600, color: C.lime }}>
              {session.dayName}
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
              {clock(elapsed)} · {loggedSets} {St.plural(loggedSets, 'подход', 'подхода', 'подходов')}
              {volume > 0 && ` · ${St.fmt(volume / 1000, 1)} т`}
            </div>
          </div>
          <button onClick={() => setConfirmEnd(true)} style={{ ...btnGhost, padding: '10px 16px', flexShrink: 0 }}>
            Завершить
          </button>
        </div>

        {restLeft > 0 && (
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 10,
            background: C.surfaceHi, border: `1px solid ${C.lineHi}`, borderRadius: 10, padding: '8px 12px',
          }}>
            <span style={{ fontFamily: F.display, fontSize: 18, color: C.lime, minWidth: 46 }}>
              {clock(restLeft)}
            </span>
            <span style={{ fontSize: 11.5, color: C.textMid, flex: 1 }}>Отдых</span>
            <button
              onClick={() => setRestUntil(null)}
              style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, padding: 6 }}
            >
              Пропустить
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {session.entries.map((entry, idx) => {
          const suggestion = suggestions[entry.exerciseId];
          const pr = priorRecords[entry.exerciseId];
          const beatsPR = entry.sets.some(s =>
            St.isLogged(s) && pr && St.e1rm(s.weight, s.reps) > pr.e1rm + 0.001);

          return (
            <div key={entry.exerciseId} style={{ ...card, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text, minWidth: 0 }}>
                  {entry.name}
                </div>
                {beatsPR && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.bg, background: C.lime,
                    borderRadius: 5, padding: '3px 6px', flexShrink: 0, alignSelf: 'flex-start',
                  }}>
                    РЕКОРД
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11.5, color: C.textDim, marginBottom: 10 }}>
                {entry.target}
                {pr && ` · рекорд ${St.fmt(pr.weight)} × ${pr.reps}`}
              </div>

              {suggestion && suggestion.kind !== 'first' && suggestion.hint && (
                <button
                  onClick={() => applySuggestion(entry.exerciseId)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: C.surfaceHi, border: `1px solid ${C.line}`,
                    borderRadius: 10, padding: '9px 11px', marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 12.5, color: C.lime, fontWeight: 600, marginBottom: 2 }}>
                    Цель: {suggestion.text}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textFaint }}>{suggestion.hint} · нажми, чтобы подставить</div>
                </button>
              )}

              {suggestion && suggestion.kind === 'first' && (
                <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 10 }}>
                  {suggestion.text}
                </div>
              )}

              {/* Sets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.sets.map((set, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: F.display, fontSize: 12, color: C.textFaint,
                      width: 16, flexShrink: 0, textAlign: 'center',
                    }}>
                      {i + 1}
                    </span>

                    <div style={{ flex: 1.3, minWidth: 0 }}>
                      <Stepper
                        value={set.weight}
                        onChange={v => patchSet(entry.exerciseId, i, 'weight', v)}
                        step={settings.increment}
                        suffix="кг"
                        ariaLabel={`${entry.name}, подход ${i + 1}, вес`}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Stepper
                        value={set.reps}
                        onChange={v => {
                          patchSet(entry.exerciseId, i, 'reps', v);
                          if (v && set.weight) startRest(120);
                        }}
                        step={1}
                        suffix="×"
                        ariaLabel={`${entry.name}, подход ${i + 1}, повторы`}
                      />
                    </div>

                    <button
                      onClick={() => removeSet(entry.exerciseId, i)}
                      aria-label={`Удалить подход ${i + 1}`}
                      disabled={entry.sets.length <= 1}
                      style={{
                        background: 'none', border: 'none', color: C.textFaint,
                        fontSize: 15, width: 28, minHeight: TAP, flexShrink: 0,
                        opacity: entry.sets.length <= 1 ? 0.3 : 1,
                      }}
                    >×</button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(entry.exerciseId)}
                style={{
                  marginTop: 10, width: '100%', background: 'transparent',
                  border: `1px dashed ${C.lineHi}`, borderRadius: 10,
                  color: C.textDim, fontSize: 12.5, padding: '10px', minHeight: 40,
                }}
              >
                + Подход
              </button>
            </div>
          );
        })}

        {session.entries.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: C.textFaint, fontSize: 13, padding: 24 }}>
            В этом дне нет упражнений. Добавь их во вкладке «План».
          </div>
        )}
      </div>

      <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Завершить тренировку?">
        <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
          {loggedSets > 0
            ? `Записано ${loggedSets} ${St.plural(loggedSets, 'подход', 'подхода', 'подходов')}, объём ${St.fmt(volume / 1000, 1)} т. Пустые подходы не сохранятся.`
            : 'Ни одного подхода не записано — сохранять нечего.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {loggedSets > 0 && (
            <button onClick={onFinish} style={btnPrimary}>Сохранить тренировку</button>
          )}
          <button onClick={onDiscard} style={{ ...btnDanger, width: '100%' }}>
            {loggedSets > 0 ? 'Удалить без сохранения' : 'Закрыть тренировку'}
          </button>
          <button onClick={() => setConfirmEnd(false)} style={{ ...btnGhost, width: '100%' }}>
            Продолжить занятие
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function clock(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
