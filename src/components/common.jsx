import React, { useState, useEffect, useRef } from 'react';
import { C, F, TAP, card, numInput } from '../theme';
import { fmt } from '../lib/stats';

// ---------------------------------------------------------------------------
// Inline editable text. Tap to edit, Enter or blur to commit, Escape to cancel.
// ---------------------------------------------------------------------------
export function Editable({ value, onChange, placeholder, style, ariaLabel }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const next = String(draft).trim();
    if (next !== value) onChange(next);
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); }
        }}
        style={{
          ...style,
          cursor: 'text',
          borderBottom: `1px dashed ${C.lineHi}`,
          display: 'inline-block',
          maxWidth: '100%',
          wordBreak: 'break-word',
          color: value ? style?.color : C.textFaint,
        }}
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
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
      style={{
        ...style,
        background: '#191C14',
        border: `1px solid ${C.lime}`,
        borderRadius: 6,
        padding: '4px 8px',
        width: '100%',
        fontFamily: 'inherit',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Number field with −/+ steppers. Typing works too; the steppers exist because
// entering "82.5" on a phone keyboard mid-set is worse than tapping twice.
// ---------------------------------------------------------------------------
export function Stepper({ value, onChange, step = 2.5, min = 0, max = 9999, suffix, ariaLabel }) {
  const n = Number(value) || 0;
  const bump = (delta) => {
    const next = Math.min(max, Math.max(min, Math.round((n + delta) * 100) / 100));
    onChange(next === 0 ? '' : String(next));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <button
        onClick={() => bump(-step)}
        aria-label={`${ariaLabel}: меньше`}
        style={stepBtn}
      >−</button>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={value}
          aria-label={ariaLabel}
          onChange={e => onChange(e.target.value)}
          style={{ ...numInput, paddingRight: suffix ? 22 : 8 }}
        />
        {suffix && (
          <span style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: C.textFaint, pointerEvents: 'none',
          }}>{suffix}</span>
        )}
      </div>
      <button
        onClick={() => bump(step)}
        aria-label={`${ariaLabel}: больше`}
        style={stepBtn}
      >+</button>
    </div>
  );
}

const stepBtn = {
  background: '#191C14',
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  color: C.textMid,
  fontSize: 20,
  lineHeight: 1,
  width: 40,
  minHeight: TAP,
  flexShrink: 0,
};

// ---------------------------------------------------------------------------
// Bottom sheet. Used for confirmations and pickers so dialogs stay in reach of
// a thumb instead of centred on screen.
// ---------------------------------------------------------------------------
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60,
      }}
    >
      <div
        className="gt-rise"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: C.surfaceHi,
          borderTop: `1px solid ${C.lineHi}`,
          borderRadius: '18px 18px 0 0',
          width: '100%', maxWidth: 520,
          padding: '18px 18px calc(18px + env(safe-area-inset-bottom))',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {title && (
          <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 600, marginBottom: 14 }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts, hand-drawn as SVG. No chart library: the two shapes this app needs
// are a bar series and a line series, and a dependency for that costs more in
// bundle size than it saves in code.
// ---------------------------------------------------------------------------

export function BarChart({ data, height = 120, accent = C.lime, format = v => fmt(v, 0) }) {
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const W = 100, gap = 1.6;
  const bw = data.length ? (W - gap * (data.length - 1)) / data.length : W;

  return (
    <div>
      <svg viewBox={`0 0 ${W} 40`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }} role="img" aria-label="Объём по неделям">
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(1.2, (d.value / max) * 36) : 0.6;
          return (
            <rect
              key={i}
              x={i * (bw + gap)} y={40 - h} width={bw} height={h} rx={0.8}
              fill={d.value > 0 ? accent : C.line}
              opacity={d.highlight === false ? 0.45 : 1}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: `${gap}%`, marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: C.textFaint, minWidth: 0 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ points, height = 150, accent = C.lime, yLabel }) {
  if (!points || points.length === 0) return null;

  const W = 300, H = 110, padL = 34, padR = 8, padT = 10, padB = 18;
  const values = points.map(p => p.y);
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min = min - 1; max = max + 1; }
  const span = max - min;
  // Pad the range so the line never runs along the frame.
  min -= span * 0.12;
  max += span * 0.12;

  const x = i => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i / (points.length - 1)) * (W - padL - padR));
  const y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L ${x(points.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;
  const ticks = [max - span * 0.12, (max + min) / 2, min + span * 0.12];

  const last = points[points.length - 1];
  const best = points.reduce((a, b) => (b.y > a.y ? b : a));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }} role="img" aria-label={yLabel || 'График прогресса'}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth="0.6" />
            <text x={padL - 5} y={y(t) + 2.5} textAnchor="end" fontSize="6.5" fill={C.textFaint} fontFamily={F.body}>
              {fmt(t, 0)}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="gtFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gtFill)" />
        <path d={path} fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle
            key={i} cx={x(i)} cy={y(p.y)} r={p === best ? 2.6 : 1.7}
            fill={p === best ? accent : C.bg}
            stroke={accent} strokeWidth="1.2"
          />
        ))}

        <text x={x(points.length - 1)} y={y(last.y) - 6} textAnchor="end" fontSize="7.5" fill={accent} fontFamily={F.display} fontWeight="600">
          {fmt(last.y, 1)}
        </text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textFaint, padding: '0 4px' }}>
        <span>{points[0].label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
        <span>{last.label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function StatBlock({ value, unit, label, accent = C.text }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 0, padding: '12px 12px 14px' }}>
      <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, color: accent, lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: C.textDim, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function Empty({ title, hint, action }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '30px 20px' }}>
      <div style={{ fontFamily: F.display, fontSize: 16, color: C.textMid, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: C.textFaint, lineHeight: 1.55, marginBottom: action ? 16 : 0 }}>{hint}</div>}
      {action}
    </div>
  );
}
