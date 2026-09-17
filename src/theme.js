// Design tokens. The palette carries over from the first version of the
// tracker so returning users recognise the app; what changed is that surfaces
// now come in three depths instead of one, which is what a multi-screen app
// needs to show hierarchy.

export const C = {
  bg: '#0B0D0A',        // page
  surface: '#12140F',   // cards
  surfaceHi: '#181B12', // raised: active rows, sheets
  line: '#22261A',
  lineHi: '#3A4230',

  text: '#EDEFE6',
  textMid: '#9AA089',
  textDim: '#767C67',
  textFaint: '#5C6250',

  lime: '#C9FF3D',      // primary action, records, progress
  limeDim: '#8FA82B',
  ember: '#FF6B4A',     // protein, destructive
  emberDim: '#3D2A22',
  sky: '#6BC5FF',       // secondary data series
};

export const F = {
  display: "'Oswald', sans-serif",
  body: "'Inter', sans-serif",
};

/** Touch targets stay at 44px — below that, thumbs miss on a phone. */
export const TAP = 44;

export const fontLink =
  "@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');";

export const globalCSS = `
  ${fontLink}
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body, #root { margin: 0; background: ${C.bg}; min-height: 100%; }
  body {
    font-family: ${F.body};
    color: ${C.text};
    overscroll-behavior-y: none;
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: ${C.lime}; color: ${C.bg}; }

  button { font-family: ${F.body}; cursor: pointer; }
  button:focus-visible, input:focus-visible, [role="button"]:focus-visible {
    outline: 2px solid ${C.lime};
    outline-offset: 2px;
  }
  input { font-family: ${F.body}; }
  input:focus { outline: none; border-color: ${C.lime} !important; }

  /* Number inputs: the spinners are unusable at thumb size, and the app
     provides its own steppers. */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  .gt-scroll-x { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .gt-scroll-x::-webkit-scrollbar { display: none; }

  @keyframes gt-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .gt-rise { animation: gt-rise .22s ease-out both; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
`;

// ---------- shared style fragments ----------

export const card = {
  background: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 14,
};

export const btnPrimary = {
  background: C.lime,
  color: C.bg,
  border: 'none',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  padding: '14px 18px',
  minHeight: TAP,
  width: '100%',
};

export const btnGhost = {
  background: 'transparent',
  color: C.textMid,
  border: `1px solid ${C.lineHi}`,
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 500,
  padding: '12px 16px',
  minHeight: TAP,
};

export const btnDanger = {
  ...btnGhost,
  color: C.ember,
  borderColor: C.emberDim,
};

export const pill = {
  background: 'transparent',
  color: C.lime,
  border: `1px solid ${C.lineHi}`,
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  padding: '9px 15px',
  whiteSpace: 'nowrap',
};

export const pillActive = {
  background: C.lime,
  color: C.bg,
  borderColor: C.lime,
};

export const numInput = {
  background: '#191C14',
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  color: C.text,
  fontFamily: F.display,
  fontSize: 18,
  padding: '10px 8px',
  width: '100%',
  textAlign: 'center',
  minHeight: TAP,
};

export const textInput = {
  background: '#191C14',
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  color: C.text,
  fontSize: 15,
  padding: '12px 14px',
  width: '100%',
  minHeight: TAP,
};

export const h1 = {
  fontFamily: F.display,
  fontSize: 27,
  fontWeight: 600,
  margin: 0,
  letterSpacing: '-0.01em',
  color: '#F5F7EC',
};

export const h2 = {
  fontFamily: F.display,
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
  color: C.text,
};

export const label = {
  fontSize: 11,
  color: C.textDim,
};

export const stat = {
  fontFamily: F.display,
  fontSize: 26,
  fontWeight: 600,
  color: C.text,
  lineHeight: 1.1,
};
