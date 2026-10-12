// Recibe el formulario "Publicá tu local" y te lo envía por mail (Resend).
// Variables de entorno en Vercel: RESEND_API_KEY y EMAIL_DESTINO.
const limpiar = (v, n) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  if (b.web) return res.status(200).json({ ok: true }); // campo trampa: es un bot

  const d = {
    local: limpiar(b.local, 80), rubro: limpiar(b.rubro, 60), barrio: limpiar(b.barrio, 60),
    dir: limpiar(b.dir, 120), hor: limpiar(b.hor, 160), aviso: limpiar(b.aviso, 160),
    nombre: limpiar(b.nombre, 60), tel: limpiar(b.tel, 30)
  };
  if (!d.local || !d.rubro || !d.barrio || !d.dir || !d.hor || !d.nombre || d.tel.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  const key = process.env.RESEND_API_KEY, to = process.env.EMAIL_DESTINO;
  if (!key || !to) return res.status(500).json({ ok: false, error: 'Servidor sin configurar' });

  const texto = [
    'Nueva solicitud para publicar en Locales Neuquén', '',
    'Local: ' + d.local, 'Rubro: ' + d.rubro, 'Barrio: ' + d.barrio, 'Dirección: ' + d.dir,
    'Horarios: ' + d.hor, d.aviso ? 'Aviso: ' + d.aviso : null, '',
    'Contacto: ' + d.nombre, 'WhatsApp: ' + d.tel
  ].filter(x => x !== null).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Locales Neuquén <onboarding@resend.dev>',
        to: [to],
        subject: 'Nueva solicitud: ' + d.local,
        text: texto
      })
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'No se pudo enviar el mail' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: 'No se pudo enviar el mail' });
  }
};
