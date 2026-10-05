// Nance Group — module boutiques
function openAddBoutique() {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">Ajouter une boutique</div>
    <div class="form-row">
      <div><label class="inp-label">Nom</label><input class="inp" id="nb-nom" placeholder="Ex: Boutique Pointe-Noire"></div>
      <div><label class="inp-label">Lieu</label><input class="inp" id="nb-lieu" placeholder="Ex: Pointe-Noire"></div>
      <div><label class="inp-label">Couleur</label>
        <select class="inp" id="nb-col">
          <option value="#B87333">Cuivre</option><option value="#534AB7">Violet</option><option value="#1D9E75">Vert</option>
          <option value="#D85A30">Orange</option><option value="#BA7517">Ambre</option>
          <option value="#185FA5">Bleu</option><option value="#b04fa5">Rose</option>
        </select>
      </div>
      <div><label class="inp-label">Identifiant connexion</label><input class="inp" id="nb-id" placeholder="Ex: boutique6"></div>
      <div><label class="inp-label">Mot de passe</label><input class="inp" id="nb-pw" type="password" autocomplete="new-password" placeholder="8 caractères minimum"></div>
    </div>
    <div style="margin-top:8px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--amber);margin-bottom:12px">👁 Créer un compte Superviseur (optionnel)</div>
      <div class="form-row">
        <div><label class="inp-label">Identifiant superviseur</label><input class="inp" id="nb-sup-id" placeholder="Ex: superviseur1"></div>
        <div><label class="inp-label">Mot de passe superviseur</label><input class="inp" id="nb-sup-pw" type="password" autocomplete="new-password" placeholder="8 caractères minimum"></div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveBoutique()">Créer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function saveBoutique() {
  const nom=document.getElementById('nb-nom').value.trim();
  const lieu=document.getElementById('nb-lieu').value.trim();
  const couleur=document.getElementById('nb-col').value;
  const id=document.getElementById('nb-id').value.trim();
  const pw=document.getElementById('nb-pw').value.trim();
  const supId=document.getElementById('nb-sup-id')?.value.trim();
  const supPw=document.getElementById('nb-sup-pw')?.value.trim();
  if(!nom||!id||!pw) return notif('Remplissez tous les champs','error');
  const e1=verifierMotDePasse(pw); if(e1) return notif(e1,'error');
  if(supId||supPw){
    if(!supId||!supPw) return notif('Superviseur : remplissez identifiant ET mot de passe','error');
    const e2=verifierMotDePasse(supPw); if(e2) return notif(e2,'error');
  }
  const {data,error}=await sb.from('boutiques').insert({nom,lieu,couleur}).select().single();
  if(error) return notif('Erreur : '+error.message,'error');
  try {
    await appelApi('/api/comptes',{action:'creer',identifiant:id,mot_de_passe:pw,role:'responsable',boutique_id:data.id});
  } catch(e){
    // On annule la boutique pour ne pas laisser une boutique sans responsable
    await sb.from('boutiques').delete().eq('id',data.id);
    return notif('Compte responsable : '+e.message,'error');
  }
  if(supId&&supPw){
    try { await appelApi('/api/comptes',{action:'creer',identifiant:supId,mot_de_passe:supPw,role:'superviseur',boutique_id:null}); }
    catch(e){ notif('Boutique créée, mais superviseur non créé : '+e.message,'error'); }
  }
  document.querySelector('.modal-overlay').remove();
  notif('Boutique créée','success'); await loadBoutiques();
}

