// ---------------------------------------------------------------------------
// Everything derived from workout history: estimated 1RM, personal records,
// volume, streaks, and the next-session suggestion.
//
// Pure functions only — no storage, no React. That keeps them testable and
// keeps the same numbers on screen wherever they are shown.
// ---------------------------------------------------------------------------

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** A set counts once it has both a weight and a rep count. */
export const isLogged = (set) => num(set?.weight) > 0 && num(set?.reps) > 0;

/**
 * Estimated one-rep max, Epley formula: w × (1 + r/30).
 * Reliable up to about 10 reps; beyond that it flatters the lifter, which is
 * why the UI labels it "оценка" rather than a max.
 */
export function e1rm(weight, reps) {
  const w = num(weight), r = num(reps);
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export const setVolume = (set) => num(set.weight) * num(set.reps);

export function sessionVolume(session) {
  if (!session?.entries) return 0;
  return session.entries.reduce(
    (total, entry) => total + (entry.sets || []).filter(isLogged).reduce((s, set) => s + setVolume(set), 0),
    0,
  );
}

export const sessionSetCount = (session) =>
  (session?.entries || []).reduce((n, e) => n + (e.sets || []).filter(isLogged).length, 0);

export const isSessionEmpty = (session) => sessionSetCount(session) === 0;

/** Sessions that actually contain logged work, newest first. */
export function realSessions(sessions) {
  return (sessions || [])
    .filter(s => !isSessionEmpty(s))
    .slice()
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

// ---------- personal records ----------

/**
 * Best set per exercise across all history, ranked by estimated 1RM.
 * Returns { [exerciseId]: { weight, reps, e1rm, date, sessionId } }.
 */
export function personalRecords(sessions) {
  const best = {};
  for (const session of realSessions(sessions)) {
    for (const entry of session.entries || []) {
      for (const set of entry.sets || []) {
        if (!isLogged(set)) continue;
        const score = e1rm(set.weight, set.reps);
        const current = best[entry.exerciseId];
        if (!current || score > current.e1rm + 0.001) {
          best[entry.exerciseId] = {
            exerciseId: entry.exerciseId,
            name: entry.name,
            weight: num(set.weight),
            reps: num(set.reps),
            e1rm: score,
            date: session.startedAt,
            sessionId: session.id,
          };
        }
      }
    }
  }
  return best;
}

/**
 * Records set inside one session, judged against everything that came before
 * it. Used for the "новый рекорд" badge right after a workout is saved.
 */
export function recordsInSession(sessions, sessionId) {
  const all = realSessions(sessions);
  const target = all.find(s => s.id === sessionId);
  if (!target) return [];
  const earlier = all.filter(s => new Date(s.startedAt) < new Date(target.startedAt));
  const before = personalRecords(earlier);

  const found = [];
  for (const entry of target.entries || []) {
    let bestSet = null;
    for (const set of entry.sets || []) {
      if (!isLogged(set)) continue;
      const score = e1rm(set.weight, set.reps);
      if (!bestSet || score > bestSet.score) bestSet = { ...set, score };
    }
    if (!bestSet) continue;
    const prev = before[entry.exerciseId];
    if (!prev || bestSet.score > prev.e1rm + 0.001) {
      found.push({
        exerciseId: entry.exerciseId,
        name: entry.name,
        weight: num(bestSet.weight),
        reps: num(bestSet.reps),
        e1rm: bestSet.score,
        previous: prev || null,
      });
    }
  }
  return found;
}

/** Every logged set for one exercise, oldest first — the series behind a chart. */
export function exerciseHistory(sessions, exerciseId) {
  const points = [];
  for (const session of realSessions(sessions).slice().reverse()) {
    for (const entry of session.entries || []) {
      if (entry.exerciseId !== exerciseId) continue;
      const sets = (entry.sets || []).filter(isLogged);
      if (!sets.length) continue;
      const top = sets.reduce((a, b) => (e1rm(b.weight, b.reps) > e1rm(a.weight, a.reps) ? b : a));
      points.push({
        date: session.startedAt,
        sessionId: session.id,
        topWeight: num(top.weight),
        topReps: num(top.reps),
        e1rm: e1rm(top.weight, top.reps),
        volume: sets.reduce((s, set) => s + setVolume(set), 0),
        sets: sets.map(s => ({ weight: num(s.weight), reps: num(s.reps) })),
      });
    }
  }
  return points;
}

// ---------- calendar helpers ----------

/** Monday-based week key, e.g. "2026-W12". Weeks are the unit a streak counts. */
export function weekKey(dateish) {
  const d = new Date(dateish);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfWeek(dateish) {
  const d = new Date(dateish);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export const daysBetween = (a, b) =>
  Math.floor((startOfDay(b) - startOfDay(a)) / 86400000);

function startOfDay(dateish) {
  const d = new Date(dateish);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Consecutive weeks, counting back from this one, that contain at least one
 * workout. The current week never breaks the streak while it is still running —
 * a streak should not die on Monday morning.
 */
export function weeklyStreak(sessions, now = new Date()) {
  const weeks = new Set(realSessions(sessions).map(s => weekKey(s.startedAt)));
  if (!weeks.size) return 0;

  let streak = 0;
  const cursor = startOfWeek(now);

  if (weeks.has(weekKey(cursor))) streak = 1;
  cursor.setDate(cursor.getDate() - 7);

  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Workouts logged in the current Monday-based week. */
export function sessionsThisWeek(sessions, now = new Date()) {
  const key = weekKey(now);
  return realSessions(sessions).filter(s => weekKey(s.startedAt) === key).length;
}

/** Volume per week for the last `weeks` weeks, oldest first. */
export function weeklyVolume(sessions, weeks = 8, now = new Date()) {
  const out = [];
  const cursor = startOfWeek(now);
  cursor.setDate(cursor.getDate() - 7 * (weeks - 1));

  for (let i = 0; i < weeks; i++) {
    const key = weekKey(cursor);
    const inWeek = realSessions(sessions).filter(s => weekKey(s.startedAt) === key);
    out.push({
      weekStart: new Date(cursor),
      label: `${cursor.getDate()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      volume: inWeek.reduce((sum, s) => sum + sessionVolume(s), 0),
      workouts: inWeek.length,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

// ---------- progression ----------

/** "4×6-8" -> { sets: 4, low: 6, high: 8 } */
export function parseTarget(target) {
  const text = String(target || '');
  const m = text.match(/(\d+)\s*[×xX*]\s*(\d+)\s*(?:-\s*(\d+))?/);
  if (!m) return null;
  const sets = Number(m[1]);
  const low = Number(m[2]);
  const high = m[3] ? Number(m[3]) : low;
  return { sets, low, high };
}

export const roundTo = (value, step) => Math.round(value / step) * step;

/**
 * What to aim for next, from the last session alone: clear the top of the rep
 * range on every set and the weight goes up; otherwise chase one more rep.
 * Deliberately boring — double progression is what most novice programs run,
 * and it needs no model behind it.
 */
export function suggestNext(exercise, sessions, increment = 2.5) {
  const history = exerciseHistory(sessions, exercise.id);
  const target = parseTarget(exercise.target);

  if (!history.length) {
    return { kind: 'first', text: 'Первый раз — подбери рабочий вес по ощущениям', target };
  }

  const last = history[history.length - 1];
  const loggedSets = last.sets.length;

  if (!target) {
    return {
      kind: 'repeat',
      text: `В прошлый раз ${last.topWeight} кг × ${last.topReps}`,
      last, target,
    };
  }

  const allAtTop = last.sets.length >= target.sets
    && last.sets.every(s => s.reps >= target.high && s.weight >= last.topWeight);

  if (allAtTop) {
    const next = roundTo(last.topWeight + increment, increment);
    return {
      kind: 'increase',
      weight: next,
      reps: target.low,
      sets: target.sets,
      text: `${next} кг × ${target.low} × ${target.sets}`,
      hint: `В прошлый раз закрыл всё на ${last.topWeight} кг — можно добавить вес`,
      last, target,
    };
  }

  const nextReps = Math.min(target.high, Math.max(target.low, last.topReps + 1));
  return {
    kind: 'reps',
    weight: last.topWeight,
    reps: nextReps,
    sets: target.sets,
    text: `${last.topWeight} кг × ${nextReps} × ${target.sets}`,
    hint: `В прошлый раз ${last.topWeight} кг × ${last.topReps}${loggedSets ? ` × ${loggedSets}` : ''}`,
    last, target,
  };
}

/**
 * How much weight stands between the last session and a new record on this
 * exercise, at the reps the lifter actually used.
 */
export function gapToPR(exerciseId, sessions, increment = 2.5) {
  const history = exerciseHistory(sessions, exerciseId);
  if (history.length < 1) return null;
  const records = personalRecords(sessions);
  const pr = records[exerciseId];
  if (!pr) return null;

  const last = history[history.length - 1];
  const reps = last.topReps || pr.reps;
  const needed = pr.e1rm / (reps === 1 ? 1 : 1 + reps / 30);
  const gap = roundTo(Math.max(0, needed - last.topWeight), increment);

  return { pr, last, reps, gap, atPR: gap <= 0 };
}

// ---------- retention copy ----------

/**
 * One line for the top of the home screen. Ordered by urgency: a long absence
 * outranks a streak, a streak outranks a near-record.
 *
 * Nothing here scolds. A missed week is stated plainly and the next action is
 * offered — guilt is a poor motivator and an easy way to lose someone who
 * already feels behind.
 */
export function motivationLine({ sessions, program, settings }, now = new Date()) {
  const real = realSessions(sessions);
  const streak = weeklyStreak(sessions, now);
  const thisWeek = sessionsThisWeek(sessions, now);
  const goal = settings?.weeklyGoal || 0;

  if (!real.length) {
    return { tone: 'neutral', text: 'Запиши первую тренировку — дальше появятся графики и рекорды' };
  }

  const daysOff = daysBetween(real[0].startedAt, now);

  if (daysOff >= 10) {
    return { tone: 'neutral', text: `Последняя тренировка ${daysOff} дней назад. Начни с лёгкой — форма вернётся быстро` };
  }

  if (streak >= 2 && thisWeek === 0) {
    return { tone: 'warn', text: `${streak} ${plural(streak, 'неделя', 'недели', 'недель')} подряд. На этой ещё не тренировался` };
  }

  if (goal && thisWeek >= goal) {
    return { tone: 'good', text: `Недельный план закрыт: ${thisWeek} из ${goal}` };
  }

  // A record within one increment is the most motivating thing to show.
  const records = personalRecords(sessions);
  let closest = null;
  for (const id of Object.keys(records)) {
    const gap = gapToPR(id, sessions, settings?.increment || 2.5);
    if (!gap || gap.atPR || gap.gap <= 0) continue;
    if (!closest || gap.gap < closest.gap) closest = { ...gap, exerciseId: id, name: records[id].name };
  }
  if (closest && closest.gap <= (settings?.increment || 2.5) * 2) {
    return { tone: 'good', text: `До рекорда в «${closest.name}» осталось ${fmt(closest.gap)} кг` };
  }

  if (streak >= 2) {
    return { tone: 'good', text: `Ты тренируешься ${streak} ${plural(streak, 'неделю', 'недели', 'недель')} подряд` };
  }

  if (goal && thisWeek > 0) {
    return { tone: 'neutral', text: `На этой неделе ${thisWeek} из ${goal} тренировок` };
  }

  return { tone: 'neutral', text: 'Готов тренироваться — выбери день' };
}

export function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Trims trailing zeros: 2.50 -> "2.5", 100.0 -> "100". */
export function fmt(value, digits = 1) {
  const n = Number(value) || 0;
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function fmtDate(dateish) {
  const d = new Date(dateish);
  return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`;
}

export function fmtDateFull(dateish) {
  const d = new Date(dateish);
  const today = new Date();
  const diff = daysBetween(d, today);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return `${fmtDate(d)}${d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}
