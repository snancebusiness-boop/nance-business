// Nance Group — module parametres
// ===================== LOGO & THÈME =====================
function chargerLogoEtTheme() {
  const logo=localStorage.getItem('nance_logo');
  const nom=localStorage.getItem('nance_app_nom')||'Nance Group';
  const sous=localStorage.getItem('nance_app_sous')||'Gestion multi-boutiques';
  const couleurAccent=localStorage.getItem('nance_accent_color');

  // Appliquer logo sur écran connexion
  const logoEl=document.getElementById('login-logo-img');
  if(logoEl&&logo) logoEl.innerHTML=`<img src="${logo}" style="width:80px;height:80px;border-radius:16px;object-fit:cover;margin-bottom:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3)">`;

  // Appliquer nom
  const nameEl=document.getElementById('login-app-name');
  if(nameEl) nameEl.textContent=nom;
  const sousEl=document.getElementById('login-app-subtitle');
  if(sousEl) sousEl.textContent=sous;

  // Nom sidebar
  const sidebarTitle=document.querySelector('.sidebar-header h1');
  if(sidebarTitle) sidebarTitle.textContent=nom;

  // Appliquer couleur accent
  if(couleurAccent) {
    document.documentElement.style.setProperty('--accent', couleurAccent);
  }
}

async function showParametresApp() {
  currentView='parametres'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='⚙️ Paramètres de l\'application';
  document.getElementById('topbar-boutique').textContent='Logo, thème et personnalisation';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const logo=localStorage.getItem('nance_logo');
  const nom=localStorage.getItem('nance_app_nom')||'Nance Group';
  const sous=localStorage.getItem('nance_app_sous')||'Gestion multi-boutiques • République du Congo';
  const couleur=localStorage.getItem('nance_accent_color')||'#B87333';

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">🏢 Identité de l'application</div>
      <div class="form-row">
        <div style="flex:2"><label class="inp-label">Nom de l'application</label><input class="inp" id="app-nom" value="${nom}" placeholder="Ex: Mon Business"></div>
        <div style="flex:2"><label class="inp-label">Sous-titre</label><input class="inp" id="app-sous" value="${sous}" placeholder="Ex: Gestion commerciale"></div>
      </div>
      <div style="margin-top:12px">
        <label class="inp-label">🖼 Logo de l'entreprise</label>
        <div style="display:flex;align-items:center;gap:16px;margin-top:8px">
          ${logo?`<img src="${logo}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid var(--accent)">`:'<div style="width:80px;height:80px;border-radius:12px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:32px;border:2px dashed var(--border)">🏢</div>'}
          <div>
            <label style="cursor:pointer">
              <input type="file" id="logo-file" accept="image/*" style="display:none" onchange="previewLogo(this)">
              <span class="btn btn-accent btn-sm">📷 Choisir un logo</span>
            </label>
            ${logo?`<button class="btn btn-red btn-sm" style="margin-top:6px;display:block" onclick="supprimerLogo()">✕ Supprimer</button>`:''}
            <div style="font-size:11px;color:var(--text2);margin-top:6px">Recommandé: 200×200px, fond transparent</div>
          </div>
        </div>
        <div id="logo-preview" style="margin-top:8px"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🎨 Thème de couleur</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Choisissez la couleur principale de l'application</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        ${[
          {nom:'Violet (défaut)',val:'#B87333'},
          {nom:'Bleu',val:'#2563eb'},
          {nom:'Vert',val:'#16a34a'},
          {nom:'Rouge',val:'#dc2626'},
          {nom:'Orange',val:'#ea580c'},
          {nom:'Rose',val:'#db2777'},
          {nom:'Cyan',val:'#0891b2'},
          {nom:'Indigo',val:'#6366f1'},
        ].map(c=>`
        <div onclick="appliquerCouleur('${c.val}')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:40px;height:40px;border-radius:50%;background:${c.val};border:${couleur===c.val?'3px solid var(--text)':'3px solid transparent'};transition:border 0.2s"></div>
          <div style="font-size:10px;color:var(--text2)">${c.nom}</div>
        </div>`).join('')}
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <input type="color" value="${couleur}" onchange="appliquerCouleur(this.value)" style="width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;padding:0">
          <div style="font-size:10px;color:var(--text2)">Personnalisé</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="width:16px;height:16px;border-radius:50%;background:${couleur}"></div>
        <span style="font-size:13px">Couleur actuelle : <b>${couleur}</b></span>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-accent" onclick="sauvegarderParametres()">💾 Enregistrer</button>
      <button class="btn btn-ghost" onclick="reinitialiserParametres()">↺ Réinitialiser</button>
    </div>`;
}

function previewLogo(input) {
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    document.getElementById('logo-preview').innerHTML=`<img src="${e.target.result}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid var(--accent)">`;
    window._logoTemp=e.target.result;
  };
  reader.readAsDataURL(file);
}

function appliquerCouleur(val) {
  document.documentElement.style.setProperty('--accent', val);
  localStorage.setItem('nance_accent_color', val);
  showParametresApp();
}

function supprimerLogo() {
  localStorage.removeItem('nance_logo');
  chargerLogoEtTheme();
  showParametresApp();
  notif('Logo supprimé','success');
}

function sauvegarderParametres() {
  const nom=document.getElementById('app-nom').value.trim()||'Nance Group';
  const sous=document.getElementById('app-sous').value.trim();
  localStorage.setItem('nance_app_nom', nom);
  localStorage.setItem('nance_app_sous', sous);
  if(window._logoTemp){ localStorage.setItem('nance_logo', window._logoTemp); window._logoTemp=null; }
  chargerLogoEtTheme();
  notif('Paramètres sauvegardés ✓','success');
  showParametresApp();
}

function reinitialiserParametres() {
  localStorage.removeItem('nance_logo');
  localStorage.removeItem('nance_app_nom');
  localStorage.removeItem('nance_app_sous');
  localStorage.removeItem('nance_accent_color');
  document.documentElement.style.removeProperty('--accent');
  chargerLogoEtTheme();
  notif('Paramètres réinitialisés','success');
  showParametresApp();
}
