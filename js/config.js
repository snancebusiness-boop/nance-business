// Nance Group — configuration
// La clé "publishable" est publique par nature : la sécurité repose sur
// la connexion Supabase Auth + les règles RLS (voir sql/01_securite.sql).
// Aucun mot de passe ni token secret ne doit JAMAIS être écrit dans ce dossier.

const SUPABASE_URL = 'https://vfgmaevqcbqzstqnjqjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zdpPYv5ivEw6n2xtU0ua6Q_oM5Ye7n1';

const APP_NOM = 'Nance Group';
// Domaine interne servant à transformer un identifiant ("pdg") en adresse de connexion.
// Doit rester identique à celui du script SQL et de api/comptes.js.
const AUTH_EMAIL_DOMAIN = 'nancegroup.app';

// "Se souvenir de moi" : session gardée (localStorage) ou effacée à la fermeture (sessionStorage)
function nanceStockageSession() {
  try { return localStorage.getItem('nance_remember') === '0' ? sessionStorage : localStorage; }
  catch (e) { return undefined; }
}

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: nanceStockageSession(), storageKey: 'nance-auth', persistSession: true, autoRefreshToken: true }
});

function identifiantVersEmail(identifiant) {
  const id = (identifiant || '').trim().toLowerCase();
  if (id.includes('@')) return id;
  return id.replace(/[^a-z0-9._-]/g, '') + '@' + AUTH_EMAIL_DOMAIN;
}

// Anciennes préférences locales (avant le passage en Nance Group)
(function migrerPreferencesLocales() {
  try {
    if (localStorage.getItem('nance_app_nom') === 'Nance Business') localStorage.setItem('nance_app_nom', APP_NOM);
    const acc = (localStorage.getItem('nance_accent_color') || '').toLowerCase();
    if (acc === '#5b5ef4') localStorage.removeItem('nance_accent_color');
    localStorage.removeItem('nance_session'); // ancien stockage du mot de passe en clair
  } catch (e) {}
})();
