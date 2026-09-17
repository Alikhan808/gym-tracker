// ---------------------------------------------------------------------------
// Data layer.
//
// Everything the app stores goes through this module. Today it is backed by
// localStorage and each account lives only in the browser that created it.
// The shape of every record is already the shape a server would return, so
// swapping in Supabase means rewriting the functions in this file and nothing
// else. See migrateToSupabase() at the bottom for the exact steps.
// ---------------------------------------------------------------------------

const NS = 'gt';

const K = {
  accounts: `${NS}:accounts`,
  session: `${NS}:session`,
  user: (uid) => `${NS}:u:${uid}`,
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- raw storage ----------

let storageWorks = true;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const val = JSON.parse(raw);
    return val === null || val === undefined ? fallback : val;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    storageWorks = false;
    return false;
  }
}

export function checkStorage() {
  try {
    localStorage.setItem(`${NS}:probe`, '1');
    localStorage.removeItem(`${NS}:probe`);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
}

// ---------- default program ----------

export const DEFAULT_PROGRAM = [
  {
    id: 'd1', label: 'День 1', name: 'Push', sub: 'грудь · плечи · трицепс',
    exercises: [
      { id: 'x1', name: 'Жим штанги лёжа', target: '4×6-8' },
      { id: 'x2', name: 'Жим гантелей на наклонной', target: '3×8-10' },
      { id: 'x3', name: 'Жим штанги стоя', target: '3×8-10' },
      { id: 'x4', name: 'Разведение гантелей в стороны', target: '3×12-15' },
      { id: 'x5', name: 'Отжимания на брусьях', target: '3×10-12' },
      { id: 'x6', name: 'Французский жим', target: '3×10-12' },
    ],
  },
  {
    id: 'd2', label: 'День 2', name: 'Pull', sub: 'спина · бицепс',
    exercises: [
      { id: 'x7', name: 'Становая тяга', target: '4×5-6' },
      { id: 'x8', name: 'Подтягивания', target: '4×6-10' },
      { id: 'x9', name: 'Тяга штанги в наклоне', target: '3×8-10' },
      { id: 'x10', name: 'Тяга верхнего блока', target: '3×10-12' },
      { id: 'x11', name: 'Подъём штанги на бицепс', target: '3×10-12' },
      { id: 'x12', name: 'Молотки с гантелями', target: '3×12' },
    ],
  },
  {
    id: 'd3', label: 'День 3', name: 'Legs', sub: 'ноги',
    exercises: [
      { id: 'x13', name: 'Приседания со штангой', target: '4×6-8' },
      { id: 'x14', name: 'Жим ногами', target: '3×10-12' },
      { id: 'x15', name: 'Румынская тяга', target: '3×8-10' },
      { id: 'x16', name: 'Разгибания ног', target: '3×12-15' },
      { id: 'x17', name: 'Сгибания ног', target: '3×12-15' },
      { id: 'x18', name: 'Икры стоя', target: '4×15-20' },
    ],
  },
  {
    id: 'd4', label: 'День 4', name: 'Push', sub: 'вариация',
    exercises: [
      { id: 'x19', name: 'Жим гантелей лёжа', target: '4×8-10' },
      { id: 'x20', name: 'Жим на наклонной в Смите', target: '3×8-10' },
      { id: 'x21', name: 'Жим Арнольда', target: '3×10-12' },
      { id: 'x22', name: 'Разведение в кроссовере', target: '3×12-15' },
      { id: 'x23', name: 'Жим узким хватом', target: '3×10-12' },
      { id: 'x24', name: 'Разгибание на блоке', target: '3×12-15' },
    ],
  },
  {
    id: 'd5', label: 'День 5', name: 'Pull', sub: 'вариация',
    exercises: [
      { id: 'x25', name: 'Тяга Т-грифа', target: '4×8-10' },
      { id: 'x26', name: 'Тяга нижнего блока', target: '3×10-12' },
      { id: 'x27', name: 'Пуловер', target: '3×12-15' },
      { id: 'x28', name: 'Шраги', target: '3×12-15' },
      { id: 'x29', name: 'Бицепс на скамье Скотта', target: '3×10-12' },
      { id: 'x30', name: 'Обратные разведения', target: '3×12-15' },
    ],
  },
];

export const DEFAULT_SETTINGS = {
  kcal: 3050,
  proteinLo: 105,
  proteinHi: 130,
  weeklyGoal: 5,
  increment: 2.5,
};

function blankUserData(name) {
  return {
    program: DEFAULT_PROGRAM,
    sessions: [],
    settings: DEFAULT_SETTINGS,
    bodyweight: [],
    nutrition: {},
    displayName: name || 'Атлет',
  };
}

// ---------- auth ----------
//
// Local accounts. The password is never stored in readable form, but this is
// device-local storage, not real server-side authentication — it keeps separate
// people on one browser apart, nothing more. Real auth arrives with Supabase.

async function hash(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Subtle crypto needs a secure context; localhost and https both qualify.
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return `fallback:${h}`;
  }
}

