import React, { useState, useRef } from 'react';
import { C, F, card, h1, h2, btnGhost, btnDanger, btnPrimary, label } from '../theme';
import { Editable, Stepper, Sheet } from '../components/common';
import * as db from '../lib/db';
import * as St from '../lib/stats';

export default function Account({ user, data, onChange, onSignOut, onRename, onImported }) {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  const settings = data.settings;
  const patchSettings = (field, value) =>
    onChange({ ...data, settings: { ...settings, [field]: value } });

  const dateKey = db.todayISO();
  const nut = data.nutrition?.[dateKey] || { kcal: '', protein: '' };
  const patchNut = (field, value) =>
    onChange({ ...data, nutrition: { ...(data.nutrition || {}), [dateKey]: { ...nut, [field]: value } } });

  const kcalPct = nut.kcal ? Math.min(100, Math.round((Number(nut.kcal) / (settings.kcal || 1)) * 100)) : 0;
  const protPct = nut.protein ? Math.min(100, Math.round((Number(nut.protein) / (settings.proteinLo || 1)) * 100)) : 0;

  const doExport = () => {
    try {
      const blob = new Blob([db.exportData(user.id)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker-${db.todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Файл выгружен');
    } catch {
      setNotice('Не удалось выгрузить файл');
    }
    setTimeout(() => setNotice(''), 2500);
  };

  const doImport = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = db.importData(user.id, String(reader.result));
        onImported(next);
        setNotice('Данные загружены');
      } catch (e) {
        setNotice(e.message || 'Файл не подошёл');
      }
      setTimeout(() => setNotice(''), 3000);
    };
    reader.onerror = () => setNotice('Не удалось прочитать файл');
    reader.readAsText(file);
  };

  const real = St.realSessions(data.sessions);

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <h1 style={{ ...h1, marginBottom: 16 }}>Профиль</h1>

      {/* Identity */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 6 }}>Имя</div>
        <Editable
          value={user.name}
          onChange={onRename}
          placeholder="Имя"
          ariaLabel="Имя"
          style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, color: C.text }}
        />
        <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 10, lineHeight: 1.5 }}>
          {user.guest
            ? 'Гостевой режим — данные живут только в этом браузере. Выгрузи файл, если чистишь историю или меняешь устройство.'
            : user.email}
        </div>
        {real.length > 0 && (
          <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 8 }}>
            {real.length} {St.plural(real.length, 'тренировка', 'тренировки', 'тренировок')} с {St.fmtDate(real[real.length - 1].startedAt)}
          </div>
        )}
      </div>

      {/* Training goal */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ ...h2, marginBottom: 12 }}>Тренировки</h2>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, marginBottom: 7 }}>Цель — тренировок в неделю</div>
          <Stepper
            value={String(settings.weeklyGoal)}
            onChange={v => patchSettings('weeklyGoal', Math.max(0, Math.min(14, Number(v) || 0)))}
            step={1} min={0} max={14}
            ariaLabel="Тренировок в неделю"
          />
        </div>

        <div>
          <div style={{ ...label, marginBottom: 7 }}>Шаг веса, кг</div>
          <Stepper
            value={String(settings.increment)}
            onChange={v => patchSettings('increment', Math.max(0.5, Number(v) || 2.5))}
            step={0.5} min={0.5} max={10}
            suffix="кг"
            ariaLabel="Шаг веса"
          />
          <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 7, lineHeight: 1.5 }}>
            На сколько поднимается вес, когда закрыт верх диапазона повторов. 2.5 кг — пара самых маленьких блинов.
          </div>
        </div>
      </div>

      {/* Nutrition */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ ...h2, marginBottom: 4 }}>Питание сегодня</h2>
        <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 14, lineHeight: 1.5 }}>
          Профицит калорий и достаточный белок решают в наборе массы не меньше самих тренировок.
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...label, marginBottom: 6 }}>Калории</div>
            <Stepper
              value={nut.kcal} onChange={v => patchNut('kcal', v)}
              step={50} max={12000} ariaLabel="Калории сегодня"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
              <div style={barTrack}>
                <div style={{ ...barFill, width: `${kcalPct}%`, background: C.lime }} />
              </div>
              <span style={{ fontSize: 10.5, color: C.textFaint, whiteSpace: 'nowrap' }}>
                из{' '}
                <Editable
                  value={String(settings.kcal)}
                  onChange={v => patchSettings('kcal', Number(v) || 0)}
                  placeholder="0" ariaLabel="Цель по калориям"
                  style={{ fontSize: 10.5, color: C.lime, fontWeight: 600 }}
                />
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...label, marginBottom: 6 }}>Белок, г</div>
            <Stepper
              value={nut.protein} onChange={v => patchNut('protein', v)}
              step={5} max={600} ariaLabel="Белок сегодня"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
              <div style={barTrack}>
                <div style={{ ...barFill, width: `${protPct}%`, background: C.ember }} />
              </div>
              <span style={{ fontSize: 10.5, color: C.textFaint, whiteSpace: 'nowrap' }}>
                <Editable
                  value={String(settings.proteinLo)}
                  onChange={v => patchSettings('proteinLo', Number(v) || 0)}
                  placeholder="0" ariaLabel="Минимум белка"
                  style={{ fontSize: 10.5, color: C.ember, fontWeight: 600 }}
                />
                –
                <Editable
                  value={String(settings.proteinHi)}
                  onChange={v => patchSettings('proteinHi', Number(v) || 0)}
                  placeholder="0" ariaLabel="Максимум белка"
                  style={{ fontSize: 10.5, color: C.ember, fontWeight: 600 }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ ...h2, marginBottom: 4 }}>Данные</h2>
        <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 14, lineHeight: 1.55 }}>
          Всё хранится в этом браузере. Очистка данных сайта сотрёт историю — выгружай файл перед переустановкой системы или переездом на другое устройство.
        </div>

        <div style={{ display: 'flex', gap: 9 }}>
          <button onClick={doExport} style={{ ...btnGhost, flex: 1 }}>Выгрузить файл</button>
          <button onClick={() => fileRef.current?.click()} style={{ ...btnGhost, flex: 1 }}>Загрузить файл</button>
        </div>
        <input
          ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }}
        />

        {notice && (
          <div style={{ fontSize: 12, color: C.lime, marginTop: 11 }}>{notice}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 }}>
        <button onClick={onSignOut} style={{ ...btnGhost, width: '100%' }}>Выйти</button>
        <button onClick={() => setConfirmWipe(true)} style={{ ...btnDanger, width: '100%' }}>
          Удалить всю историю
        </button>
      </div>

      <div style={{ fontSize: 10.5, color: C.textFaint, textAlign: 'center', padding: '14px 0 4px' }}>
        Трекер тренировок
      </div>

      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Удалить всю историю?">
        <div style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 18 }}>
          Пропадут все {real.length} {St.plural(real.length, 'тренировка', 'тренировки', 'тренировок')}, рекорды и графики. План упражнений останется. Отменить это нельзя — сначала лучше выгрузить файл.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button onClick={doExport} style={{ ...btnPrimary }}>Сначала выгрузить файл</button>
          <button
            onClick={() => { onChange({ ...data, sessions: [] }); setConfirmWipe(false); }}
            style={{ ...btnDanger, width: '100%' }}
          >
            Удалить историю
          </button>
          <button onClick={() => setConfirmWipe(false)} style={{ ...btnGhost, width: '100%' }}>Отмена</button>
        </div>
      </Sheet>
    </div>
  );
}

const barTrack = { flex: 1, height: 4, background: C.line, borderRadius: 4, overflow: 'hidden', minWidth: 26 };
const barFill = { height: '100%', borderRadius: 4, transition: 'width .3s ease' };
