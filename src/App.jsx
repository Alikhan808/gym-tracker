import React, { useState, useEffect, useCallback } from 'react';

// ---- Program data ----
const PROGRAM = [
  {
    id: 'push1', label: 'День 1', name: 'Push', sub: 'грудь · плечи · трицепс',
    exercises: [
      { id: 'p1e1', name: 'Жим штанги лёжа', target: '4×6-8' },
      { id: 'p1e2', name: 'Жим гантелей на наклонной', target: '3×8-10' },
      { id: 'p1e3', name: 'Жим штанги стоя', target: '3×8-10' },
      { id: 'p1e4', name: 'Разведение гантелей в стороны', target: '3×12-15' },
      { id: 'p1e5', name: 'Отжимания на брусьях / блок на трицепс', target: '3×10-12' },
      { id: 'p1e6', name: 'Французский жим', target: '3×10-12' },
    ],
  },
  {
    id: 'pull1', label: 'День 2', name: 'Pull', sub: 'спина · бицепс',
    exercises: [
      { id: 'p2e1', name: 'Становая тяга', target: '4×5-6' },
      { id: 'p2e2', name: 'Подтягивания', target: '4×6-10' },
      { id: 'p2e3', name: 'Тяга штанги в наклоне', target: '3×8-10' },
      { id: 'p2e4', name: 'Тяга верхнего блока широким хватом', target: '3×10-12' },
      { id: 'p2e5', name: 'Подъём штанги на бицепс', target: '3×10-12' },
      { id: 'p2e6', name: 'Молотки с гантелями', target: '3×12' },
    ],
  },
  {
    id: 'legs', label: 'День 3', name: 'Legs', sub: 'ноги',
    exercises: [
      { id: 'p3e1', name: 'Приседания со штангой', target: '4×6-8' },
      { id: 'p3e2', name: 'Жим ногами', target: '3×10-12' },
      { id: 'p3e3', name: 'Румынская тяга', target: '3×8-10' },
      { id: 'p3e4', name: 'Разгибания ног', target: '3×12-15' },
      { id: 'p3e5', name: 'Сгибания ног', target: '3×12-15' },
      { id: 'p3e6', name: 'Икры стоя', target: '4×15-20' },
    ],
  },
  {
    id: 'push2', label: 'День 4', name: 'Push', sub: 'вариация',
    exercises: [
      { id: 'p4e1', name: 'Жим гантелей лёжа', target: '4×8-10' },
      { id: 'p4e2', name: 'Жим на наклонной в Смите/штанге', target: '3×8-10' },
      { id: 'p4e3', name: 'Жим Арнольда', target: '3×10-12' },
      { id: 'p4e4', name: 'Разведение в кроссовере', target: '3×12-15' },
      { id: 'p4e5', name: 'Жим узким хватом', target: '3×10-12' },
      { id: 'p4e6', name: 'Разгибание на блоке', target: '3×12-15' },
    ],
  },
  {
    id: 'pull2', label: 'День 5', name: 'Pull', sub: 'вариация',
    exercises: [
      { id: 'p5e1', name: 'Тяга Т-грифа / гантели одной рукой', target: '4×8-10' },
      { id: 'p5e2', name: 'Тяга нижнего блока', target: '3×10-12' },
      { id: 'p5e3', name: 'Пуловер', target: '3×12-15' },
      { id: 'p5e4', name: 'Шраги', target: '3×12-15' },
      { id: 'p5e5', name: 'Подъём на бицепс на скамье Скотта', target: '3×10-12' },
      { id: 'p5e6', name: 'Обратные разведения на заднюю дельту', target: '3×12-15' },
    ],
  },
];

const TARGETS = { kcal: 3050, protein: 105, protein_hi: 130 };

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const LOGS_KEY = 'exercise-logs';
const NUTRITION_KEY = 'nutrition-log';

