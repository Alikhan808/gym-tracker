import React, { useState, useMemo } from 'react';
import { C, F, card, h1, h2 } from '../theme';
import { LineChart, BarChart, StatBlock, Empty } from '../components/common';
import * as St from '../lib/stats';

export default function Progress({ data }) {
  const { sessions, program, settings } = data;
  const real = St.realSessions(sessions);
  const records = St.personalRecords(sessions);

  // Exercises that have been trained at least once, most recent first.
  const trained = useMemo(() => {
    const seen = new Map();
    for (const s of real) {
      for (const e of s.entries || []) {
        if (!(e.sets || []).some(St.isLogged)) continue;
        if (!seen.has(e.exerciseId)) seen.set(e.exerciseId, { id: e.exerciseId, name: e.name });
      }
    }
    return [...seen.values()];
  }, [real]);

  const [pickedId, setPickedId] = useState(null);
  const active = trained.find(t => t.id === pickedId) || trained[0];

  if (!real.length) {
    return (
      <div style={{ padding: '22px 18px 0' }}>
        <h1 style={{ ...h1, marginBottom: 16 }}>Прогресс</h1>
        <Empty
          title="Графики появятся после тренировок"
          hint="Нужно минимум две записи одного упражнения, чтобы увидеть линию прогресса."
        />
      </div>
    );
  }

  const history = active ? St.exerciseHistory(sessions, active.id) : [];
  const pr = active ? records[active.id] : null;
  const gap = active ? St.gapToPR(active.id, sessions, settings.increment) : null;
  const weeks = St.weeklyVolume(sessions, 12);
  const totalVolume = real.reduce((sum, s) => sum + St.sessionVolume(s), 0);
  const totalSets = real.reduce((sum, s) => sum + St.sessionSetCount(s), 0);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <h1 style={{ ...h1, marginBottom: 16 }}>Прогресс</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatBlock value={St.fmt(totalVolume / 1000, 1)} unit="т" label="Суммарный объём" />
        <StatBlock value={totalSets} label="Подходов всего" />
        <StatBlock value={Object.keys(records).length} label="Упражнений" />
      </div>

      {/* Per-exercise progress */}
      {trained.length > 0 && active && (
        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ ...h2, marginBottom: 12 }}>По упражнению</h2>

          <div className="gt-scroll-x" style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            {trained.map(t => (
              <button
                key={t.id}
                onClick={() => setPickedId(t.id)}
                style={{
                  flexShrink: 0,
                  background: t.id === active.id ? C.lime : 'transparent',
                  color: t.id === active.id ? C.bg : C.textMid,
                  border: `1px solid ${t.id === active.id ? C.lime : C.line}`,
                  borderRadius: 999, fontSize: 12, fontWeight: 500,
                  padding: '8px 13px', minHeight: 36, maxWidth: 170,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          {history.length >= 2 ? (
            <>
              <LineChart
                points={history.map(h => ({ y: h.e1rm, label: St.fmtDate(h.date) }))}
                yLabel={`Оценка максимума: ${active.name}`}
              />
              <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
                Оценка одноповторного максимума по формуле Эпли — она сглаживает разницу между подходами на 5 и на 8 повторов.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.textFaint, padding: '18px 0', textAlign: 'center' }}>
              Нужна ещё одна тренировка с этим упражнением, чтобы построить линию.
            </div>
          )}

          {pr && (
            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 3 }}>Рекорд</div>
                <div style={{ fontFamily: F.display, fontSize: 19, color: C.lime }}>
                  {St.fmt(pr.weight)} кг × {pr.reps}
                </div>
                <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 3 }}>
                  {St.fmtDateFull(pr.date)}
                </div>
              </div>
              {gap && !gap.atPR && gap.gap > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: C.textDim, marginBottom: 3 }}>До нового</div>
                  <div style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>
                    +{St.fmt(gap.gap)} кг
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 3 }}>
                    на {gap.reps} {St.plural(gap.reps, 'повтор', 'повтора', 'повторов')}
                  </div>
                </div>
              )}
              {gap && gap.atPR && (
                <div style={{ fontSize: 11.5, color: C.lime, textAlign: 'right', maxWidth: 120, lineHeight: 1.5 }}>
                  Последняя тренировка — на уровне рекорда
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Volume */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2 style={h2}>Объём по неделям</h2>
          <span style={{ fontSize: 10.5, color: C.textFaint }}>тонн</span>
        </div>
        <BarChart data={weeks.map(w => ({ label: w.label, value: w.volume / 1000 }))} height={110} />
      </div>

      {/* All records */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ ...h2, marginBottom: 12 }}>Все рекорды</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.values(records)
            .sort((a, b) => b.e1rm - a.e1rm)
            .map(r => (
              <div key={r.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 2 }}>
                    {St.fmtDateFull(r.date)} · оценка max {St.fmt(r.e1rm, 0)} кг
                  </div>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 15, color: C.text, flexShrink: 0 }}>
                  {St.fmt(r.weight)} × {r.reps}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
