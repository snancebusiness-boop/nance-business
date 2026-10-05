// Nance Group — authentification (Supabase Auth)
// Le mot de passe n'est plus jamais lu ni stocké par l'application :
// Supabase vérifie lui-même l'identifiant et le mot de passe (chiffré).

async function chargerMonCompte(authId) {
  const { data, error } = await sb.from('comptes').select('*,boutiques(*)').eq('auth_id', authId).maybeSingle();
  if (error) console.warn('Chargement compte :', error.message);
  return data || null;
}

// Démarrage de l'espace : session valide → compte → (PIN) → application
document.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('nance_theme');
  if (saved === 'light') document.body.classList.add('light');
  chargerLogoEtTheme();

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return location.replace('connexion.html');

  const compte = await chargerMonCompte(session.user.id);
  if (!compte) {
    await sb.auth.signOut();
    return location.replace('connexion.html?erreur=compte');
  }

  const { data: aPin } = await sb.rpc('j_ai_un_pin');
  compte.a_pin = !!aPin;

  if (compte.a_pin && sessionStorage.getItem('nance_pin_ok') !== session.user.id) {
    afficherEcranPin(compte);
  } else {
    await finaliserConnexion(compte);
  }
});

sb.auth.onAuthStateChange((evenement) => {
  if (evenement === 'SIGNED_OUT') location.replace('connexion.html');
});

// ===================== CODE PIN (2e vérification) =====================
function champsPin(prefixe, surDernier) {
  return [1, 2, 3, 4].map(i => `<input id="${prefixe}-${i}" class="inp" type="password" maxlength="1" inputmode="numeric" autocomplete="off"
    style="width:52px;height:52px;text-align:center;font-size:22px;font-weight:800"
    oninput="${i < 4 ? `pinNext(this,'${prefixe}-${i + 1}')` : `if(this.value.length===1)${surDernier}()`}">`).join('');
}
function lirePin(prefixe) { return [1, 2, 3, 4].map(i => document.getElementById(`${prefixe}-${i}`)?.value || '').join(''); }
function viderPin(prefixe) {
  [1, 2, 3, 4].forEach(i => { const el = document.getElementById(`${prefixe}-${i}`); if (el) el.value = ''; });
  document.getElementById(`${prefixe}-1`)?.focus();
}
function pinNext(current, nextId) { if (current.value.length === 1) document.getElementById(nextId)?.focus(); }

function afficherEcranPin(compte) {
  window._compteEnAttente = compte;
  const overlay = document.createElement('div');
  overlay.id = 'pin-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:32px;width:100%;max-width:340px;text-align:center">
      <div class="marque" style="font-size:22px;margin-bottom:6px">${APP_NOM}</div>
      <div style="font-size:16px;font-weight:700;margin:14px 0 6px">Code PIN requis</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:22px">Entrez votre code PIN à 4 chiffres</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px">${champsPin('pin', 'verifierPin')}</div>
      <button class="btn btn-accent" style="width:100%" onclick="verifierPin()">Valider</button>
      <div id="pin-error" style="color:var(--red);font-size:12px;margin-top:10px;display:none">Code PIN incorrect</div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px;font-size:12px" onclick="doLogout()">← Changer de compte</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('pin-1')?.focus(), 100);
}

async function verifierPin() {
  const compte = window._compteEnAttente;
  if (!compte) return;
  const pin = lirePin('pin');
  if (pin.length !== 4) return;
  const { data: ok } = await sb.rpc('verifier_mon_pin', { p_pin: pin });
  if (ok) {
    sessionStorage.setItem('nance_pin_ok', compte.auth_id);
    document.getElementById('pin-overlay')?.remove();
    window._compteEnAttente = null;
    await finaliserConnexion(compte);
  } else {
    document.getElementById('pin-error').style.display = 'block';
    viderPin('pin');
  }
}