function editBoutique(id) {
  const b=boutiques.find(x=>x.id===id);
  if(!b) return;
  const couleur=b.couleur||'#534AB7';
  const modules=JSON.parse(b.modules_actifs||'{}');
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:520px"><div class="modal-title">✏️ Modifier la boutique</div>
    <div class="form-row">
      <div><label class="inp-label">Nom</label><input class="inp" id="eb-nom" value="${(b.nom||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Lieu</label><input class="inp" id="eb-lieu" value="${(b.lieu||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Couleur</label>
        <select class="inp" id="eb-col">
          <option value="#534AB7" ${couleur==='#534AB7'?'selected':''}>Violet</option>
          <option value="#1D9E75" ${couleur==='#1D9E75'?'selected':''}>Vert</option>
          <option value="#D85A30" ${couleur==='#D85A30'?'selected':''}>Orange</option>
          <option value="#BA7517" ${couleur==='#BA7517'?'selected':''}>Ambre</option>
          <option value="#185FA5" ${couleur==='#185FA5'?'selected':''}>Bleu</option>
          <option value="#b04fa5" ${couleur==='#b04fa5'?'selected':''}>Rose</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <label class="inp-label">🖼 Photo / Logo (remplace la couleur dans la sidebar)</label>
      ${b.image_url?`<div style="margin:8px 0"><img src="${b.image_url}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid var(--border)"></div>`:''}
      <input type="file" id="eb-img" accept="image/*" onchange="previewBoutiqueImg()" style="color:var(--text);font-size:12px;width:100%;margin-bottom:6px">
      <div id="eb-img-preview"></div>
      <div style="font-size:11px;color:var(--text2)">Formats JPG, PNG (max 300KB recommandé)</div>
      ${b.image_url?`<button class="btn btn-red btn-sm" style="margin-top:8px" onclick="removeBootiqueImage('${id}')">✕ Supprimer l'image actuelle</button>`:''}
    </div>

    <!-- Modules actifs -->
    <div style="margin-bottom:16px">
      <label class="inp-label">⚙️ Modules actifs pour cette boutique</label>
      <div style="background:var(--bg3);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;margin-top:6px">
        ${[
          {id:'vehicules',label:'🚗 Véhicules & Affectations',desc:'Gestion de flotte, entretiens'},
          {id:'versements',label:'💵 Versements',desc:'Système chauffeurs/recettes journalières'},
          {id:'immobilisations',label:'🏗 Immobilisations',desc:'Actifs et amortissements'},
          {id:'fournisseurs',label:'🏭 Fournisseurs',desc:'Carnet fournisseurs et commandes'},
          {id:'avances',label:'💳 Avances sur salaire',desc:'Gestion des avances'},
          {id:'objectifs',label:'🎯 Objectifs de vente',desc:'Suivi des objectifs'},
        ].map(m=>`
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px;font-weight:600">${m.label}</div>
            <div style="font-size:11px;color:var(--text2)">${m.desc}</div>
          </div>
          <input type="checkbox" id="mod-${m.id}" ${modules[m.id]!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)">
        </label>`).join('')}
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-red" onclick="deleteBoutique('${id}')">🗑 Supprimer</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveEditBoutique('${id}')">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

function previewBoutiqueImg() {
  const file=document.getElementById('eb-img')?.files[0];
  const preview=document.getElementById('eb-img-preview');
  if(!file||!preview) return;
  const reader=new FileReader();
  reader.onload=e=>{preview.innerHTML=`<img src="${e.target.result}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid var(--border);margin-top:6px">`};
  reader.readAsDataURL(file);
}

function fileToBase64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
}

async function removeBootiqueImage(id) {
  await sb.from('boutiques').update({image_url:null}).eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Image supprimée ✓','success'); await loadBoutiques();
}

async function saveEditBoutique(id) {
  const nom=document.getElementById('eb-nom').value.trim();
  const lieu=document.getElementById('eb-lieu').value.trim();
  const couleur=document.getElementById('eb-col').value;
  if(!nom) return notif('Entrez le nom','error');
  const imgFile=document.getElementById('eb-img')?.files[0];

  // Sauvegarder les modules actifs
  const modules={};
  ['vehicules','versements','immobilisations','fournisseurs','avances','objectifs'].forEach(m=>{
    modules[m]=document.getElementById('mod-'+m)?.checked!==false;
  });

  const updates={nom,lieu,couleur,modules_actifs:JSON.stringify(modules)};
  if(imgFile){
    if(imgFile.size>1000000) return notif('Image trop grande (max 1MB)','error');
    updates.image_url=await fileToBase64(imgFile);
  }
  const {error}=await sb.from('boutiques').update(updates).eq('id',id);
  if(error) return notif('Erreur: '+error.message,'error');
  document.querySelector('.modal-overlay').remove();
  notif('Boutique modifiée ✓','success'); await loadBoutiques();
  const b=boutiques.find(x=>x.id===id);
  if(b&&currentBoutique?.id===id) selectBoutique(b);
}

async function deleteBoutique(id) {
  if(!confirm('Supprimer cette boutique et toutes ses données ?')) return;
  await sb.from('boutiques').delete().eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Boutique supprimée','success'); currentBoutique=null; await loadBoutiques();
}
