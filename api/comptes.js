// POST /api/comptes  — gestion des comptes, réservée au PDG
//   { action:'creer',     identifiant, mot_de_passe, role:'responsable'|'superviseur', boutique_id }
//   { action:'modifier',  compte_id, identifiant, mot_de_passe (facultatif) }
//   { action:'supprimer', compte_id }
const { config, entetesAdmin, identifiantVersEmail, compteAppelant, repondre, lireCorps } = require('./_outils');

const ROLES_AUTORISES = ['responsable', 'superviseur'];

async function appel(chemin, options = {}) {
  const { url, cle } = config();
  const r = await fetch(url + chemin, { ...options, headers: { ...entetesAdmin(cle), ...(options.headers || {}) } });
  const texte = await r.text();
  let corps = null; try { corps = texte ? JSON.parse(texte) : null; } catch (e) { corps = texte; }
  return { ok: r.ok, statut: r.status, corps };
}

function messageErreur(corps, defaut) {
  if (!corps) return defaut;
  return corps.msg || corps.message || corps.error_description || corps.error || defaut;
}

async function identifiantDejaPris(identifiant, saufCompteId) {
  const email = identifiantVersEmail(identifiant);
  const r = await appel('/rest/v1/comptes?select=id,identifiant');
  if (!r.ok) throw new Error('Lecture des comptes impossible');
  return (r.corps || []).some(c => c.id !== saufCompteId && identifiantVersEmail(c.identifiant) === email);
}

function verifierIdentifiant(identifiant) {
  if (!identifiant) return 'Identifiant vide';
  if (identifiant.includes('@')) return null;
  if (identifiantVersEmail(identifiant).startsWith('@')) return 'Identifiant invalide : utilisez des lettres sans accent, des chiffres, ".", "-" ou "_"';
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'Méthode non autorisée' });
  try {
    const moi = await compteAppelant(req);
    if (!moi) return repondre(res, 401, { erreur: 'Non connecté' });
    if (moi.role !== 'pdg') return repondre(res, 403, { erreur: 'Réservé au PDG' });

    const b = await lireCorps(req);
    const action = b.action;

    // ---------- CRÉER ----------
    if (action === 'creer') {
      const identifiant = String(b.identifiant || '').trim();
      const mdp = String(b.mot_de_passe || '');
      const role = b.role;
      const errId = verifierIdentifiant(identifiant);
      if (errId) return repondre(res, 400, { erreur: errId });
      if (mdp.length < 8) return repondre(res, 400, { erreur: 'Mot de passe : 8 caractères minimum' });
      if (!ROLES_AUTORISES.includes(role)) return repondre(res, 400, { erreur: 'Rôle non autorisé' });
      if (role === 'responsable' && !b.boutique_id) return repondre(res, 400, { erreur: 'Boutique manquante' });
      if (await identifiantDejaPris(identifiant)) return repondre(res, 409, { erreur: 'Cet identifiant est déjà utilisé' });

      const u = await appel('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: identifiantVersEmail(identifiant), password: mdp, email_confirm: true, user_metadata: { identifiant } })
      });
      if (!u.ok) return repondre(res, 400, { erreur: messageErreur(u.corps, 'Création du compte impossible') });

      const c = await appel('/rest/v1/comptes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ identifiant, role, boutique_id: role === 'responsable' ? b.boutique_id : null, auth_id: u.corps.id })
      });
      if (!c.ok) {
        await appel('/auth/v1/admin/users/' + u.corps.id, { method: 'DELETE' });
        return repondre(res, 400, { erreur: messageErreur(c.corps, 'Enregistrement du compte impossible') });
      }
      return repondre(res, 200, { ok: true, compte: (c.corps || [])[0] });
    }

    // Pour modifier / supprimer : charger le compte visé
    const compteId = String(b.compte_id || '');
    if (!compteId) return repondre(res, 400, { erreur: 'Compte manquant' });
    const lu = await appel('/rest/v1/comptes?select=id,identifiant,role,auth_id,session_version&id=eq.' + encodeURIComponent(compteId));
    const cible = lu.ok && lu.corps && lu.corps[0];
    if (!cible) return repondre(res, 404, { erreur: 'Compte introuvable' });

    // ---------- MODIFIER ----------
    if (action === 'modifier') {
      const identifiant = String(b.identifiant || cible.identifiant).trim();
      const mdp = b.mot_de_passe ? String(b.mot_de_passe) : '';
      const errId = verifierIdentifiant(identifiant);
      if (errId) return repondre(res, 400, { erreur: errId });
      if (mdp && mdp.length < 8) return repondre(res, 400, { erreur: 'Mot de passe : 8 caractères minimum' });
      if (!cible.auth_id) return repondre(res, 400, { erreur: "Ce compte n'est pas relié à la connexion sécurisée (relancer le script SQL)" });

      const changeId = identifiant !== cible.identifiant;
      if (changeId && await identifiantDejaPris(identifiant, cible.id)) return repondre(res, 409, { erreur: 'Cet identifiant est déjà utilisé' });

      if (changeId || mdp) {
        const maj = {};
        if (changeId) { maj.email = identifiantVersEmail(identifiant); maj.email_confirm = true; maj.user_metadata = { identifiant }; }
        if (mdp) maj.password = mdp;
        const u = await appel('/auth/v1/admin/users/' + cible.auth_id, { method: 'PUT', body: JSON.stringify(maj) });
        if (!u.ok) return repondre(res, 400, { erreur: messageErreur(u.corps, 'Mise à jour de la connexion impossible') });
      }
      const nouvelleVersion = (cible.session_version || 0) + (changeId || mdp ? 1 : 0);
      const c = await appel('/rest/v1/comptes?id=eq.' + encodeURIComponent(cible.id), {
        method: 'PATCH',
        body: JSON.stringify({ identifiant, session_version: nouvelleVersion })
      });
      if (!c.ok) return repondre(res, 400, { erreur: messageErreur(c.corps, 'Mise à jour du compte impossible') });
      return repondre(res, 200, { ok: true });
    }

    // ---------- SUPPRIMER ----------
    if (action === 'supprimer') {
      if (cible.role === 'pdg') return repondre(res, 400, { erreur: 'Le compte PDG ne peut pas être supprimé' });
      if (cible.id === moi.id) return repondre(res, 400, { erreur: 'Vous ne pouvez pas supprimer votre propre compte' });
      const c = await appel('/rest/v1/comptes?id=eq.' + encodeURIComponent(cible.id), { method: 'DELETE' });
      if (!c.ok) return repondre(res, 400, { erreur: messageErreur(c.corps, 'Suppression impossible (données liées ?)') });
      if (cible.auth_id) await appel('/auth/v1/admin/users/' + cible.auth_id, { method: 'DELETE' });
      return repondre(res, 200, { ok: true });
    }

    return repondre(res, 400, { erreur: 'Action inconnue' });
  } catch (e) {
    return repondre(res, 500, { erreur: e.message });
  }
};