// ===================== VERROUILLAGE APRÈS INACTIVITÉ =====================
function afficherEcranVerrouillage() {
  stopLockTimer();
  const hasPIN = currentUser?.a_pin;
  const overlay = document.createElement('div');
  overlay.id = 'lock-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:16px';
  overlay.innerHTML = `
    <div style="text-align:center">
      <div class="marque" style="font-size:24px">${APP_NOM}</div>
      <div style="color:var(--text2);font-size:13px;margin-top:6px">Session verrouillée après ${lockDelay} min d'inactivité</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:340px;text-align:center">
      ${hasPIN ? `
      <div style="font-size:14px;font-weight:700;margin-bottom:16px">Entrez votre code PIN</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:16px">${champsPin('lpin', 'deverrouiller')}</div>
      <button class="btn btn-accent" style="width:100%" onclick="deverrouiller()">Déverrouiller</button>
      ` : `
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text2);text-align:left">Mot de passe</div>
      <input class="inp" id="lock-pw" type="password" placeholder="Votre mot de passe" onkeydown="if(event.key==='Enter')deverrouiller()">
      <button class="btn btn-accent" style="width:100%;margin-top:12px" onclick="deverrouiller()">Déverrouiller</button>
      `}
      <div id="lock-error" style="color:var(--red);font-size:12px;text-align:center;margin-top:8px;display:none">Code incorrect</div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px;font-size:12px" onclick="doLogout()">→ Se déconnecter</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => {
    if (hasPIN) document.getElementById('lpin-1')?.focus();
    else document.getElementById('lock-pw')?.focus();
  }, 100);
}
function lockPinNext(current, nextId) { pinNext(current, nextId); }

async function deverrouiller() {
  let ok = false;
  if (currentUser?.a_pin) {
    const pin = lirePin('lpin');
    if (pin.length !== 4) return;
    const { data } = await sb.rpc('verifier_mon_pin', { p_pin: pin });
    ok = !!data;
    if (!ok) viderPin('lpin');
  } else {
    const pw = document.getElementById('lock-pw').value;
    if (!pw) return;
    const { error } = await sb.auth.signInWithPassword({ email: identifiantVersEmail(currentUser.identifiant), password: pw });
    ok = !error;
    if (!ok) document.getElementById('lock-pw').value = '';
  }
  if (ok) {
    document.getElementById('lock-overlay')?.remove();
    startLockTimer();
    notif('Session déverrouillée', 'success');
  } else {
    document.getElementById('lock-error').style.display = 'block';
  }
}

// ===================== ENTRÉE DANS L'APPLICATION =====================
async function finaliserConnexion(data) {
  currentUser = data;
  document.getElementById('app').style.display = 'block';
  applyTheme();
  const estPdg = data.role === 'pdg', estSup = data.role === 'superviseur';
  document.getElementById('user-label').textContent = estPdg ? (data.nom_complet || 'PDG') : estSup ? (data.nom_complet || 'Superviseur') : (data.nom_complet || data.boutiques?.nom || 'Responsable');
  document.getElementById('user-role-label').textContent = estPdg ? 'Accès total' : estSup ? 'Lecture & Messages' : (data.boutiques?.nom || 'Boutique uniquement');

  const afficher = ids => ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
  if (estPdg) {
    afficher(['global-btn', 'employes-global-btn', 'annuel-btn', 'presences-global-btn', 'paie-btn', 'comptes-btn', 'notifs-pdg-btn',
      'connexions-btn', 'corbeille-btn', 'parametres-btn', 'conges-btn', 'objectifs-btn', 'rappels-btn', 'logprix-btn', 'sauvegarde-btn',
      'meilleur-btn', 'dettes-btn', 'rapport-transport-btn', 'fil-btn']);
  }
  if (estSup) {
    afficher(['global-btn', 'employes-global-btn', 'presences-global-btn', 'paie-btn', 'immo-global-btn', 'rappels-btn', 'fil-btn']);
  }
  if (estPdg || estSup) {
    document.getElementById('grp-global').style.display = 'block';
    document.getElementById('grp-finance').style.display = 'block';
  }
  if (estPdg) document.getElementById('grp-admin').style.display = 'block';

  initNavGroups();
  startNotifCheck();
  const savedDelay = parseInt(localStorage.getItem('nance_lock_delay'));
  if (savedDelay) lockDelay = savedDelay;
  startLockTimer();
  try {
    await sb.from('connexions').insert({
      compte_id: data.id,
      identifiant: data.identifiant,
      role: data.role,
      boutique_nom: estPdg ? 'PDG' : estSup ? 'Superviseur' : (data.boutiques?.nom || '?'),
      user_agent: navigator.userAgent.substring(0, 200),
      appareil: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? '📱 Mobile' : '💻 Ordinateur',
    });
  } catch (e) { console.log('connexion log error', e); }

  await loadBoutiques();
  const prenom = (data.nom_complet || data.identifiant).split(' ')[0];
  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const role = estPdg ? 'PDG' : estSup ? 'Superviseur' : 'Responsable';
  notif(`${salut} ${prenom} ! ${role} connecté.`, 'success');
  surveillerChangementIdentifiants();
}

// ===================== DÉCONNEXION =====================
async function doLogout() {
  if (notifInterval) clearInterval(notifInterval);
  if (chatInterval) clearInterval(chatInterval);
  stopLockTimer();
  try { clearTyping(); } catch (e) {}
  try { if (currentUser) await mettreAJourStatutEnLigne(false); } catch (e) {}
  currentUser = null; currentBoutique = null;
  sessionStorage.removeItem('nance_pin_ok');
  await sb.auth.signOut();
  location.replace('connexion.html');
}

// Si le PDG change le mot de passe ou le PIN d'un compte, ce compte est déconnecté partout
function surveillerChangementIdentifiants() {
  if (window._surveillanceId) clearInterval(window._surveillanceId);
  window._surveillanceId = setInterval(async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await sb.from('comptes').select('session_version').eq('id', currentUser.id).maybeSingle();
      if (error) return;
      if (!data || data.session_version !== currentUser.session_version) {
        notif('Vos identifiants ont été modifiés. Reconnexion requise.', 'error');
        setTimeout(() => doLogout(), 2000);
      }
    } catch (e) {}
  }, 60000);
}
