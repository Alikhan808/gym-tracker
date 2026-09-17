import React, { useState } from 'react';
import { C, F, card, h1, btnGhost, btnDanger, btnPrimary } from '../theme';
import { Editable, Sheet } from '../components/common';
import { uid, DEFAULT_PROGRAM } from '../lib/db';
import * as St from '../lib/stats';

export default function Program({ data, onChange, onStart }) {
  const program = data.program;
  const [activeId, setActiveId] = useState(program[0]?.id);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const day = program.find(d => d.id === activeId) || program[0];
  const setProgram = next => onChange({ ...data, program: next });

  const addDay = () => {
    const d = {
      id: uid(),
      label: `День ${program.length + 1}`,
      name: 'Новый день',
      sub: 'группы мышц',
      exercises: [{ id: uid(), name: 'Новое упражнение', target: '3×10' }],
    };
    setProgram([...program, d]);
    setActiveId(d.id);
    setEditing(true);
  };

  const deleteDay = id => {
    if (program.length <= 1) return;
    const idx = program.findIndex(d => d.id === id);
    const next = program.filter(d => d.id !== id);
    setProgram(next);
    if (activeId === id) setActiveId(next[Math.max(0, idx - 1)].id);
  };

  const moveDay = (id, dir) => {
    const idx = program.findIndex(d => d.id === id);
    const t = idx + dir;
    if (t < 0 || t >= program.length) return;
    const next = [...program];
    [next[idx], next[t]] = [next[t], next[idx]];
    setProgram(next);
  };

  const patchDay = (id, field, value) =>
    setProgram(program.map(d => (d.id === id ? { ...d, [field]: value } : d)));

  const addExercise = dayId =>
    setProgram(program.map(d => (
      d.id === dayId
        ? { ...d, exercises: [...d.exercises, { id: uid(), name: 'Новое упражнение', target: '3×10' }] }
        : d
    )));

  const deleteExercise = (dayId, exId) =>
    setProgram(program.map(d => (
      d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d
    )));

  const moveExercise = (dayId, exId, dir) =>
    setProgram(program.map(d => {
      if (d.id !== dayId) return d;
      const idx = d.exercises.findIndex(e => e.id === exId);
      const t = idx + dir;
      if (t < 0 || t >= d.exercises.length) return d;
      const list = [...d.exercises];
      [list[idx], list[t]] = [list[t], list[idx]];
      return { ...d, exercises: list };
    }));

  const patchExercise = (dayId, exId, field, value) =>
    setProgram(program.map(d => (
      d.id === dayId
        ? { ...d, exercises: d.exercises.map(e => (e.id === exId ? { ...e, [field]: value } : e)) }
        : d
    )));

  if (!day) return null;

  const records = St.personalRecords(data.sessions);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={h1}>План</h1>
        <button
          onClick={() => setEditing(v => !v)}
          style={{
            ...btnGhost, padding: '9px 15px',
            ...(editing ? { background: C.lime, color: C.bg, borderColor: C.lime } : {}),
          }}
        >
          {editing ? 'Готово' : 'Изменить'}
        </button>
      </div>

      {/* Day tabs */}
      <div className="gt-scroll-x" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {program.map(d => (
          <button
            key={d.id}
            onClick={() => setActiveId(d.id)}
            style={{
              flexShrink: 0, textAlign: 'left', minWidth: 84,
              background: d.id === activeId ? '#1C2114' : C.surface,
              border: `1px solid ${d.id === activeId ? C.lime : C.line}`,
              borderRadius: 12, padding: '10px 15px',
            }}
          >
            <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 2 }}>{d.label}</div>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.text }}>{d.name}</div>
          </button>
        ))}
        <button
          onClick={addDay}
          aria-label="Добавить день"
          style={{
            flexShrink: 0, background: 'transparent', border: `1px dashed ${C.lineHi}`,
            borderRadius: 12, color: C.textMid, fontSize: 20, padding: '0 17px', minWidth: 54,
          }}
        >+</button>
      </div>

      {/* Day header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap', minWidth: 0 }}>
          {editing ? (
            <>
              <Editable value={day.label} onChange={v => patchDay(day.id, 'label', v)}
                placeholder="День N" ariaLabel="Номер дня" style={{ fontSize: 11, color: C.textDim }} />
              <Editable value={day.name} onChange={v => patchDay(day.id, 'name', v)}
                placeholder="Название" ariaLabel="Название дня"
                style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.lime }} />
              <Editable value={day.sub} onChange={v => patchDay(day.id, 'sub', v)}
                placeholder="группы мышц" ariaLabel="Описание дня"
                style={{ fontSize: 13, color: C.textMid }} />
            </>
          ) : (
            <>
              <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.lime }}>{day.name}</span>
              <span style={{ fontSize: 13, color: C.textMid }}>{day.sub}</span>
            </>
          )}
        </div>

        {editing && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => moveDay(day.id, -1)} style={iconBtn} aria-label="Раньше">↑</button>
            <button onClick={() => moveDay(day.id, 1)} style={iconBtn} aria-label="Позже">↓</button>
            <button
              onClick={() => deleteDay(day.id)}
              disabled={program.length <= 1}
              style={{ ...iconBtn, color: C.ember, borderColor: C.emberDim, opacity: program.length <= 1 ? 0.35 : 1 }}
              aria-label="Удалить день"
            >✕</button>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {day.exercises.map(ex => {
          const pr = records[ex.id];
          return (
            <div key={ex.id} style={{ ...card, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing ? (
                    <>
                      <Editable value={ex.name} onChange={v => patchExercise(day.id, ex.id, 'name', v)}
                        placeholder="Название упражнения" ariaLabel="Название упражнения"
                        style={{ fontSize: 14.5, fontWeight: 600, color: C.text, display: 'block' }} />
                      <div style={{ marginTop: 4 }}>
                        <Editable value={ex.target} onChange={v => patchExercise(day.id, ex.id, 'target', v)}
                          placeholder="3×10" ariaLabel="Подходы и повторы"
                          style={{ fontSize: 12, color: C.textDim }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: C.textDim, marginTop: 3 }}>
                        {ex.target}
                        {pr && ` · рекорд ${St.fmt(pr.weight)} × ${pr.reps}`}
                      </div>
                    </>
                  )}
                </div>

                {editing && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => moveExercise(day.id, ex.id, -1)} style={iconBtnSm} aria-label="Выше">↑</button>
                    <button onClick={() => moveExercise(day.id, ex.id, 1)} style={iconBtnSm} aria-label="Ниже">↓</button>
                    <button
                      onClick={() => deleteExercise(day.id, ex.id)}
                      style={{ ...iconBtnSm, color: C.ember, borderColor: C.emberDim }}
                      aria-label="Удалить упражнение"
                    >✕</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {day.exercises.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.textFaint, padding: '14px 4px' }}>
            В этом дне пока нет упражнений.
          </div>
        )}

        {editing && (
          <button
            onClick={() => addExercise(day.id)}
            style={{
              background: 'transparent', border: `1px dashed ${C.lineHi}`, borderRadius: 12,
              color: C.textMid, fontSize: 13, padding: 13, minHeight: 44,
            }}
          >
            + Добавить упражнение
          </button>
        )}
      </div>

      {!editing && day.exercises.length > 0 && (
        <button onClick={() => onStart(day.id)} style={{ ...btnPrimary, marginTop: 16 }}>
          Начать «{day.name}»
        </button>
      )}

      {editing && (
        <button
          onClick={() => setConfirmReset(true)}
          style={{ ...btnGhost, width: '100%', marginTop: 18, fontSize: 12.5, color: C.textDim }}
        >
          Вернуть стандартную программу
        </button>
      )}

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Вернуть стандартную программу?">
        <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
          План заменится на пятидневный сплит по умолчанию. История тренировок и рекорды останутся на месте.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button
            onClick={() => {
              setProgram(DEFAULT_PROGRAM);
              setActiveId(DEFAULT_PROGRAM[0].id);
              setConfirmReset(false);
              setEditing(false);
            }}
            style={{ ...btnDanger, width: '100%' }}
          >
            Заменить план
          </button>
          <button onClick={() => setConfirmReset(false)} style={{ ...btnGhost, width: '100%' }}>Отмена</button>
        </div>
      </Sheet>
    </div>
  );
}

const iconBtn = {
  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 9,
  color: C.textMid, fontSize: 13, width: 36, height: 36, lineHeight: 1,
};

const iconBtnSm = {
  background: C.surfaceHi, border: `1px solid ${C.line}`, borderRadius: 7,
  color: C.textDim, fontSize: 11, width: 30, height: 30, lineHeight: 1, padding: 0,
};