const normEmail = (e) => String(e || '').trim().toLowerCase();

export async function signUp({ email, password, name }) {
  const mail = normEmail(email);
  if (!mail.includes('@')) throw new Error('Введи корректный email');
  if ((password || '').length < 6) throw new Error('Пароль от 6 символов');

  const accounts = read(K.accounts, []);
  if (accounts.some(a => a.email === mail)) throw new Error('Такой email уже зарегистрирован');

  const account = {
    id: uid(),
    email: mail,
    name: (name || '').trim() || mail.split('@')[0],
    pass: await hash(`${mail}:${password}`),
    createdAt: new Date().toISOString(),
  };

  write(K.accounts, [...accounts, account]);
  write(K.user(account.id), blankUserData(account.name));
  write(K.session, account.id);
  return publicUser(account);
}

export async function signIn({ email, password }) {
  const mail = normEmail(email);
  const accounts = read(K.accounts, []);
  const account = accounts.find(a => a.email === mail);
  if (!account) throw new Error('Аккаунт не найден');
  if (account.pass !== await hash(`${mail}:${password}`)) throw new Error('Неверный пароль');
  if (!read(K.user(account.id), null)) write(K.user(account.id), blankUserData(account.name));
  write(K.session, account.id);
  return publicUser(account);
}

export function signInAsGuest() {
  const accounts = read(K.accounts, []);
  let guest = accounts.find(a => a.guest);
  if (!guest) {
    guest = { id: uid(), email: null, name: 'Гость', guest: true, createdAt: new Date().toISOString() };
    write(K.accounts, [...accounts, guest]);
    write(K.user(guest.id), blankUserData(guest.name));
  }
  write(K.session, guest.id);
  return publicUser(guest);
}

export function signOut() {
  try { localStorage.removeItem(K.session); } catch { /* storage unavailable */ }
}

export function currentUser() {
  const id = read(K.session, null);
  if (!id) return null;
  const account = read(K.accounts, []).find(a => a.id === id);
  return account ? publicUser(account) : null;
}

const publicUser = (a) => ({ id: a.id, email: a.email, name: a.name, guest: !!a.guest, createdAt: a.createdAt });

export function renameUser(userId, name) {
  const accounts = read(K.accounts, []);
  write(K.accounts, accounts.map(a => (a.id === userId ? { ...a, name } : a)));
  const data = loadData(userId);
  saveData(userId, { ...data, displayName: name });
}

// ---------- per-user data ----------

export function loadData(userId) {
  const data = read(K.user(userId), null);
  if (!data) return blankUserData();
  return {
    ...blankUserData(data.displayName),
    ...data,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    program: Array.isArray(data.program) && data.program.length ? data.program : DEFAULT_PROGRAM,
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    bodyweight: Array.isArray(data.bodyweight) ? data.bodyweight : [],
  };
}

export function saveData(userId, data) {
  return write(K.user(userId), data);
}

export function exportData(userId) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: loadData(userId) }, null, 2);
}

export function importData(userId, json) {
  const parsed = JSON.parse(json);
  const payload = parsed && parsed.data ? parsed.data : parsed;
  if (!payload || typeof payload !== 'object') throw new Error('Файл не похож на выгрузку трекера');
  if (!Array.isArray(payload.program) || !Array.isArray(payload.sessions)) {
    throw new Error('В файле нет программы или истории тренировок');
  }
  saveData(userId, { ...blankUserData(), ...payload });
  return loadData(userId);
}

// ---------------------------------------------------------------------------
// Moving to Supabase (real accounts, sync across devices):
//
// 1. Create a project at supabase.com, then add to .env.local:
//      VITE_SUPABASE_URL=...
//      VITE_SUPABASE_ANON_KEY=...
//    and add the same two in Vercel under Settings -> Environment Variables.
// 2. npm install @supabase/supabase-js
// 3. Tables: profiles(id uuid pk), programs(user_id, json), sessions(user_id,
//    day_id, day_name, started_at, finished_at, entries jsonb),
//    settings(user_id, json). Turn on Row Level Security on every one and add
//    the policy `auth.uid() = user_id` so nobody can read another person's rows.
// 4. Replace signUp/signIn/signOut with supabase.auth calls and loadData/
//    saveData with queries. Component code does not change.
// ---------------------------------------------------------------------------
