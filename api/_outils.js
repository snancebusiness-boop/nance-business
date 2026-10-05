// Outils partagés des fonctions serveur (ce fichier n'est pas une route : il commence par "_").
// Variables d'environnement à définir dans Vercel → Settings → Environment Variables :
//   SUPABASE_URL          https://vfgmaevqcbqzstqnjqjt.supabase.co
//   SUPABASE_SECRET_KEY   clé "secret" (ou "service_role") de Supabase — NE JAMAIS la mettre dans le code
//   TELEGRAM_TOKEN        token du bot donné par @BotFather
//   TELEGRAM_CHAT_ID      identifiant de la conversation qui reçoit les messages

const AUTH_EMAIL_DOMAIN = 'nancegroup.app';

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const cle = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !cle) throw new Error('Configuration serveur incomplète (SUPABASE_URL / SUPABASE_SECRET_KEY)');
  return { url, cle };
}

function entetesAdmin(cle) {
  const h = { apikey: cle, 'Content-Type': 'application/json' };
  // Ancienne clé service_role (format JWT) : elle va aussi dans Authorization
  if (cle.startsWith('eyJ')) h.Authorization = 'Bearer ' + cle;
  return h;
}

function identifiantVersEmail(identifiant) {
  const id = String(identifiant || '').trim().toLowerCase();
  if (id.includes('@')) return id;
  return id.replace(/[^a-z0-9._-]/g, '') + '@' + AUTH_EMAIL_DOMAIN;
}

// Vérifie le jeton de connexion envoyé par l'application et renvoie le compte Nance correspondant
async function compteAppelant(req) {
  const { url, cle } = config();
  const jeton = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return null;
  const r = await fetch(url + '/auth/v1/user', { headers: { apikey: cle, Authorization: 'Bearer ' + jeton } });
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !user.id) return null;
  const c = await fetch(url + '/rest/v1/comptes?select=id,identifiant,role,boutique_id,nom_complet&auth_id=eq.' + encodeURIComponent(user.id),
    { headers: entetesAdmin(cle) });
  if (!c.ok) return null;
  const lignes = await c.json();
  return lignes[0] || null;
}

function repondre(res, statut, corps) {
  res.statusCode = statut;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(corps));
}

async function lireCorps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(resolve => {
    let d = '';
    req.on('data', x => { d += x; if (d.length > 100000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}

module.exports = { config, entetesAdmin, identifiantVersEmail, compteAppelant, repondre, lireCorps };
