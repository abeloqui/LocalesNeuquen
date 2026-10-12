// Comercios en Neon. GET = lista pública. POST = login / guardar (solo admin, verificado acá en el servidor).
// Variables de entorno en Vercel: DATABASE_URL, ADMIN_PASSWORD (y opcional ADMIN_USER, por defecto "admin").
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

let sql = null, listo = null;
function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL);
  if (!listo) {
    listo = sql.transaction([
      sql`create table if not exists comercios (id integer primary key, datos jsonb not null)`,
      sql`create table if not exists meta (clave text primary key, valor text not null)`,
      sql`create table if not exists intentos (huella text not null, ts timestamptz not null default now())`
    ]).catch(e => { listo = null; throw e; });
  }
  return listo.then(() => sql);
}

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const iguales = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const clave = () => hash('k:' + process.env.ADMIN_PASSWORD + ':' + process.env.DATABASE_URL);
const firmar = (exp) => crypto.createHmac('sha256', clave()).update(String(exp)).digest('base64url');
const crearToken = () => { const exp = Math.floor(Date.now() / 1000) + 12 * 3600; return exp + '.' + firmar(exp); };
function tokenOk(t) {
  const [exp, f] = String(t || '').split('.');
  if (!exp || !f || !(Number(exp) > Date.now() / 1000)) return false;
  const a = Buffer.from(f), b = Buffer.from(firmar(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
function limpiarItems(lista) {
  const out = [], usados = new Set();
  for (const x of lista) {
    if (!x || typeof x !== 'object') continue;
    const lat = Number(x.lat), lng = Number(x.lng), nombre = txt(x.nombre, 80);
    if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const hz = x.horarios && typeof x.horarios === 'object' ? x.horarios : {};
    out.push({
      id: Number.isInteger(x.id) && x.id > 0 && x.id < 2e9 ? x.id : 0, nombre,
      categoria: txt(x.categoria, 40) || 'Otros',
      tipo: ['local', 'feria', 'servicio'].includes(x.tipo) ? x.tipo : 'local',
      barrio: txt(x.barrio, 60) || 'Centro', direccion: txt(x.direccion, 120) || 'Sin dirección', lat, lng,
      horarios: { lun_vie: txt(hz.lun_vie, 80) || 'Cerrado', sab: txt(hz.sab, 80) || 'Cerrado', dom: txt(hz.dom, 80) || 'Cerrado' },
      aviso: txt(x.aviso, 160) || null, telefono: txt(x.telefono, 30)
    });
  }
  let max = Math.max(0, ...out.map(c => c.id));
  for (const c of out) { if (!c.id || usados.has(c.id)) c.id = ++max; usados.add(c.id); }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ ok: false, error: 'Servidor sin configurar' });
    const q = await db();

    if (req.method === 'GET') {
      const filas = await q`select datos from comercios order by id`;
      const m = await q`select valor from meta where clave = 'inicializado'`;
      res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
      return res.status(200).json({ ok: true, inicializado: m.length > 0, items: filas.map(f => f.datos) });
    }

    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ ok: false }); }
    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ ok: false, error: 'Servidor sin configurar' });
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    b = b || {};

    if (b.accion === 'login') {
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'sin-ip';
      const huella = hash('ip:' + ip).toString('hex').slice(0, 32);
      const r = await q`select count(*)::int as n from intentos where huella = ${huella} and ts > now() - interval '15 minutes'`;
      if (r[0].n >= 8) return res.status(429).json({ ok: false, error: 'Demasiados intentos' });
      const userOk = iguales(b.usuario || '', process.env.ADMIN_USER || 'admin');
      const passOk = iguales(b.clave || '', process.env.ADMIN_PASSWORD);
      if (!(userOk && passOk)) {
        await q`insert into intentos (huella) values (${huella})`;
        await q`delete from intentos where ts < now() - interval '1 day'`;
        return res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
      }
      return res.status(200).json({ ok: true, token: crearToken() });
    }

    if (b.accion === 'guardar') {
      const auth = String(req.headers.authorization || '');
      if (!auth.startsWith('Bearer ') || !tokenOk(auth.slice(7))) return res.status(401).json({ ok: false, error: 'Sesión inválida' });
      if (!Array.isArray(b.items) || b.items.length > 2000) return res.status(400).json({ ok: false, error: 'Datos inválidos' });
      const items = limpiarItems(b.items);
      const json = JSON.stringify(items);
      await q.transaction([
        q`delete from comercios`,
        q`insert into comercios (id, datos) select (e->>'id')::int, e from jsonb_array_elements(${json}::jsonb) e`,
        q`insert into meta (clave, valor) values ('inicializado', '1') on conflict (clave) do update set valor = '1'`
      ]);
      return res.status(200).json({ ok: true, total: items.length });
    }
    return res.status(400).json({ ok: false, error: 'Acción desconocida' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
};
