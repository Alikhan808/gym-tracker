import React from 'react';
import { C, F, card, btnPrimary, h1, h2 } from '../theme';
import { StatBlock, BarChart, Empty } from '../components/common';
import * as St from '../lib/stats';

export default function Today({ data, user, onStart, onGo }) {
  const { sessions, program, settings } = data;
  const real = St.realSessions(sessions);
  const streak = St.weeklyStreak(sessions);
  const thisWeek = St.sessionsThisWeek(sessions);
  const motivation = St.motivationLine(data);
  const records = St.personalRecords(sessions);
  const weeks = St.weeklyVolume(sessions, 8);

  // Suggest the day that has gone longest without work, so a rotation keeps
  // turning instead of parking on whichever day is first in the list.
  const lastByDay = {};
  for (const s of real) if (!lastByDay[s.dayId]) lastByDay[s.dayId] = s.startedAt;
  const suggested = program
    .slice()
    .sort((a, b) => {
      const ta = lastByDay[a.id] ? new Date(lastByDay[a.id]).getTime() : 0;
      const tb = lastByDay[b.id] ? new Date(lastByDay[b.id]).getTime() : 0;
      return ta - tb;
    })[0];

  const goal = settings.weeklyGoal || 0;
  const recordList = Object.values(records).sort((a, b) => new Date(b.date) - new Date(a.date));

  const toneColor = { good: C.lime, warn: C.ember, neutral: C.textMid }[motivation.tone];

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div style={{ marginBottom: 4, fontSize: 12, color: C.textDim }}>
        {greeting()}, {user.name}
      </div>
      <h1 style={{ ...h1, marginBottom: 14 }}>
        {thisWeek > 0 ? `${thisWeek} ${St.plural(thisWeek, 'тренировка', 'тренировки', 'тренировок')} на этой неделе` : 'Неделя ещё пустая'}
      </h1>

      <div style={{
        ...card,
        borderColor: motivation.tone === 'good' ? '#2E3A18' : C.line,
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <div style={{ width: 3, alignSelf: 'stretch', background: toneColor, borderRadius: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.text }}>{motivation.text}</div>
      </div>

      {/* Start today's workout */}
      {suggested && (
        <div style={{ ...card, marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>Следующая тренировка</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, color: C.lime }}>
              {suggested.name}
            </span>
            <span style={{ fontSize: 12.5, color: C.textMid }}>{suggested.sub}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 14 }}>
            {suggested.exercises.length} {St.plural(suggested.exercises.length, 'упражнение', 'упражнения', 'упражнений')}
            {lastByDay[suggested.id] && ` · последний раз ${St.fmtDateFull(lastByDay[suggested.id]).toLowerCase()}`}
          </div>
          <button onClick={() => onStart(suggested.id)} style={btnPrimary}>
            Начать тренировку
          </button>

          {program.length > 1 && (
            <div className="gt-scroll-x" style={{ display: 'flex', gap: 7, marginTop: 12 }}>
              {program.filter(d => d.id !== suggested.id).map(d => (
                <button
                  key={d.id}
                  onClick={() => onStart(d.id)}
                  style={{
                    flexShrink: 0, background: 'transparent', border: `1px solid ${C.line}`,
                    borderRadius: 10, color: C.textMid, fontSize: 12.5, padding: '9px 13px', minHeight: 40,
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week numbers */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatBlock
          value={streak} unit={St.plural(streak, 'нед', 'нед', 'нед')}
          label="Серия подряд" accent={streak >= 2 ? C.lime : C.text}
        />
        <StatBlock
          value={goal ? `${thisWeek}/${goal}` : thisWeek}
          label="План недели"
          accent={goal && thisWeek >= goal ? C.lime : C.text}
        />
        <StatBlock value={real.length} label="Всего тренировок" />
      </div>

      {/* Volume trend */}
      {real.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 style={h2}>Объём по неделям</h2>
            <span style={{ fontSize: 10.5, color: C.textFaint }}>тонн за неделю</span>
          </div>
          <BarChart
            data={weeks.map((w, i) => ({
              label: w.label,
              value: w.volume / 1000,
              highlight: i === weeks.length - 1,
            }))}
            height={96}
          />
        </div>
      )}

      {/* Recent records */}
      {recordList.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={h2}>Личные рекорды</h2>
            <button
              onClick={() => onGo('progress')}
              style={{ background: 'none', border: 'none', color: C.lime, fontSize: 12, padding: 4 }}
            >
              Все
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {recordList.slice(0, 3).map(r => (
              <div key={r.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: C.textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: F.display, fontSize: 14, color: C.text, flexShrink: 0 }}>
                  {St.fmt(r.weight)} × {r.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {real.length === 0 && (
        <Empty
          title="Здесь появится прогресс"
          hint="После первой записи тут будут рекорды, объём по неделям и график по каждому упражнению."
        />
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
