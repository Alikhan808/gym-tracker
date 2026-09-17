import React, { useState } from 'react';
import { C, F, card, h1, btnDanger, btnGhost } from '../theme';
import { Empty, Sheet } from '../components/common';
import * as St from '../lib/stats';

export default function History({ data, onDelete, onGo }) {
  const [openId, setOpenId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sessions = St.realSessions(data.sessions);

  if (!sessions.length) {
    return (
      <div style={{ padding: '22px 18px 0' }}>
        <h1 style={{ ...h1, marginBottom: 16 }}>История</h1>
        <Empty
          title="Пока пусто"
          hint="Каждая завершённая тренировка попадёт сюда — с подходами, весами и объёмом."
          action={
            <button onClick={() => onGo('today')} style={{ ...btnGhost, width: '100%' }}>
              К тренировкам
            </button>
          }
        />
      </div>
    );
  }

  // Group by month so a long history stays scannable.
  const groups = [];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find(x => x.key === key);
    if (!g) {
      g = { key, title: monthTitle(d), sessions: [] };
      groups.push(g);
    }
    g.sessions.push(s);
  }

  const total = sessions.reduce((sum, s) => sum + St.sessionVolume(s), 0);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <h1 style={{ ...h1, marginBottom: 6 }}>История</h1>
      <div style={{ fontSize: 12.5, color: C.textDim, marginBottom: 18 }}>
        {sessions.length} {St.plural(sessions.length, 'тренировка', 'тренировки', 'тренировок')} · {St.fmt(total / 1000, 1)} т суммарно
      </div>

      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 9 }}>{group.title}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.sessions.map(s => {
              const open = openId === s.id;
              const records = St.recordsInSession(data.sessions, s.id);
              const volume = St.sessionVolume(s);
              const sets = St.sessionSetCount(s);
              const minutes = s.finishedAt
                ? Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000)
                : null;

              return (
                <div key={s.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenId(open ? null : s.id)}
                    aria-expanded={open}
                    style={{
                      width: '100%', background: 'none', border: 'none', textAlign: 'left',
                      padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.text }}>
                          {s.dayName}
                        </span>
                        <span style={{ fontSize: 11.5, color: C.textDim }}>{St.fmtDateFull(s.startedAt)}</span>
                        {records.length > 0 && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, color: C.bg, background: C.lime,
                            borderRadius: 4, padding: '2px 5px',
                          }}>
                            {records.length} PR
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textFaint }}>
                        {sets} {St.plural(sets, 'подход', 'подхода', 'подходов')} · {St.fmt(volume / 1000, 1)} т
                        {minutes ? ` · ${minutes} мин` : ''}
                      </div>
                    </div>
                    <span style={{
                      color: C.textFaint, fontSize: 12, flexShrink: 0,
                      transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s',
                    }}>▾</span>
                  </button>

                  {open && (
                    <div className="gt-rise" style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.line}` }}>
                      {s.entries.filter(e => (e.sets || []).some(St.isLogged)).map(e => (
                        <div key={e.exerciseId} style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12.5, color: C.textMid, marginBottom: 5 }}>{e.name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {e.sets.filter(St.isLogged).map((set, i) => (
                              <span key={i} style={{
                                fontFamily: F.display, fontSize: 12.5, color: C.text,
                                background: C.surfaceHi, border: `1px solid ${C.line}`,
                                borderRadius: 7, padding: '5px 9px',
                              }}>
                                {St.fmt(set.weight)}×{set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {records.length > 0 && (
                        <div style={{ marginTop: 14, fontSize: 11.5, color: C.lime, lineHeight: 1.6 }}>
                          Рекорды: {records.map(r => `${r.name} ${St.fmt(r.weight)}×${r.reps}`).join(', ')}
                        </div>
                      )}

                      <button
                        onClick={() => setConfirmDelete(s)}
                        style={{ ...btnDanger, width: '100%', marginTop: 14, fontSize: 12.5, padding: '10px' }}
                      >
                        Удалить тренировку
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Sheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Удалить тренировку?">
        <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
          {confirmDelete && `${confirmDelete.dayName}, ${St.fmtDateFull(confirmDelete.startedAt).toLowerCase()}. Записи пропадут, а рекорды пересчитаются заново.`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button
            onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); setOpenId(null); }}
            style={{ ...btnDanger, width: '100%' }}
          >
            Удалить
          </button>
          <button onClick={() => setConfirmDelete(null)} style={{ ...btnGhost, width: '100%' }}>
            Отмена
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function monthTitle(d) {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${months[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}
