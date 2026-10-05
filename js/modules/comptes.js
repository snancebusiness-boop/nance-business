// Nance Group — module comptes
// ===================== COMPTES =====================
async function showComptes() {
  currentView='comptes';
  document.getElementById('topbar-title').textContent='Gestion des comptes';
  document.getElementById('topbar-boutique').textContent='';
  document.getElementById('tabs').innerHTML='';
  const {data}=await sb.from('comptes').select('*,boutiques(nom)').order('role');
  const {data:avecPin}=await sb.rpc('comptes_avec_pin');
  const pinsActifs=new Set((avecPin||[]).map(x=>String(x.compte_id??x)));
  const savedDelay=parseInt(localStorage.getItem('nance_lock_delay'))||15;
  document.getElementById('content').innerHTML=`
    <!-- PHOTOS DES PROFILS -->
    <div class="card">
      <div class="card-title">📸 Photos de profil — Organigramme</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px">
        ${(data||[]).filter(c=>c.role==='pdg'||c.role==='superviseur').map(c=>`
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;min-width:140px">
          <div style="position:relative;display:inline-block;margin-bottom:10px">
            ${c.photo_url
              ? `<img src="${c.photo_url}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid var(--accent)">`
              : `<div style="width:70px;height:70px;border-radius:50%;background:var(--bg2);border:3px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:30px">${c.role==='pdg'?'👑':'👁'}</div>`}
          </div>
          <div style="font-weight:700;font-size:13px">${c.nom_complet||c.identifiant}</div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:10px">${c.role}</div>
          <label style="cursor:pointer">
            <input type="file" accept="image/*" style="display:none" onchange="uploadPhotoCompte('${c.id}',this)">
            <span class="btn btn-ghost btn-sm" style="display:inline-block">📷 Changer photo</span>
          </label>
          ${c.role==='pdg'?`<div style="margin-top:8px"><input class="inp" id="nom-${c.id}" value="${c.nom_complet||''}" placeholder="Nom complet..." style="font-size:12px">
          <button class="btn btn-accent btn-sm" style="margin-top:6px;width:100%" onclick="saveNomComplet('${c.id}')">💾 Sauver nom</button></div>`:''}
        </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:12px">💡 La photo et le nom s'affichent dans l'organigramme.</div>
    </div>

    <div class="card">
      <div class="card-title">🔒 Verrouillage automatique</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <label class="inp-label">Délai d'inactivité</label>
          <select class="inp" id="lock-delay-sel" style="width:180px">
            <option value="5" ${savedDelay===5?'selected':''}>5 minutes</option>
            <option value="10" ${savedDelay===10?'selected':''}>10 minutes</option>
            <option value="15" ${savedDelay===15?'selected':''}>15 minutes</option>
            <option value="30" ${savedDelay===30?'selected':''}>30 minutes</option>
            <option value="60" ${savedDelay===60?'selected':''}>1 heure</option>
            <option value="9999" ${savedDelay===9999?'selected':''}>Désactivé</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-accent" onclick="saveLockDelay()">💾 Appliquer</button>
        </div>
        <div style="font-size:12px;color:var(--text2)">Délai actuel : <strong>${savedDelay===9999?'Désactivé':savedDelay+' min'}</strong></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Comptes utilisateurs</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:16px">Modifiez l'identifiant, tapez un nouveau mot de passe (8 caractères minimum) ou un PIN à 4 chiffres, puis cliquez sur 💾 Sauver. Laissez vide ce que vous ne changez pas. La personne concernée sera déconnectée automatiquement.</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Photo</th><th>Rôle</th><th>Boutique</th><th>Identifiant</th><th>Mot de passe</th><th>PIN 🔐</th><th>Action</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td>${c.photo_url?`<img src="${c.photo_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`:`<div style="width:32px;height:32px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px">${c.role==='pdg'?'👑':c.role==='superviseur'?'👁':'👤'}</div>`}</td>
          <td><span class="badge ${c.role==='pdg'?'badge-accent':c.role==='superviseur'?'badge-amber':'badge-green'}">${c.role}</span></td>
          <td style="color:var(--text2)">${c.boutiques?.nom||'Toutes les boutiques'}</td>
          <td><input class="inp" id="id-${c.id}" value="${c.identifiant}" style="width:120px"></td>
          <td><input class="inp" id="pw-${c.id}" value="" type="password" autocomplete="new-password" placeholder="Inchangé" style="width:130px"></td>
          <td>
            <div style="display:flex;align-items:center;gap:4px">
              <input class="inp" id="pin-${c.id}" value="" placeholder="${pinsActifs.has(String(c.id))?'Actif ••••':'Aucun'}" maxlength="4" inputmode="numeric" style="width:90px" type="password">
              ${pinsActifs.has(String(c.id))?`<button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="retirerPin('${c.id}')" title="Retirer le PIN">✕</button>`:''}
            </div>
          </td>
          <td style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-amber btn-sm" onclick="saveCompte('${c.id}')">💾 Sauver</button>
            ${c.role!=='pdg'?`<button class="btn btn-red btn-sm" onclick="deleteCompte('${c.id}')">✕</button>`:''}
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-title">➕ Créer un compte Superviseur</div>
      <div class="form-row">
        <div><label class="inp-label">Identifiant</label><input class="inp" id="sup-new-id" placeholder="Ex: superviseur"></div>
        <div><label class="inp-label">Mot de passe</label><input class="inp" id="sup-new-pw" type="password" autocomplete="new-password" placeholder="8 caractères minimum"></div>
      </div>
      <button class="btn btn-amber" onclick="createSuperviseur()">+ Créer Superviseur</button>
    </div>`;
}

function saveLockDelay() {
  const val=parseInt(document.getElementById('lock-delay-sel').value);
  lockDelay=val;
  localStorage.setItem('nance_lock_delay', val);
  resetLockTimer();
  notif(val===9999?'Verrouillage désactivé':'Délai mis à jour : '+val+' min','success');
  showComptes();
}

async function uploadPhotoCompte(compteId, input) {
  const file=input.files[0];
  if(!file) return;
  if(file.size>5*1024*1024) return notif('Photo trop grande (max 5MB)','error');
  notif('Upload en cours...','success');
  const ext=file.name.split('.').pop();
  const path=`comptes/${compteId}.${ext}`;
  const {error}=await sb.storage.from('photos').upload(path,file,{upsert:true});
  if(error) return notif('Erreur upload: '+error.message,'error');
  const {data:urlData}=sb.storage.from('photos').getPublicUrl(path);
  const url=urlData.publicUrl+'?t='+Date.now();
  await sb.from('comptes').update({photo_url:url}).eq('id',compteId);
  notif('Photo mise à jour ✓','success');
  showComptes();
}

async function saveNomComplet(compteId) {
  const nom=document.getElementById('nom-'+compteId).value.trim();
  await sb.from('comptes').update({nom_complet:nom}).eq('id',compteId);
  notif('Nom mis à jour ✓','success');
}

async function uploadPhotoEmploye(empId, input) {
  const file=input.files[0];
  if(!file) return;
  if(file.size>5*1024*1024) return notif('Photo trop grande (max 5MB)','error');
  notif('Upload en cours...','success');
  const ext=file.name.split('.').pop();
  const path=`employes/${empId}.${ext}`;
  const {error}=await sb.storage.from('photos').upload(path,file,{upsert:true});
  if(error) return notif('Erreur upload: '+error.message,'error');
  const {data:urlData}=sb.storage.from('photos').getPublicUrl(path);
  const url=urlData.publicUrl+'?t='+Date.now();
  await sb.from('employes').update({photo_url:url}).eq('id',empId);
  notif('Photo mise à jour ✓','success');
  if(currentBoutique) renderEmployes();
}

function togglePinVisibility(inputId, btn) {
  const inp=document.getElementById(inputId);
  if(!inp) return;
  if(inp.type==='password'){
    inp.type='text';
    btn.textContent='🙈';
  } else {
    inp.type='password';
    btn.textContent='👁';
  }
}

// Les comptes sont créés / modifiés / supprimés par le serveur (api/comptes.js),
// seul le PDG y a droit. Les mots de passe ne sont jamais affichés : on en saisit un nouveau.
function verifierMotDePasse(pw) {
  if(pw.length<8) return 'Le mot de passe doit faire au moins 8 caractères';
  return null;
}

async function rafraichirMaSession() {
  const {data}=await sb.from('comptes').select('session_version').eq('id',currentUser.id).maybeSingle();
  if(data) currentUser.session_version=data.session_version;
  const {data:aPin}=await sb.rpc('j_ai_un_pin');
  currentUser.a_pin=!!aPin;
}

async function saveCompte(id) {
  const newId=document.getElementById('id-'+id).value.trim();
  const pw=document.getElementById('pw-'+id).value.trim();
  const pin=document.getElementById('pin-'+id)?.value.trim()||'';
  if(!newId) return notif('Identifiant vide','error');
  if(pw){ const e=verifierMotDePasse(pw); if(e) return notif(e,'error'); }
  if(pin&&!/^\d{4}$/.test(pin)) return notif('Le PIN doit être exactement 4 chiffres','error');
  try {
    await appelApi('/api/comptes',{action:'modifier',compte_id:id,identifiant:newId,mot_de_passe:pw||null});
    if(pin){
      const {error}=await sb.rpc('definir_pin',{p_compte:id,p_pin:pin});
      if(error) throw new Error(error.message);
    }
    if(currentUser&&currentUser.id===id) await rafraichirMaSession();
    notif('Compte modifié'+(pw?' — mot de passe changé':'')+(pin?' — PIN défini':''),'success'); showComptes();
  } catch(e){ notif(e.message,'error'); }
}

async function retirerPin(id) {
  if(!confirm('Retirer le code PIN de ce compte ?')) return;
  const {error}=await sb.rpc('definir_pin',{p_compte:id,p_pin:null});
  if(error) return notif('Erreur : '+error.message,'error');
  if(currentUser&&currentUser.id===id) await rafraichirMaSession();
  notif('PIN retiré','success'); showComptes();
}

async function deleteCompte(id) {
  if(!confirm('Supprimer ce compte ? La personne ne pourra plus se connecter.')) return;
  try {
    await appelApi('/api/comptes',{action:'supprimer',compte_id:id});
    notif('Compte supprimé','success'); showComptes();
  } catch(e){ notif(e.message,'error'); }
}

async function createSuperviseur() {
  const id=document.getElementById('sup-new-id').value.trim();
  const pw=document.getElementById('sup-new-pw').value.trim();
  if(!id||!pw) return notif('Remplissez les deux champs','error');
  const e=verifierMotDePasse(pw); if(e) return notif(e,'error');
  try {
    await appelApi('/api/comptes',{action:'creer',identifiant:id,mot_de_passe:pw,role:'superviseur',boutique_id:null});
    notif('Superviseur créé','success'); showComptes();
  } catch(err){ notif(err.message,'error'); }
}

// ===================== MON PROFIL =====================
async function showMonProfil() {
  currentView='profil'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Mon profil';
  document.getElementById('topbar-boutique').textContent='Mes informations personnelles';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const u=currentUser;
  const roleLabel=u.role==='pdg'?'PDG':u.role==='superviseur'?'Superviseur':'Responsable';

  document.getElementById('content').innerHTML=`
    <div class="card" style="max-width:500px;margin:0 auto">
      <!-- Photo de profil -->
      <div style="text-align:center;margin-bottom:24px">
        <div style="position:relative;display:inline-block">
          ${u.photo_url
            ?`<img src="${u.photo_url}" id="profil-photo-preview" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid var(--accent)">`
            :`<div id="profil-photo-preview" style="width:100px;height:100px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:48px;border:4px solid var(--border)">👤</div>`}
          <label style="position:absolute;bottom:4px;right:4px;background:var(--accent);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px" title="Changer photo">
            <input type="file" accept="image/*" style="display:none" onchange="uploadPhotoProfilPersonnel(this)">📷
          </label>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text2)">Cliquez sur 📷 pour changer votre photo</div>
      </div>

      <!-- Infos -->
      <div class="form-row">
        <div style="flex:2">
          <label class="inp-label">Votre nom complet</label>
          <input class="inp" id="profil-nom" value="${u.nom_complet||''}" placeholder="Ex: Marie Dupont">
        </div>
        <div>
          <label class="inp-label">Rôle</label>
          <input class="inp" value="${roleLabel}" disabled style="opacity:0.6">
        </div>
        <div style="flex:2">
          <label class="inp-label">📞 Numéro de téléphone</label>
          <input class="inp" id="profil-tel" value="${u.telephone||''}" placeholder="Ex: +242 06 123 45 67" type="tel">
        </div>
        ${u.boutiques?.nom?`<div>
          <label class="inp-label">Boutique</label>
          <input class="inp" value="${u.boutiques.nom}" disabled style="opacity:0.6">
        </div>`:''}
      </div>

      <button class="btn btn-accent" style="width:100%;margin-top:8px" onclick="sauverMonProfil()">💾 Enregistrer mon profil</button>
    </div>
    <div class="card" style="max-width:500px;margin:0 auto">
      <div class="card-title">🔒 Changer mon mot de passe</div>
      <div class="form-row">
        <div><label class="inp-label">Nouveau mot de passe</label><input class="inp" id="profil-pw1" type="password" autocomplete="new-password" placeholder="8 caractères minimum"></div>
        <div><label class="inp-label">Confirmer</label><input class="inp" id="profil-pw2" type="password" autocomplete="new-password"></div>
      </div>
      <button class="btn btn-ghost" style="width:100%" onclick="changerMonMotDePasse(this)">Changer le mot de passe</button>
    </div>`;
}

async function changerMonMotDePasse(btn) {
  const p1=document.getElementById('profil-pw1').value, p2=document.getElementById('profil-pw2').value;
  const e=verifierMotDePasse(p1); if(e) return notif(e,'error');
  if(p1!==p2) return notif('Les deux mots de passe ne correspondent pas','error');
  btnLoad(btn,true);
  const {error}=await sb.auth.updateUser({password:p1});
  btnLoad(btn,false);
  if(error) return notif('Erreur : '+error.message,'error');
  document.getElementById('profil-pw1').value=''; document.getElementById('profil-pw2').value='';
  notif('Mot de passe changé','success');
}

async function sauverMonProfil() {
  const nom=document.getElementById('profil-nom').value.trim();
  const tel=document.getElementById('profil-tel').value.trim();
  if(!nom) return notif('Entrez votre nom complet','error');
  await sb.from('comptes').update({nom_complet:nom, telephone:tel}).eq('id',currentUser.id);
  currentUser.nom_complet=nom;
  currentUser.telephone=tel;
  document.getElementById('user-label').textContent=nom;
  notif('Profil mis à jour ✓','success');
}

async function uploadPhotoProfilPersonnel(input) {
  const file=input.files[0];
  if(!file) return;
  if(file.size>5*1024*1024) return notif('Photo trop grande (max 5MB)','error');
  notif('Upload en cours...','success');
  const ext=file.name.split('.').pop();
  const path=`comptes/${currentUser.id}.${ext}`;
  const {error}=await sb.storage.from('photos').upload(path,file,{upsert:true});
  if(error) return notif('Erreur upload: '+error.message,'error');
  const {data:urlData}=sb.storage.from('photos').getPublicUrl(path);
  const url=urlData.publicUrl+'?t='+Date.now();
  await sb.from('comptes').update({photo_url:url}).eq('id',currentUser.id);
  currentUser.photo_url=url;
  // Mettre à jour l'aperçu
  const preview=document.getElementById('profil-photo-preview');
  if(preview){
    const img=document.createElement('img');
    img.src=url; img.id='profil-photo-preview';
    img.style.cssText='width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid var(--accent)';
    preview.replaceWith(img);
  }
  notif('Photo mise à jour ✓','success');
}