// Simple wrapper matching the shape used by the rest of the component
const storage = {
  async get(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return { key, value: raw };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
};

export default function App() {
  const [activeDay, setActiveDay] = useState(PROGRAM[0].id);
  const [logs, setLogs] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [nutOpen, setNutOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [logsRes, nutRes] = await Promise.allSettled([
          storage.get(LOGS_KEY),
          storage.get(NUTRITION_KEY),
        ]);
        if (cancelled) return;
        if (logsRes.status === 'fulfilled' && logsRes.value) {
          setLogs(JSON.parse(logsRes.value.value));
        }
        if (nutRes.status === 'fulfilled' && nutRes.value) {
          setNutrition(JSON.parse(nutRes.value.value));
        }
      } catch (e) {
        setLoadError(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const updateLog = useCallback((exId, field, value) => {
    setLogs(prev => {
      const next = {
        ...prev,
        [exId]: { ...(prev[exId] || {}), [field]: value },
      };
      storage.set(LOGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setSavedFlash(exId);
    setTimeout(() => setSavedFlash(f => (f === exId ? null : f)), 700);
  }, []);

  const day = PROGRAM.find(d => d.id === activeDay);
  const dateKey = todayKey();
  const nut = nutrition[dateKey] || { kcal: '', protein: '' };

  const updateNut = (field, value) => {
    setNutrition(prev => {
      const next = {
        ...prev,
        [dateKey]: { ...(prev[dateKey] || {}), [field]: value },
      };
      storage.set(NUTRITION_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const kcalPct = nut.kcal ? Math.min(100, Math.round((Number(nut.kcal) / TARGETS.kcal) * 100)) : 0;
  const protPct = nut.protein ? Math.min(100, Math.round((Number(nut.protein) / TARGETS.protein) * 100)) : 0;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 1; }
        ::selection { background: #C9FF3D; color: #0B0D0A; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.kicker}>
              {loaded ? 'ПРОГРАММА НАБОРА МАССЫ' : 'ЗАГРУЗКА ДАННЫХ…'}
            </div>
            <h1 style={styles.title}>5-дневный сплит</h1>
          </div>
          <button
            style={{ ...styles.nutBtn, ...(nutOpen ? styles.nutBtnActive : {}) }}
            onClick={() => setNutOpen(o => !o)}
          >
            {nutOpen ? '× Закрыть' : '⛽ Питание'}
          </button>
        </div>
        {loadError && (
          <div style={styles.errorNote}>
            Не удалось загрузить сохранённые данные — записи в этой сессии всё равно будут сохраняться.
          </div>
        )}
      </div>

      {nutOpen && (
        <div style={styles.nutPanel}>
          <div style={styles.nutRow}>
            <div style={styles.nutCol}>
              <div style={styles.nutLabel}>Калории сегодня</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={nut.kcal}
                onChange={e => updateNut('kcal', e.target.value)}
                style={styles.nutInput}
              />
              <div style={styles.nutTargetRow}>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${kcalPct}%`, background: '#C9FF3D' }} />
                </div>
                <span style={styles.nutTargetText}>цель {TARGETS.kcal}</span>
              </div>
            </div>
            <div style={styles.nutCol}>
              <div style={styles.nutLabel}>Белок сегодня, г</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={nut.protein}
                onChange={e => updateNut('protein', e.target.value)}
                style={styles.nutInput}
              />
              <div style={styles.nutTargetRow}>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${protPct}%`, background: '#FF6B4A' }} />
                </div>
                <span style={styles.nutTargetText}>{TARGETS.protein}–{TARGETS.protein_hi} г</span>
              </div>
            </div>
          </div>
          <div style={styles.nutHint}>
            Профицит ~400 ккал сверх нормы + белок 1.8 г/кг веса — без этого рост массы не пойдёт, даже с идеальным тренингом.
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div style={styles.tabsWrap}>
        <div style={styles.tabs}>
          {PROGRAM.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDay(d.id)}
              style={{
                ...styles.tab,
                ...(activeDay === d.id ? styles.tabActive : {}),
              }}
            >
              <div style={styles.tabLabelSmall}>{d.label}</div>
              <div style={styles.tabName}>{d.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Day content */}
      <div style={styles.content}>
        <div style={styles.dayHeading}>
          <span style={styles.dayHeadingName}>{day.name}</span>
          <span style={styles.dayHeadingSub}>{day.sub}</span>
        </div>

        <div style={styles.exList}>
          {day.exercises.map((ex, i) => {
            const log = logs[ex.id] || {};
            const flashing = savedFlash === ex.id;
            return (
              <div key={ex.id} style={styles.exCard}>
                <div style={styles.exTop}>
                  <span style={styles.exIndex}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={styles.exNameWrap}>
                    <div style={styles.exName}>{ex.name}</div>
                    <div style={styles.exTarget}>{ex.target}</div>
                  </div>
                  {flashing && <span style={styles.savedTag}>сохранено</span>}
                </div>
                <div style={styles.exInputs}>
                  <label style={styles.inputLabel}>
                    <span>Вес, кг</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="—"
                      value={log.weight || ''}
                      onChange={e => updateLog(ex.id, 'weight', e.target.value)}
                      style={styles.numInput}
                    />
                  </label>
                  <label style={styles.inputLabel}>
                    <span>Повторы</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      value={log.reps || ''}
                      onChange={e => updateLog(ex.id, 'reps', e.target.value)}
                      style={styles.numInput}
                    />
                  </label>
                  <label style={styles.inputLabel}>
                    <span>Подходы</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      value={log.sets || ''}
                      onChange={e => updateLog(ex.id, 'sets', e.target.value)}
                      style={styles.numInput}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footerNote}>
          Данные сохраняются автоматически и не пропадут при перезакрытии. Прогрессия: каждую неделю старайся прибавлять вес или повтор хотя бы в одном подходе.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0B0D0A',
    color: '#EDEFE6',
    fontFamily: "'Inter', sans-serif",
    paddingBottom: '48px',
  },
  header: {
    padding: '28px 20px 20px',
    borderBottom: '1px solid #1E211A',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '11px',
    letterSpacing: '0.14em',
    color: '#8A9078',
    marginBottom: '6px',
  },
  title: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '30px',
    fontWeight: 600,
    margin: 0,
    color: '#F5F7EC',
    letterSpacing: '-0.01em',
  },
  nutBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    background: 'transparent',
    color: '#C9FF3D',
    border: '1px solid #3A4230',
    borderRadius: '999px',
    padding: '9px 16px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    marginTop: '4px',
  },
  nutBtnActive: {
    background: '#C9FF3D',
    color: '#0B0D0A',
    border: '1px solid #C9FF3D',
  },
  errorNote: {
    marginTop: '10px',
    fontSize: '11.5px',
    color: '#FF9B7A',
  },
  nutPanel: {
    padding: '18px 20px 22px',
    borderBottom: '1px solid #1E211A',
    background: '#10130D',
  },
  nutRow: {
    display: 'flex',
    gap: '14px',
  },
  nutCol: { flex: 1 },
  nutLabel: {
    fontSize: '12px',
    color: '#9AA089',
    marginBottom: '6px',
  },
  nutInput: {
    width: '100%',
    background: '#191C14',
    border: '1px solid #2C3123',
    borderRadius: '10px',
    color: '#F5F7EC',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '22px',
    padding: '8px 12px',
    outline: 'none',
  },
  nutTargetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  barTrack: {
    flex: 1,
    height: '4px',
    background: '#22261A',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  nutTargetText: {
    fontSize: '11px',
    color: '#767C67',
    whiteSpace: 'nowrap',
  },
  nutHint: {
    marginTop: '14px',
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#7C8270',
  },
  tabsWrap: {
    padding: '16px 20px 0',
    overflowX: 'auto',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    flexShrink: 0,
    background: '#141712',
    border: '1px solid #22261A',
    borderRadius: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    minWidth: '86px',
  },
  tabActive: {
    background: '#1C2114',
    border: '1px solid #C9FF3D',
  },
  tabLabelSmall: {
    fontSize: '10px',
    color: '#767C67',
    letterSpacing: '0.05em',
    marginBottom: '2px',
  },
  tabName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '15px',
    fontWeight: 600,
    color: '#EDEFE6',
  },
  content: {
    padding: '22px 20px 0',
  },
  dayHeading: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '16px',
  },
  dayHeadingName: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    color: '#C9FF3D',
  },
  dayHeadingSub: {
    fontSize: '13px',
    color: '#8A9078',
  },
  exList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  exCard: {
    background: '#12140F',
    border: '1px solid #1E221777',
    borderRadius: '14px',
    padding: '14px 14px 16px',
  },
  exTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  exIndex: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '13px',
    color: '#4A5140',
    fontWeight: 600,
  },
  exNameWrap: { flex: 1 },
  exName: {
    fontSize: '14.5px',
    fontWeight: 600,
    color: '#F0F2E8',
  },
  exTarget: {
    fontSize: '12px',
    color: '#767C67',
    marginTop: '2px',
  },
  savedTag: {
    fontSize: '10px',
    color: '#C9FF3D',
    fontWeight: 600,
  },
  exInputs: {
    display: 'flex',
    gap: '8px',
  },
  inputLabel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '10.5px',
    color: '#767C67',
  },
  numInput: {
    background: '#191C14',
    border: '1px solid #262B1D',
    borderRadius: '8px',
    color: '#F5F7EC',
    fontFamily: "'Oswald', sans-serif",
    fontSize: '16px',
    padding: '9px 10px',
    outline: 'none',
    width: '100%',
  },
  footerNote: {
    marginTop: '22px',
    fontSize: '11.5px',
    lineHeight: 1.6,
    color: '#5C6250',
    paddingBottom: '10px',
  },
};
