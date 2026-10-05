// Nance Group — module transport
// ===================== VERSEMENTS (TRANSPORT) =====================
async function renderVersements() {
  const isPdg=currentUser.role==='pdg';
  const today=new Date().toISOString().split('T')[0];
  const moisCourant=today.substring(0,7);

  const [{data:employes},{data:versements}]=await Promise.all([
    sb.from('employes').select('*').eq('boutique_id',currentBoutique.id).eq('actif',true).order('nom'),
    sb.from('versements').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}),
  ]);

  // Employés avec système de versement
  const empVersement=(employes||[]).filter(e=>e.recette_journaliere&&e.pourcentage_salaire);

  // Calculs du mois courant
  const versementsMois=(versements||[]).filter(v=>v.date?.startsWith(moisCourant));

  document.getElementById('content').innerHTML=`
    <!-- Saisir un versement -->
    <div class="card">
      <div class="card-title">💵 Enregistrer un versement</div>
      <div class="form-row">
        <div><label class="inp-label">Employé</label>
          <select class="inp" id="v-emp">
            <option value="">Choisir...</option>
            ${empVersement.map(e=>`<option value="${e.id}">${e.nom} — ${e.poste||''} (${e.recette_journaliere} FCFA/j)</option>`).join('')}
            ${(employes||[]).filter(e=>!e.recette_journaliere).map(e=>`<option value="${e.id}">${e.nom} — ${e.poste||''}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Date</label><input class="inp" id="v-date" type="date" value="${today}"></div>
        <div><label class="inp-label">Type de journée</label>
          <select class="inp" id="v-type" onchange="updateMontantAttendu()">
            <option value="normal">✅ Journée normale</option>
            <option value="demi_panne">🔧 Demi-journée (panne)</option>
            <option value="panne">🔧 Panne journée entière</option>
            <option value="permission">🏖 Permission</option>
            <option value="absent">⚠️ Absent sans raison</option>
          </select>
        </div>
        <div><label class="inp-label">Montant attendu (FCFA)</label><input class="inp" id="v-attendu" type="number" placeholder="0" readonly style="opacity:0.7"></div>
        <div><label class="inp-label">Montant versé (FCFA)</label><input class="inp" id="v-verse" type="number" placeholder="0" oninput="updateDette()"></div>
        <div><label class="inp-label">Dette calculée</label><input class="inp" id="v-dette" type="number" placeholder="0" readonly style="opacity:0.7;color:var(--red)"></div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px" id="v-info"></div>
      <button class="btn btn-accent" onclick="ajouterVersement()">+ Enregistrer</button>
    </div>

    <!-- Résumé du mois -->
    <div class="card">
      <div class="card-title">📊 Résumé du mois — ${new Date(moisCourant+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</div>
      ${empVersement.length===0?'<div style="color:var(--text2)">Aucun employé avec système de versement. Configurez la recette journalière et le pourcentage dans la fiche employé.</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Employé</th><th>Recette/j</th><th>%</th><th>Jours norm.</th><th>Pannes</th><th>Permissions</th><th>Attendu</th><th>Versé</th><th>Dette</th><th>💰 Salaire</th></tr></thead>
        <tbody>${empVersement.map(e=>{
          const vEmp=versementsMois.filter(v=>v.employe_id===e.id);
          const joursNormaux=vEmp.filter(v=>v.type_journee==='normal').length;
          const demiPannes=vEmp.filter(v=>v.type_journee==='demi_panne').length;
          const pannes=vEmp.filter(v=>v.type_journee==='panne').length;
          const permissions=vEmp.filter(v=>v.type_journee==='permission').length;
          const attenduTotal=vEmp.reduce((s,v)=>s+(v.montant_attendu||0),0);
          const verseTotal=vEmp.reduce((s,v)=>s+(v.montant_verse||0),0);
          const detteTotal=vEmp.reduce((s,v)=>s+(v.dette||0),0);
          const salaire=Math.round(verseTotal*(e.pourcentage_salaire/100));
          const salaireNet=Math.max(0,salaire-detteTotal);
          return `<tr>
            <td style="font-weight:700">${e.nom}<div style="font-size:11px;color:var(--text2)">${e.poste||''}</div></td>
            <td style="color:var(--accent)">${fmt(e.recette_journaliere)}</td>
            <td style="color:var(--amber)">${e.pourcentage_salaire}%</td>
            <td style="color:var(--green);font-weight:600">${joursNormaux}j</td>
            <td style="color:var(--amber)">${pannes+demiPannes}j</td>
            <td style="color:#4a9eff">${permissions}j</td>
            <td>${fmt(attenduTotal)} FCFA</td>
            <td style="color:var(--green);font-weight:600">${fmt(verseTotal)} FCFA</td>
            <td style="color:var(--red);font-weight:600">${detteTotal>0?fmt(detteTotal)+' FCFA':'—'}</td>
            <td style="color:var(--green);font-weight:800;font-size:14px">${fmt(salaireNet)} FCFA</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>

    <!-- Historique versements -->
    <div class="card">
      <div class="card-title">📋 Historique des versements</div>
      ${(versements||[]).length===0?'<div class="empty-state"><p>Aucun versement enregistré</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Employé</th><th>Type</th><th>Attendu</th><th>Versé</th><th>Dette</th>${isPdg?'<th>Action</th>':''}</tr></thead>
        <tbody>${(versements||[]).slice(0,50).map(v=>{
          const emp=(employes||[]).find(e=>e.id===v.employe_id);
          const typeLabel=v.type_journee==='normal'?'✅ Normal':v.type_journee==='demi_panne'?'🔧 Demi-panne':v.type_journee==='panne'?'🔧 Panne':v.type_journee==='permission'?'🏖 Permission':'⚠️ Absent';
          return `<tr>
            <td style="font-size:12px">${v.date}</td>
            <td style="font-weight:600">${emp?.nom||v.employe_nom||'?'}</td>
            <td>${typeLabel}</td>
            <td style="color:var(--text2)">${fmt(v.montant_attendu||0)} FCFA</td>
            <td style="color:var(--green);font-weight:600">${fmt(v.montant_verse||0)} FCFA</td>
            <td style="color:${(v.dette||0)>0?'var(--red)':'var(--green)'};font-weight:600">${(v.dette||0)>0?fmt(v.dette)+' FCFA':'✅ 0'}</td>
            ${isPdg?`<td><button class="btn btn-red btn-sm" onclick="supprimerVersement('${v.id}')">✕</button></td>`:''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;

  window._empVersement=empVersement;
}

function updateMontantAttendu() {
  const empId=document.getElementById('v-emp').value;
  const type=document.getElementById('v-type').value;
  const emp=(window._empVersement||[]).find(e=>e.id===empId);
  let attendu=0;
  let info='';
  if(emp?.recette_journaliere){
    if(type==='normal') { attendu=emp.recette_journaliere; info=`Journée normale : ${fmt(attendu)} FCFA attendus`; }
    else if(type==='demi_panne') { attendu=Math.round(emp.recette_journaliere/2); info=`Demi-journée panne : ${fmt(attendu)} FCFA attendus`; }
    else if(type==='panne') { attendu=0; info='Panne journée entière : 0 FCFA attendu, pas de dette'; }
    else if(type==='permission') { attendu=0; info='Permission : 0 FCFA attendu, pas de dette'; }
    else if(type==='absent') { attendu=emp.recette_journaliere; info=`Absent sans raison : ${fmt(attendu)} FCFA de dette possible`; }
  }
  document.getElementById('v-attendu').value=attendu;
  document.getElementById('v-verse').value=type==='panne'||type==='permission'?0:'';
  document.getElementById('v-dette').value=0;
  document.getElementById('v-info').textContent=info;
  updateDette();
}

function updateDette() {
  const type=document.getElementById('v-type').value;
  const attendu=parseFloat(document.getElementById('v-attendu').value)||0;
  const verse=parseFloat(document.getElementById('v-verse').value)||0;
  let dette=0;
  if(type==='absent') dette=Math.max(0,attendu-verse);
  else if(type==='normal'||type==='demi_panne') dette=0; // Pas de dette, juste salaire réduit
  document.getElementById('v-dette').value=dette;
}

document.addEventListener('change', e=>{
  if(e.target.id==='v-emp') updateMontantAttendu();
});

async function ajouterVersement() {
  const empId=document.getElementById('v-emp').value;
  const date=document.getElementById('v-date').value;
  const type=document.getElementById('v-type').value;
  const attendu=parseFloat(document.getElementById('v-attendu').value)||0;
  const verse=parseFloat(document.getElementById('v-verse').value)||0;
  const dette=parseFloat(document.getElementById('v-dette').value)||0;
  if(!empId) return notif('Choisissez un employé','error');
  if(!date) return notif('Choisissez une date','error');
  const emp=(window._empVersement||(await sb.from('employes').select('*').eq('boutique_id',currentBoutique.id)).data||[]).find(e=>e.id===empId);
  const salaire_jour=emp?Math.round(verse*(emp.pourcentage_salaire||0)/100):0;
  await sb.from('versements').insert({
    boutique_id:currentBoutique.id, employe_id:empId,
    employe_nom:emp?.nom||'', date, type_journee:type,
    montant_attendu:attendu, montant_verse:verse,
    dette, salaire_calcule:salaire_jour
  });
  notif('Versement enregistré ✓','success');
  renderVersements();
}

async function supprimerVersement(id) {
  if(!confirm('Supprimer ce versement ?')) return;
  await sb.from('versements').delete().eq('id',id);
  notif('Versement supprimé','success');
  renderVersements();
}

// ===================== VÉHICULES =====================
async function renderVehicules() {
  const isPdg=currentUser.role==='pdg';
  const today=new Date().toISOString().split('T')[0];
  const dans30j=new Date(Date.now()+30*86400000).toISOString().split('T')[0];

  const [{data:vehicules},{data:employes},{data:entretiens}]=await Promise.all([
    sb.from('vehicules').select('*').eq('boutique_id',currentBoutique.id).order('immatriculation'),
    sb.from('employes').select('id,nom,poste').eq('boutique_id',currentBoutique.id).eq('actif',true),
    sb.from('entretiens_vehicules').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}).limit(50),
  ]);

  // Alertes documents expirés ou proches
  const alertes=[];
  (vehicules||[]).forEach(v=>{
    if(v.date_assurance&&v.date_assurance<=dans30j) alertes.push({vehicule:v.immatriculation,type:'Assurance',date:v.date_assurance});
    if(v.date_vignette&&v.date_vignette<=dans30j) alertes.push({vehicule:v.immatriculation,type:'Vignette',date:v.date_vignette});
    if(v.date_visite&&v.date_visite<=dans30j) alertes.push({vehicule:v.immatriculation,type:'Visite technique',date:v.date_visite});
  });

  document.getElementById('content').innerHTML=`
    ${alertes.length>0?`<div class="card" style="border:2px solid var(--amber)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:20px">⚠️</span>
        <div class="card-title" style="margin-bottom:0;color:var(--amber)">${alertes.length} document(s) à renouveler dans 30 jours</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${alertes.map(a=>{
          const jours=Math.ceil((new Date(a.date)-new Date())/(1000*60*60*24));
          return `<div style="background:var(--amber)11;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
            <span>🚗 <b>${a.vehicule}</b> — ${a.type}</span>
            <span style="color:${jours<=7?'var(--red)':'var(--amber)'};font-weight:700">${jours<=0?'EXPIRÉ !':jours+' jours'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`:''}

    <!-- Ajouter véhicule -->
    <div class="card">
      <div class="card-title">🚗 Ajouter un véhicule</div>
      <div class="form-row">
        <div><label class="inp-label">Immatriculation</label><input class="inp" id="veh-immat" placeholder="Ex: AB-1234-CD"></div>
        <div><label class="inp-label">Type/Modèle</label><input class="inp" id="veh-type" placeholder="Ex: Bus, Camion, Taxi..."></div>
        <div><label class="inp-label">Marque</label><input class="inp" id="veh-marque" placeholder="Ex: Toyota, Mercedes..."></div>
        <div><label class="inp-label">Année</label><input class="inp" id="veh-annee" type="number" placeholder="Ex: 2020"></div>
        <div><label class="inp-label">Chauffeur assigné</label>
          <select class="inp" id="veh-chauffeur">
            <option value="">Aucun</option>
            ${(employes||[]).map(e=>`<option value="${e.id}">${e.nom} — ${e.poste||''}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Kilométrage actuel</label><input class="inp" id="veh-km" type="number" placeholder="0"></div>
      </div>
      <div class="form-row" style="margin-top:8px">
        <div><label class="inp-label">📋 Date assurance</label><input class="inp" id="veh-assurance" type="date"></div>
        <div><label class="inp-label">🏷 Date vignette</label><input class="inp" id="veh-vignette" type="date"></div>
        <div><label class="inp-label">🔧 Date visite technique</label><input class="inp" id="veh-visite" type="date"></div>
        <div><label class="inp-label">⛽ Consommation (L/100km)</label><input class="inp" id="veh-conso" type="number" placeholder="Ex: 12"></div>
      </div>
      <button class="btn btn-accent" style="margin-top:8px" onclick="ajouterVehicule()">+ Ajouter</button>
    </div>

    <!-- Liste véhicules -->
    <div class="card">
      <div class="card-title">🚗 Flotte (${(vehicules||[]).length} véhicule(s))</div>
      ${(vehicules||[]).length===0?'<div class="empty-state"><p>Aucun véhicule enregistré</p></div>':`
      <div style="display:flex;flex-direction:column;gap:12px">
        ${(vehicules||[]).map(v=>{
          const chauffeur=(employes||[]).find(e=>e.id===v.chauffeur_id);
          const assurExpire=v.date_assurance&&v.date_assurance<=dans30j;
          const vignetteExpire=v.date_vignette&&v.date_vignette<=dans30j;
          const visiteExpire=v.date_visite&&v.date_visite<=dans30j;
          const hasAlerte=assurExpire||vignetteExpire||visiteExpire;
          return `<div style="background:var(--bg3);border:1px solid ${hasAlerte?'var(--amber)':'var(--border)'};border-radius:12px;padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
                  <span style="font-size:24px">🚗</span>
                  <div style="font-size:16px;font-weight:800">${v.immatriculation}</div>
                  <span class="badge badge-accent">${v.type_vehicule||'Véhicule'}</span>
                  <span class="badge badge-ghost">${v.marque||''} ${v.annee||''}</span>
                  ${v.statut==='panne'?'<span class="badge badge-red">🔧 En panne</span>':v.statut==='entretien'?'<span class="badge badge-amber">🔧 Entretien</span>':'<span class="badge badge-green">✅ Disponible</span>'}
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-size:12px">
                  <div>👤 <b>Chauffeur :</b> ${chauffeur?.nom||'Non assigné'}</div>
                  <div>🛣 <b>Kilométrage :</b> ${v.kilometrage?fmt(v.kilometrage)+' km':'—'}</div>
                  <div>⛽ <b>Conso :</b> ${v.consommation?v.consommation+'L/100km':'—'}</div>
                  <div style="color:${assurExpire?'var(--amber)':'var(--text2)'}">📋 <b>Assurance :</b> ${v.date_assurance||'—'} ${assurExpire?'⚠️':''}</div>
                  <div style="color:${vignetteExpire?'var(--amber)':'var(--text2)'}">🏷 <b>Vignette :</b> ${v.date_vignette||'—'} ${vignetteExpire?'⚠️':''}</div>
                  <div style="color:${visiteExpire?'var(--amber)':'var(--text2)'}">🔧 <b>Visite tech :</b> ${v.date_visite||'—'} ${visiteExpire?'⚠️':''}</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <button class="btn btn-accent btn-sm" onclick="showEntretiensVehicule('${v.id}','${v.immatriculation}')">🔧 Entretiens</button>
                <button class="btn btn-ghost btn-sm" onclick="ajouterCarburant('${v.id}','${v.immatriculation}')">⛽ Carburant</button>
                <button class="btn btn-amber btn-sm" onclick="editVehicule('${v.id}')">✏️ Modifier</button>
                <select class="inp" style="font-size:11px;padding:4px" onchange="updateStatutVehicule('${v.id}',this.value)">
                  <option value="disponible" ${v.statut==='disponible'?'selected':''}>✅ Disponible</option>
                  <option value="panne" ${v.statut==='panne'?'selected':''}>🔧 En panne</option>
                  <option value="entretien" ${v.statut==='entretien'?'selected':''}>🔧 Entretien</option>
                </select>
                ${isPdg?`<button class="btn btn-red btn-sm" onclick="supprimerVehicule('${v.id}')">✕</button>`:''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>

    <!-- Historique entretiens/carburant -->
    <div class="card">
      <div class="card-title">📋 Derniers entretiens & carburants</div>
      ${(entretiens||[]).length===0?'<div style="color:var(--text2)">Aucun entretien enregistré</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Véhicule</th><th>Type</th><th>Description</th><th>Coût</th><th>Km</th></tr></thead>
        <tbody>${(entretiens||[]).map(e=>{
          const v=(vehicules||[]).find(x=>x.id===e.vehicule_id);
          return `<tr>
            <td style="font-size:12px">${e.date}</td>
            <td style="font-weight:700">${v?.immatriculation||'?'}</td>
            <td><span class="badge ${e.type==='carburant'?'badge-accent':e.type==='reparation'?'badge-red':'badge-amber'}">${e.type==='carburant'?'⛽ Carburant':e.type==='reparation'?'🔧 Réparation':'🔩 Entretien'}</span></td>
            <td style="color:var(--text2)">${e.description||'-'}</td>
            <td style="color:var(--amber);font-weight:600">${fmt(e.cout||0)} FCFA</td>
            <td style="color:var(--text2)">${e.kilometrage?fmt(e.kilometrage)+' km':'-'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;
}

async function ajouterVehicule() {
  const immat=document.getElementById('veh-immat').value.trim().toUpperCase();
  if(!immat) return notif('Entrez l\'immatriculation','error');
  const chauffeurId=document.getElementById('veh-chauffeur').value||null;
  await sb.from('vehicules').insert({
    boutique_id:currentBoutique.id,
    immatriculation:immat,
    type_vehicule:document.getElementById('veh-type').value.trim(),
    marque:document.getElementById('veh-marque').value.trim(),
    annee:parseInt(document.getElementById('veh-annee').value)||null,
    chauffeur_id:chauffeurId,
    kilometrage:parseInt(document.getElementById('veh-km').value)||0,
    date_assurance:document.getElementById('veh-assurance').value||null,
    date_vignette:document.getElementById('veh-vignette').value||null,
    date_visite:document.getElementById('veh-visite').value||null,
    consommation:parseFloat(document.getElementById('veh-conso').value)||null,
    statut:'disponible'
  });
  notif('Véhicule ajouté ✓','success');
  renderVehicules();
}

async function updateStatutVehicule(id, statut) {
  await sb.from('vehicules').update({statut}).eq('id',id);
  notif('Statut mis à jour ✓','success');
}

async function supprimerVehicule(id) {
  if(!confirm('Supprimer ce véhicule ?')) return;
  await sb.from('vehicules').delete().eq('id',id);
  notif('Véhicule supprimé','success');
  renderVehicules();
}

async function editVehicule(id) {
  const {data:v}=await sb.from('vehicules').select('*').eq('id',id).single();
  if(!v) return;
  const {data:employes}=await sb.from('employes').select('id,nom,poste').eq('boutique_id',currentBoutique.id).eq('actif',true);
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:600px">
    <div class="modal-title">✏️ Modifier — ${v.immatriculation}</div>
    <div class="form-row">
      <div><label class="inp-label">Immatriculation</label><input class="inp" id="ev-immat" value="${v.immatriculation}"></div>
      <div><label class="inp-label">Type</label><input class="inp" id="ev-type" value="${v.type_vehicule||''}"></div>
      <div><label class="inp-label">Marque</label><input class="inp" id="ev-marque" value="${v.marque||''}"></div>
      <div><label class="inp-label">Année</label><input class="inp" id="ev-annee" type="number" value="${v.annee||''}"></div>
      <div><label class="inp-label">Chauffeur</label>
        <select class="inp" id="ev-chauffeur">
          <option value="">Aucun</option>
          ${(employes||[]).map(e=>`<option value="${e.id}" ${v.chauffeur_id===e.id?'selected':''}>${e.nom}</option>`).join('')}
        </select>
      </div>
      <div><label class="inp-label">Kilométrage</label><input class="inp" id="ev-km" type="number" value="${v.kilometrage||0}"></div>
      <div><label class="inp-label">📋 Assurance</label><input class="inp" id="ev-assurance" type="date" value="${v.date_assurance||''}"></div>
      <div><label class="inp-label">🏷 Vignette</label><input class="inp" id="ev-vignette" type="date" value="${v.date_vignette||''}"></div>
      <div><label class="inp-label">🔧 Visite technique</label><input class="inp" id="ev-visite" type="date" value="${v.date_visite||''}"></div>
      <div><label class="inp-label">⛽ Conso (L/100km)</label><input class="inp" id="ev-conso" type="number" value="${v.consommation||''}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveVehicule('${id}')">💾 Enregistrer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function saveVehicule(id) {
  await sb.from('vehicules').update({
    immatriculation:document.getElementById('ev-immat').value.trim().toUpperCase(),
    type_vehicule:document.getElementById('ev-type').value.trim(),
    marque:document.getElementById('ev-marque').value.trim(),
    annee:parseInt(document.getElementById('ev-annee').value)||null,
    chauffeur_id:document.getElementById('ev-chauffeur').value||null,
    kilometrage:parseInt(document.getElementById('ev-km').value)||0,
    date_assurance:document.getElementById('ev-assurance').value||null,
    date_vignette:document.getElementById('ev-vignette').value||null,
    date_visite:document.getElementById('ev-visite').value||null,
    consommation:parseFloat(document.getElementById('ev-conso').value)||null,
  }).eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Véhicule modifié ✓','success');
  renderVehicules();
}

function showEntretiensVehicule(vehiculeId, immat) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:550px">
    <div class="modal-title">🔧 Entretien — ${immat}</div>
    <div class="form-row">
      <div><label class="inp-label">Date</label><input class="inp" id="ent-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div><label class="inp-label">Type</label>
        <select class="inp" id="ent-type">
          <option value="entretien">🔩 Entretien régulier</option>
          <option value="reparation">🔧 Réparation</option>
          <option value="carburant">⛽ Carburant</option>
        </select>
      </div>
      <div style="flex:2"><label class="inp-label">Description</label><input class="inp" id="ent-desc" placeholder="Ex: Vidange, pneus, carburant 50L..."></div>
      <div><label class="inp-label">Coût (FCFA)</label><input class="inp" id="ent-cout" type="number" placeholder="0"></div>
      <div><label class="inp-label">Kilométrage</label><input class="inp" id="ent-km" type="number" placeholder="0"></div>
    </div>
    <button class="btn btn-accent" style="width:100%;margin-top:8px" onclick="ajouterEntretien('${vehiculeId}')">+ Enregistrer</button>
    <div class="modal-actions" style="margin-top:8px">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove();renderVehicules()">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function ajouterEntretien(vehiculeId) {
  const date=document.getElementById('ent-date').value;
  const type=document.getElementById('ent-type').value;
  const desc=document.getElementById('ent-desc').value.trim();
  const cout=parseFloat(document.getElementById('ent-cout').value)||0;
  const km=parseInt(document.getElementById('ent-km').value)||null;
  if(!desc) return notif('Entrez une description','error');
  await sb.from('entretiens_vehicules').insert({boutique_id:currentBoutique.id,vehicule_id:vehiculeId,date,type,description:desc,cout,kilometrage:km});
  if(km) await sb.from('vehicules').update({kilometrage:km}).eq('id',vehiculeId);
  notif('Entretien enregistré ✓','success');
  document.querySelector('.modal-overlay').remove();
  renderVehicules();
}

function ajouterCarburant(vehiculeId, immat) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal">
    <div class="modal-title">⛽ Carburant — ${immat}</div>
    <div class="form-row">
      <div><label class="inp-label">Date</label><input class="inp" id="carb-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div><label class="inp-label">Litres</label><input class="inp" id="carb-litres" type="number" placeholder="Ex: 50"></div>
      <div><label class="inp-label">Coût total (FCFA)</label><input class="inp" id="carb-cout" type="number" placeholder="0"></div>
      <div><label class="inp-label">Kilométrage</label><input class="inp" id="carb-km" type="number" placeholder="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="enregistrerCarburant('${vehiculeId}')">⛽ Enregistrer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function enregistrerCarburant(vehiculeId) {
  const date=document.getElementById('carb-date').value;
  const litres=parseFloat(document.getElementById('carb-litres').value)||0;
  const cout=parseFloat(document.getElementById('carb-cout').value)||0;
  const km=parseInt(document.getElementById('carb-km').value)||null;
  await sb.from('entretiens_vehicules').insert({boutique_id:currentBoutique.id,vehicule_id:vehiculeId,date,type:'carburant',description:`Carburant ${litres}L`,cout,kilometrage:km});
  if(km) await sb.from('vehicules').update({kilometrage:km}).eq('id',vehiculeId);
  notif('Carburant enregistré ✓','success');
  document.querySelector('.modal-overlay').remove();
  renderVehicules();
}

// ===================== AFFECTATIONS CHAUFFEUR/VÉHICULE =====================
async function renderAffectations() {
  const today=new Date().toISOString().split('T')[0];

  const [{data:vehicules},{data:employes},{data:affectations}]=await Promise.all([
    sb.from('vehicules').select('*').eq('boutique_id',currentBoutique.id).order('immatriculation'),
    sb.from('employes').select('*').eq('boutique_id',currentBoutique.id).eq('actif',true).order('nom'),
    sb.from('affectations').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}).limit(100),
  ]);

  // Affectations du jour
  const affAujourdhui=(affectations||[]).filter(a=>a.date===today);

  document.getElementById('content').innerHTML=`
    <!-- Affectation du jour -->
    <div class="card">
      <div class="card-title">🔑 Affecter chauffeur → véhicule</div>
      <div class="form-row">
        <div><label class="inp-label">Date</label><input class="inp" id="aff-date" type="date" value="${today}"></div>
        <div><label class="inp-label">Chauffeur</label>
          <select class="inp" id="aff-chauffeur">
            <option value="">Choisir un chauffeur...</option>
            ${(employes||[]).map(e=>`<option value="${e.id}">${e.nom} — ${e.poste||''}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Véhicule</label>
          <select class="inp" id="aff-vehicule">
            <option value="">Choisir un véhicule...</option>
            ${(vehicules||[]).map(v=>`<option value="${v.id}">${v.immatriculation} — ${v.type_vehicule||''} ${v.marque||''}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-accent" style="margin-top:8px" onclick="ajouterAffectation()">+ Affecter</button>
    </div>

    <!-- Affectations du jour -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">📅 Aujourd'hui — ${new Date(today+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}</div>
        <span class="badge badge-accent">${affAujourdhui.length} affectation(s)</span>
      </div>
      ${affAujourdhui.length===0?'<div style="color:var(--text2)">Aucune affectation aujourd\'hui</div>':`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
        ${affAujourdhui.map(a=>{
          const emp=(employes||[]).find(e=>e.id===a.chauffeur_id);
          const veh=(vehicules||[]).find(v=>v.id===a.vehicule_id);
          const kmParcourus=a.km_retour&&a.km_depart?a.km_retour-a.km_depart:null;
          return `<div style="background:var(--bg3);border:1px solid var(--accent)33;border-radius:12px;padding:14px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <span style="font-size:24px">🚗</span>
              <div>
                <div style="font-weight:800;font-size:14px">${veh?.immatriculation||'?'}</div>
                <div style="font-size:11px;color:var(--text2)">${veh?.type_vehicule||''} ${veh?.marque||''}</div>
              </div>
            </div>
            <div style="font-size:13px;font-weight:600;margin-bottom:6px">👤 ${emp?.nom||'?'}</div>
            <div style="font-size:11px;color:var(--text2)">${emp?.poste||''}</div>
            <div style="margin-top:10px">
              <button class="btn btn-red btn-sm" onclick="supprimerAffectation('${a.id}')">✕ Supprimer</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>

    <!-- Historique -->
    <div class="card">
      <div class="card-title">📋 Historique des affectations</div>
      ${(affectations||[]).length===0?'<div class="empty-state"><p>Aucune affectation</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Chauffeur</th><th>Véhicule</th><th>Action</th></tr></thead>
        <tbody>${(affectations||[]).map(a=>{
          const emp=(employes||[]).find(e=>e.id===a.chauffeur_id);
          const veh=(vehicules||[]).find(v=>v.id===a.vehicule_id);
          return `<tr>
            <td style="font-size:12px">${new Date(a.date+'T12:00:00').toLocaleDateString('fr-FR')}</td>
            <td style="font-weight:700">${emp?.nom||a.chauffeur_nom||'?'}<div style="font-size:11px;color:var(--text2)">${emp?.poste||''}</div></td>
            <td><span class="badge badge-accent">${veh?.immatriculation||a.vehicule_immat||'?'}</span><div style="font-size:11px;color:var(--text2)">${veh?.type_vehicule||''}</div></td>
            <td><button class="btn btn-red btn-sm" onclick="supprimerAffectation('${a.id}')">✕</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;

  window._affVehicules=vehicules||[];
  window._affEmployes=employes||[];
}

async function ajouterAffectation() {
  const chauffeurId=document.getElementById('aff-chauffeur').value;
  const vehiculeId=document.getElementById('aff-vehicule').value;
  const date=document.getElementById('aff-date').value;
  if(!chauffeurId) return notif('Choisissez un chauffeur','error');
  if(!vehiculeId) return notif('Choisissez un véhicule','error');
  if(!date) return notif('Choisissez une date','error');
  const emp=(window._affEmployes||[]).find(e=>e.id===chauffeurId);
  const veh=(window._affVehicules||[]).find(v=>v.id===vehiculeId);
  await sb.from('affectations').insert({
    boutique_id:currentBoutique.id,
    chauffeur_id:chauffeurId, chauffeur_nom:emp?.nom||'',
    vehicule_id:vehiculeId, vehicule_immat:veh?.immatriculation||'',
    date,
  });
  await sb.from('vehicules').update({chauffeur_id:chauffeurId}).eq('id',vehiculeId);
  notif('Affectation enregistrée ✓','success');
  renderAffectations();
}

function cloturerAffectation(id) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal">
    <div class="modal-title">🏁 Clôturer l'affectation</div>
    <div class="form-row">
      <div><label class="inp-label">Heure retour</label><input class="inp" id="clo-retour" type="time" value="${new Date().toTimeString().substring(0,5)}"></div>
      <div><label class="inp-label">Km retour</label><input class="inp" id="clo-km" type="number" placeholder="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveCloture('${id}')">🏁 Clôturer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function saveCloture(id) {
  const retour=document.getElementById('clo-retour').value;
  const km=parseInt(document.getElementById('clo-km').value)||null;
  await sb.from('affectations').update({heure_retour:retour,km_retour:km}).eq('id',id);
  if(km){
    const {data:aff}=await sb.from('affectations').select('vehicule_id').eq('id',id).single();
    if(aff?.vehicule_id) await sb.from('vehicules').update({kilometrage:km}).eq('id',aff.vehicule_id);
  }
  document.querySelector('.modal-overlay').remove();
  notif('Affectation clôturée ✓','success');
  renderAffectations();
}

async function supprimerAffectation(id) {
  if(!confirm('Supprimer cette affectation ?')) return;
  await sb.from('affectations').delete().eq('id',id);
  notif('Affectation supprimée','success');
  renderAffectations();
}

// ===================== ANALYSE DES DETTES =====================
async function showAnalyseDettes() {
  currentView='dettes'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='⚠️ Analyse des dettes';
  document.getElementById('topbar-boutique').textContent='Versements manquants & dettes accumulées';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  document.getElementById('content').innerHTML=`<div class="empty-state"><p>⏳ Chargement...</p></div>`;

  // Charger toutes les dettes de versements
  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:employes},{data:versements}]=await Promise.all([
      sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true),
      sb.from('versements').select('*').eq('boutique_id',b.id).gt('dette',0).order('date',{ascending:false}),
    ]);
    return {b, employes:employes||[], versements:versements||[]};
  }));

  // Agréger les dettes par employé
  const dettesParEmploye=[];
  rows.forEach(({b,employes,versements})=>{
    employes.forEach(e=>{
      const vEmp=versements.filter(v=>v.employe_id===e.id);
      if(vEmp.length===0) return;
      const detteTotal=vEmp.reduce((s,v)=>s+(v.dette||0),0);
      if(detteTotal===0) return;
      const premiereDette=vEmp[vEmp.length-1]?.date;
      const derniereDette=vEmp[0]?.date;
      const joursDepuis=premiereDette?Math.ceil((new Date()-new Date(premiereDette))/(1000*60*60*24)):0;
      dettesParEmploye.push({e,b,detteTotal,nbJours:vEmp.length,premiereDette,derniereDette,joursDepuis,details:vEmp});
    });
  });

  // Trier par dette totale décroissante
  dettesParEmploye.sort((a,b)=>b.detteTotal-a.detteTotal);
  const grandTotal=dettesParEmploye.reduce((s,d)=>s+d.detteTotal,0);

  if(dettesParEmploye.length===0){
    document.getElementById('content').innerHTML=`
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <div style="font-size:18px;font-weight:700;color:var(--green)">Aucune dette !</div>
        <div style="color:var(--text2);margin-top:8px">Tous les chauffeurs sont à jour dans leurs versements.</div>
      </div>`;
    return;
  }

  document.getElementById('content').innerHTML=`
    <!-- Stats globales -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💸 Total dettes</div><div class="stat-value red">${fmt(grandTotal)}</div><div class="stat-sub">FCFA à recouvrer</div></div>
      <div class="stat-card"><div class="stat-label">👤 Chauffeurs endettés</div><div class="stat-value amber">${dettesParEmploye.length}</div><div class="stat-sub">sur ${rows.reduce((s,r)=>s+r.employes.filter(e=>e.recette_journaliere).length,0)} chauffeurs</div></div>
      <div class="stat-card"><div class="stat-label">📅 Plus ancienne dette</div><div class="stat-value accent" style="font-size:16px">${dettesParEmploye.reduce((max,d)=>d.joursDepuis>max?d.joursDepuis:max,0)} jours</div><div class="stat-sub">depuis le premier impayé</div></div>
      <div class="stat-card"><div class="stat-label">⚠️ Dette moyenne</div><div class="stat-value" style="color:var(--amber)">${fmt(Math.round(grandTotal/dettesParEmploye.length))}</div><div class="stat-sub">FCFA par chauffeur</div></div>
    </div>

    <!-- Détail par employé -->
    <div class="card">
      <div class="card-title">📋 Détail des dettes par chauffeur</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${dettesParEmploye.map((d,i)=>`
        <div style="background:var(--bg3);border:1px solid ${d.detteTotal>50000?'var(--red)':d.detteTotal>20000?'var(--amber)':'var(--border)'};border-radius:12px;padding:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
                <span style="font-size:20px">${i===0?'🔴':i===1?'🟠':'🟡'}</span>
                ${d.e.photo_url?`<img src="${d.e.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`:`<div style="width:36px;height:36px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:18px">👤</div>`}
                <div>
                  <div style="font-weight:800;font-size:14px">${d.e.nom}</div>
                  <div style="font-size:11px;color:var(--text2)">${d.e.poste||''} • ${d.b.nom}</div>
                </div>
                <span style="background:var(--red)22;color:var(--red);font-weight:800;padding:4px 12px;border-radius:8px;font-size:13px">${fmt(d.detteTotal)} FCFA</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-size:12px;margin-bottom:12px">
                <div>📅 <b>Depuis :</b> ${d.premiereDette||'?'} <span style="color:var(--red)">(${d.joursDepuis}j)</span></div>
                <div>📅 <b>Dernier :</b> ${d.derniereDette||'?'}</div>
                <div>📊 <b>Jours concernés :</b> ${d.nbJours} jour(s)</div>
                <div>💳 <b>Moy/jour :</b> ${fmt(Math.round(d.detteTotal/d.nbJours))} FCFA</div>
              </div>
              <!-- Barre de progression dette vs recette mensuelle -->
              ${d.e.recette_journaliere?`
              <div>
                <div style="font-size:11px;color:var(--text2);margin-bottom:4px">Dette vs recette mensuelle théorique (${fmt(d.e.recette_journaliere*26)} FCFA)</div>
                <div style="background:var(--bg2);border-radius:4px;height:8px">
                  <div style="background:var(--red);height:8px;border-radius:4px;width:${Math.min(100,Math.round((d.detteTotal/(d.e.recette_journaliere*26))*100))}%"></div>
                </div>
                <div style="font-size:11px;color:var(--red);margin-top:2px">${Math.min(100,Math.round((d.detteTotal/(d.e.recette_journaliere*26))*100))}% de la recette mensuelle</div>
              </div>`:''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:140px">
              <button class="btn btn-ghost btn-sm" onclick="voirDetailDettes('${d.e.id}','${d.e.nom.replace(/'/g,"\\'")}')">📋 Voir détail</button>
              <button class="btn btn-green btn-sm" onclick="saisirRemboursement('${d.e.id}','${d.b.id}','${d.e.nom.replace(/'/g,"\\'")}',${d.detteTotal})">💰 Rembourser</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  window._dettesData=dettesParEmploye;
}

function voirDetailDettes(empId, empNom) {
  const d=window._dettesData?.find(x=>x.e.id===empId);
  if(!d) return;
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:550px;max-height:85vh;overflow-y:auto">
    <div class="modal-title">📋 Dettes de ${empNom}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Attendu</th><th>Versé</th><th>Dette</th></tr></thead>
      <tbody>${d.details.map(v=>`<tr>
        <td>${v.date}</td>
        <td style="color:var(--text2)">${fmt(v.montant_attendu||0)} FCFA</td>
        <td style="color:var(--green)">${fmt(v.montant_verse||0)} FCFA</td>
        <td style="color:var(--red);font-weight:700">${fmt(v.dette||0)} FCFA</td>
      </tr>`).join('')}
      <tr style="font-weight:800;background:var(--bg3)">
        <td>TOTAL</td><td></td><td></td>
        <td style="color:var(--red)">${fmt(d.detteTotal)} FCFA</td>
      </tr>
      </tbody>
    </table></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

function saisirRemboursement(empId, boutiqueId, empNom, detteTotal) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal">
    <div class="modal-title">💰 Remboursement — ${empNom}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">Dette totale : <b style="color:var(--red)">${fmt(detteTotal)} FCFA</b></div>
    <div class="form-row">
      <div><label class="inp-label">Montant remboursé (FCFA)</label><input class="inp" id="remb-montant" type="number" placeholder="0" value="${detteTotal}"></div>
      <div><label class="inp-label">Date</label><input class="inp" id="remb-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div style="flex:2"><label class="inp-label">Note</label><input class="inp" id="remb-note" placeholder="Ex: Remboursement en espèces"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-green" onclick="enregistrerRemboursement('${empId}','${boutiqueId}','${empNom.replace(/'/g,"\\'")}',${detteTotal})">💰 Enregistrer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function enregistrerRemboursement(empId, boutiqueId, empNom, detteTotal) {
  const montant=parseFloat(document.getElementById('remb-montant').value)||0;
  const date=document.getElementById('remb-date').value;
  const note=document.getElementById('remb-note').value.trim();
  if(!montant) return notif('Entrez un montant','error');

  // Enregistrer le remboursement comme une recette spéciale
  await sb.from('recettes').insert({
    boutique_id:boutiqueId,
    date, montant,
    description:`Remboursement dette — ${empNom}${note?' — '+note:''}`,
    mode_paiement:'espèces'
  });

  // Réduire les dettes dans les versements (du plus ancien au plus récent)
  const d=window._dettesData?.find(x=>x.e.id===empId);
  if(d) {
    let restant=montant;
    for(const v of [...d.details].reverse()){
      if(restant<=0) break;
      const aDeduire=Math.min(restant,v.dette||0);
      if(aDeduire>0){
        await sb.from('versements').update({dette:Math.max(0,(v.dette||0)-aDeduire)}).eq('id',v.id);
        restant-=aDeduire;
      }
    }
  }

  await logNotifPdg('remboursement','💰',`Remboursement de ${fmt(montant)} FCFA par ${empNom}`);
  document.querySelector('.modal-overlay').remove();
  notif('Remboursement enregistré ✓','success');
  showAnalyseDettes();
}

// ===================== RAPPORT MENSUEL TRANSPORT =====================
async function showRapportTransport() {
  currentView='rapport-transport'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='🚌 Rapport mensuel transport';
  document.getElementById('topbar-boutique').textContent='Versements, dettes & salaires';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const moisCourant=new Date().toISOString().substring(0,7);

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">🚌 Générer le rapport transport</div>
      <div class="form-row">
        <div><label class="inp-label">Mois</label><input class="inp" id="rt-mois" type="month" value="${moisCourant}"></div>
        <div><label class="inp-label">Boutique</label>
          <select class="inp" id="rt-boutique">
            <option value="toutes">🌍 Toutes les boutiques</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-accent" onclick="genererRapportTransport()">📊 Générer</button>
    </div>
    <div id="rt-results"></div>`;
}

async function genererRapportTransport() {
  const mois=document.getElementById('rt-mois').value;
  const boutiqueVal=document.getElementById('rt-boutique').value;
  const el=document.getElementById('rt-results');
  el.innerHTML='<div class="empty-state"><p>⏳ Calcul en cours...</p></div>';

  const moisLabel=new Date(mois+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const dateDebut=mois+'-01', dateFin=mois+'-31';
  const bList=boutiqueVal==='toutes'?boutiques:boutiques.filter(b=>b.id===boutiqueVal);

  const rows=await Promise.all(bList.map(async b=>{
    const [{data:employes},{data:versements},{data:vehicules},{data:affectations},{data:entretiens}]=await Promise.all([
      sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true).order('nom'),
      sb.from('versements').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
      sb.from('vehicules').select('*').eq('boutique_id',b.id),
      sb.from('affectations').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
      sb.from('entretiens_vehicules').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
    ]);

    // Chauffeurs avec système versement
    const chauffeurs=(employes||[]).filter(e=>e.recette_journaliere&&e.pourcentage_salaire);
    const paieChauffeurs=chauffeurs.map(e=>{
      const vEmp=(versements||[]).filter(v=>v.employe_id===e.id);
      const joursNormaux=vEmp.filter(v=>v.type_journee==='normal').length;
      const demiPannes=vEmp.filter(v=>v.type_journee==='demi_panne').length;
      const pannes=vEmp.filter(v=>v.type_journee==='panne').length;
      const permissions=vEmp.filter(v=>v.type_journee==='permission').length;
      const absents=vEmp.filter(v=>v.type_journee==='absent').length;
      const attenduTotal=vEmp.reduce((s,v)=>s+(v.montant_attendu||0),0);
      const verseTotal=vEmp.reduce((s,v)=>s+(v.montant_verse||0),0);
      const detteTotal=vEmp.reduce((s,v)=>s+(v.dette||0),0);
      const salaireBrut=Math.round(verseTotal*(e.pourcentage_salaire/100));
      const salaireNet=Math.max(0,salaireBrut-detteTotal);
      return {e,joursNormaux,demiPannes,pannes,permissions,absents,attenduTotal,verseTotal,detteTotal,salaireBrut,salaireNet};
    });

    // Stats véhicules
    const coutEntretiens=(entretiens||[]).reduce((s,e)=>s+(e.cout||0),0);
    const coutCarburant=(entretiens||[]).filter(e=>e.type==='carburant').reduce((s,e)=>s+(e.cout||0),0);
    const coutReparations=(entretiens||[]).filter(e=>e.type==='reparation').reduce((s,e)=>s+(e.cout||0),0);

    const totalAttendu=paieChauffeurs.reduce((s,p)=>s+p.attenduTotal,0);
    const totalVerse=paieChauffeurs.reduce((s,p)=>s+p.verseTotal,0);
    const totalDettes=paieChauffeurs.reduce((s,p)=>s+p.detteTotal,0);
    const totalSalaires=paieChauffeurs.reduce((s,p)=>s+p.salaireNet,0);

    return {b,paieChauffeurs,vehicules:vehicules||[],affectations:affectations||[],entretiens:entretiens||[],
            coutEntretiens,coutCarburant,coutReparations,totalAttendu,totalVerse,totalDettes,totalSalaires};
  }));

  const grandTotalVerse=rows.reduce((s,r)=>s+r.totalVerse,0);
  const grandTotalDettes=rows.reduce((s,r)=>s+r.totalDettes,0);
  const grandTotalSalaires=rows.reduce((s,r)=>s+r.totalSalaires,0);
  const grandTotalEntretiens=rows.reduce((s,r)=>s+r.coutEntretiens,0);
  const beneficeNet=grandTotalVerse-grandTotalSalaires-grandTotalEntretiens;

  el.innerHTML=`
    <!-- Stats globales -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💰 Total versé</div><div class="stat-value green">${fmt(grandTotalVerse)}</div><div class="stat-sub">FCFA — ${moisLabel}</div></div>
      <div class="stat-card"><div class="stat-label">⚠️ Total dettes</div><div class="stat-value red">${fmt(grandTotalDettes)}</div><div class="stat-sub">FCFA impayés</div></div>
      <div class="stat-card"><div class="stat-label">💵 Total salaires</div><div class="stat-value amber">${fmt(grandTotalSalaires)}</div><div class="stat-sub">FCFA à payer</div></div>
      <div class="stat-card"><div class="stat-label">🔧 Coût entretiens</div><div class="stat-value accent">${fmt(grandTotalEntretiens)}</div><div class="stat-sub">FCFA dépensés</div></div>
      <div class="stat-card"><div class="stat-label">📊 Bénéfice net</div><div class="stat-value ${beneficeNet>=0?'green':'red'}">${fmt(beneficeNet)}</div><div class="stat-sub">Versé - Salaires - Entretiens</div></div>
    </div>

    ${rows.map(({b,paieChauffeurs,vehicules,affectations,coutCarburant,coutReparations,coutEntretiens,totalAttendu,totalVerse,totalDettes,totalSalaires})=>`
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
        <div style="font-size:15px;font-weight:800">${b.nom}</div>
      </div>

      <!-- Résumé boutique -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:16px">
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">Attendu</div>
          <div style="font-weight:700">${fmt(totalAttendu)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">Versé</div>
          <div style="font-weight:700;color:var(--green)">${fmt(totalVerse)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">Dettes</div>
          <div style="font-weight:700;color:var(--red)">${fmt(totalDettes)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">Salaires nets</div>
          <div style="font-weight:700;color:var(--amber)">${fmt(totalSalaires)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">⛽ Carburant</div>
          <div style="font-weight:700">${fmt(coutCarburant)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">🔧 Réparations</div>
          <div style="font-weight:700">${fmt(coutReparations)} FCFA</div>
        </div>
      </div>

      ${paieChauffeurs.length>0?`
      <!-- Tableau chauffeurs -->
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">👥 Chauffeurs (${paieChauffeurs.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Chauffeur</th><th>%</th><th>Jours</th><th>Pannes</th><th>Attendu</th><th>Versé</th><th>Dette</th><th>Salaire brut</th><th style="color:var(--green)">Salaire net</th></tr></thead>
        <tbody>${paieChauffeurs.map(p=>`<tr>
          <td style="font-weight:700">${p.e.nom}<div style="font-size:11px;color:var(--text2)">${p.e.poste||''}</div></td>
          <td style="color:var(--amber)">${p.e.pourcentage_salaire}%</td>
          <td style="color:var(--green)">${p.joursNormaux}j</td>
          <td style="color:var(--amber)">${p.pannes+p.demiPannes}j</td>
          <td>${fmt(p.attenduTotal)} FCFA</td>
          <td style="color:var(--green);font-weight:600">${fmt(p.verseTotal)} FCFA</td>
          <td style="color:${p.detteTotal>0?'var(--red)':'var(--green)'};font-weight:600">${p.detteTotal>0?fmt(p.detteTotal)+' FCFA':'✅ 0'}</td>
          <td style="color:var(--amber)">${fmt(p.salaireBrut)} FCFA</td>
          <td style="color:var(--green);font-weight:800">${fmt(p.salaireNet)} FCFA</td>
        </tr>`).join('')}
        <tr style="font-weight:800;background:var(--bg3)">
          <td colspan="4">TOTAL</td>
          <td>${fmt(totalAttendu)} FCFA</td>
          <td style="color:var(--green)">${fmt(totalVerse)} FCFA</td>
          <td style="color:var(--red)">${fmt(totalDettes)} FCFA</td>
          <td style="color:var(--amber)">${fmt(paieChauffeurs.reduce((s,p)=>s+p.salaireBrut,0))} FCFA</td>
          <td style="color:var(--green)">${fmt(totalSalaires)} FCFA</td>
        </tr>
        </tbody>
      </table></div>`:'<div style="color:var(--text2);font-size:13px">Aucun chauffeur avec système de versement</div>'}

      <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="exportRapportTransportPdf('${b.id}','${b.nom.replace(/'/g,"\\'")}')">📄 Exporter PDF</button>
    </div>`).join('')}`;

  window._rtRows=rows;
  window._rtMoisLabel=moisLabel;
}

async function exportRapportTransportPdf(boutiqueId, boutiqueNom) {
  const row=window._rtRows?.find(r=>r.b.id===boutiqueId);
  if(!row) return;
  const moisLabel=window._rtMoisLabel||'';
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Transport</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px;color:#1a1d2e}
  h1{color:#B87333}h2{font-size:13px;border-bottom:1px solid #B87333;padding-bottom:4px;margin-top:16px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#B87333;color:#fff;padding:5px 6px;text-align:left}
  td{padding:4px 6px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .total td{font-weight:bold;background:#e8e8ff}
  .green{color:#16a060}.red{color:#e03545}.amber{color:#d97706}
  </style></head><body>
  <h1>🚌 Rapport Transport — ${boutiqueNom}</h1>
  <p><b>Période :</b> ${moisLabel} | <b>Généré le :</b> ${now}</p>
  <h2>Résumé financier</h2>
  <table><thead><tr><th>Indicateur</th><th>Montant</th></tr></thead>
  <tbody>
    <tr><td>Total attendu</td><td>${fmt(row.totalAttendu)} FCFA</td></tr>
    <tr><td class="green">Total versé</td><td class="green"><b>${fmt(row.totalVerse)} FCFA</b></td></tr>
    <tr><td class="red">Total dettes</td><td class="red">${fmt(row.totalDettes)} FCFA</td></tr>
    <tr><td class="amber">Total salaires nets</td><td class="amber"><b>${fmt(row.totalSalaires)} FCFA</b></td></tr>
    <tr><td>⛽ Carburant</td><td>${fmt(row.coutCarburant)} FCFA</td></tr>
    <tr><td>🔧 Réparations</td><td>${fmt(row.coutReparations)} FCFA</td></tr>
  </tbody></table>
  <h2>Détail chauffeurs</h2>
  <table><thead><tr><th>Chauffeur</th><th>%</th><th>Jours</th><th>Pannes</th><th>Attendu</th><th>Versé</th><th>Dette</th><th>Salaire net</th></tr></thead>
  <tbody>${row.paieChauffeurs.map(p=>`<tr>
    <td><b>${p.e.nom}</b></td><td>${p.e.pourcentage_salaire}%</td>
    <td>${p.joursNormaux}j</td><td>${p.pannes+p.demiPannes}j</td>
    <td>${fmt(p.attenduTotal)} FCFA</td>
    <td class="green">${fmt(p.verseTotal)} FCFA</td>
    <td class="${p.detteTotal>0?'red':''}">${fmt(p.detteTotal)} FCFA</td>
    <td class="green"><b>${fmt(p.salaireNet)} FCFA</b></td>
  </tr>`).join('')}
  <tr class="total"><td colspan="4">TOTAL</td>
    <td>${fmt(row.totalAttendu)} FCFA</td>
    <td class="green">${fmt(row.totalVerse)} FCFA</td>
    <td class="red">${fmt(row.totalDettes)} FCFA</td>
    <td class="green">${fmt(row.totalSalaires)} FCFA</td>
  </tr></tbody></table>
  <p style="margin-top:20px;font-size:10px;color:#999;border-top:1px solid #ccc;padding-top:8px">Nance Group — ${now}</p>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}
