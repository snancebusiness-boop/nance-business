// Nance Group — module caisse
// ===================== RECETTES =====================
async function renderRecettes() {
  const today = new Date().toISOString().split('T')[0];
  const {data} = await sb.from('recettes').select('*').eq('boutique_id',currentBoutique.id).eq('date',today).order('created_at',{ascending:false});
  const total=(data||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const modes={};
  (data||[]).forEach(r=>{modes[r.mode_paiement]=(modes[r.mode_paiement]||0)+parseFloat(r.montant);});
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-title">Ajouter une entrée</div>
      <div class="form-row">
        <div><label class="inp-label">Description</label><input class="inp" id="rec-desc" placeholder="Ex: Vente chaussures..."></div>
        <div><label class="inp-label">Montant (FCFA)</label><input class="inp" id="rec-mont" type="number" placeholder="0"></div>
        <div><label class="inp-label">Mode de paiement</label>
          <select class="inp" id="rec-mode">
            <option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option>
            <option value="carte">Carte bancaire</option><option value="virement">Virement</option><option value="autre">Autre</option>
          </select>
        </div>
        <div><label class="inp-label">Date</label><input class="inp" id="rec-date" type="date" value="${today}"></div>
      </div>
      <button class="btn btn-accent" onclick="addRecette()">+ Enregistrer</button>
    </div>
    <div class="card">
      <div class="card-title">Entrées d'aujourd'hui — ${today}</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucune recette enregistrée aujourd\'hui</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Description</th><th>Mode</th><th>Date</th><th>Montant</th><th></th></tr></thead>
        <tbody>${(data||[]).map(r=>`<tr>
          <td>${r.description}</td>
          <td><span class="badge badge-accent">${r.mode_paiement}</span></td>
          <td style="color:var(--text2)">${r.date}</td>
          <td class="green" style="font-weight:700">${fmt(r.montant)} FCFA</td>
          <td><button class="btn btn-red btn-sm" onclick="delRecette('${r.id}')">✕</button></td>
        </tr>`).join('')}</tbody>
      </table></div>`}
      <div class="recette-total">
        <div><div style="font-size:12px;color:var(--text2)">Total du jour</div>${Object.entries(modes).map(([m,v])=>`<div style="font-size:11px;color:var(--text2)">${m}: ${fmt(v)} FCFA</div>`).join('')}</div>
        <div style="font-size:22px;font-weight:800;color:var(--green)">${fmt(total)} FCFA</div>
      </div>
    </div>`;
}

async function addRecette() {
  const desc=document.getElementById('rec-desc').value.trim();
  const mont=parseFloat(document.getElementById('rec-mont').value);
  const mode=document.getElementById('rec-mode').value;
  const date=document.getElementById('rec-date').value;
  if(!desc||!mont) return notif('Remplissez tous les champs','error');
  const {error}=await sb.from('recettes').insert({boutique_id:currentBoutique.id,description:desc,montant:mont,mode_paiement:mode,date});
  if(error) return notif('Erreur: '+error.message,'error');
  await logNotifPdg('recette_ajoutee','💰',`Nouvelle recette : ${fmt(mont)} FCFA — "${desc}"`);
  notif('Recette enregistrée ✓','success'); renderRecettes();
}

async function delRecette(id) {
  if(!confirm('Supprimer cette recette ? (récupérable dans la corbeille)')) return;
  const {data:r}=await sb.from('recettes').select('*').eq('id',id).single();
  await sb.from('corbeille').insert({type:'recette',boutique_id:currentBoutique.id,boutique_nom:currentBoutique.nom,donnees:JSON.stringify(r),supprime_par:currentUser.nom_complet||currentUser.role,expire_le:new Date(Date.now()+30*86400000).toISOString()});
  await sb.from('recettes').delete().eq('id',id);
  if(r) await logNotifPdg('recette_supprimee','💰',`Recette supprimée : ${fmt(r.montant)} FCFA${r.description?' — "'+r.description+'"':''}`);
  renderRecettes();
}

// ===================== HISTORIQUE =====================
async function renderHistorique() {
  const today = new Date().toISOString().split('T')[0];
  const moisCourant = today.substring(0,7);
  const {data:recettes} = await sb.from('recettes').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}).order('created_at',{ascending:false});
  const {data:depenses} = await sb.from('depenses').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false});

  // Stats rapides
  const totalRec=(recettes||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const totalDep=(depenses||[]).reduce((s,d)=>s+parseFloat(d.montant),0);

  document.getElementById('content').innerHTML = `
    <!-- Filtres avancés -->
    <div class="card">
      <div class="card-title">🔍 Filtres avancés</div>
      <div class="form-row">
        <div>
          <label class="inp-label">Période rapide</label>
          <select class="inp" id="hist-periode" onchange="appliquerPeriode()">
            <option value="">Choisir...</option>
            <option value="aujourd_hui">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="mois_dernier">Mois dernier</option>
            <option value="personnalise">Personnalisé</option>
          </select>
        </div>
        <div id="hist-date-debut-wrap">
          <label class="inp-label">Date début</label>
          <input class="inp" id="hist-date-debut" type="date">
        </div>
        <div id="hist-date-fin-wrap">
          <label class="inp-label">Date fin</label>
          <input class="inp" id="hist-date-fin" type="date" value="${today}">
        </div>
        <div>
          <label class="inp-label">Type</label>
          <select class="inp" id="hist-type">
            <option value="tout">Tout</option>
            <option value="recettes">💰 Recettes uniquement</option>
            <option value="depenses">💸 Dépenses uniquement</option>
          </select>
        </div>
        <div>
          <label class="inp-label">Mode paiement</label>
          <select class="inp" id="hist-mode">
            <option value="">Tous</option>
            <option value="espèces">Espèces</option>
            <option value="mobile">Mobile Money</option>
            <option value="virement">Virement</option>
            <option value="carte">Carte</option>
          </select>
        </div>
        <div>
          <label class="inp-label">Montant min (FCFA)</label>
          <input class="inp" id="hist-min" type="number" placeholder="0">
        </div>
        <div>
          <label class="inp-label">Montant max (FCFA)</label>
          <input class="inp" id="hist-max" type="number" placeholder="Illimité">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-accent" onclick="filtrerHistorique()">🔍 Filtrer</button>
        <button class="btn btn-ghost" onclick="resetFiltres()">↺ Réinitialiser</button>
        <button class="btn btn-ghost btn-sm" onclick="exportHistoriquePdf()">📄 Exporter PDF</button>
      </div>
    </div>

    <!-- Résultats -->
    <div id="hist-results">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">💰 Total recettes</div><div class="stat-value green">${fmt(totalRec)}</div><div class="stat-sub">FCFA</div></div>
        <div class="stat-card"><div class="stat-label">💸 Total dépenses</div><div class="stat-value red">${fmt(totalDep)}</div><div class="stat-sub">FCFA</div></div>
        <div class="stat-card"><div class="stat-label">📊 Solde</div><div class="stat-value ${totalRec-totalDep>=0?'green':'red'}">${fmt(totalRec-totalDep)}</div><div class="stat-sub">FCFA</div></div>
        <div class="stat-card"><div class="stat-label">📝 Transactions</div><div class="stat-value accent">${(recettes||[]).length+(depenses||[]).length}</div><div class="stat-sub">au total</div></div>
      </div>
      ${afficherResultatsHistorique(recettes||[], depenses||[], '', '', 'tout', '', null, null)}
    </div>`;

  // Stocker les données pour les filtres
  window._histRecettes=recettes||[];
  window._histDepenses=depenses||[];
}

function appliquerPeriode() {
  const periode=document.getElementById('hist-periode').value;
  const today=new Date().toISOString().split('T')[0];
  let debut='', fin=today;
  if(periode==='aujourd_hui'){ debut=today; fin=today; }
  else if(periode==='semaine'){
    const d=new Date(); d.setDate(d.getDate()-d.getDay()+1);
    debut=d.toISOString().split('T')[0];
  }
  else if(periode==='mois'){ debut=today.substring(0,7)+'-01'; }
  else if(periode==='mois_dernier'){
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1);
    debut=d.toISOString().split('T')[0].substring(0,7)+'-01';
    const fin2=new Date(d.getFullYear(),d.getMonth()+1,0);
    fin=fin2.toISOString().split('T')[0];
  }
  document.getElementById('hist-date-debut').value=debut;
  document.getElementById('hist-date-fin').value=fin;
  if(periode&&periode!=='personnalise') filtrerHistorique();
}

function filtrerHistorique() {
  const debut=document.getElementById('hist-date-debut').value;
  const fin=document.getElementById('hist-date-fin').value;
  const type=document.getElementById('hist-type').value;
  const mode=document.getElementById('hist-mode').value;
  const min=parseFloat(document.getElementById('hist-min').value)||null;
  const max=parseFloat(document.getElementById('hist-max').value)||null;
  document.getElementById('hist-results').innerHTML=afficherResultatsHistorique(
    window._histRecettes||[], window._histDepenses||[], debut, fin, type, mode, min, max
  );
}

function resetFiltres() {
  document.getElementById('hist-periode').value='';
  document.getElementById('hist-date-debut').value='';
  document.getElementById('hist-date-fin').value=new Date().toISOString().split('T')[0];
  document.getElementById('hist-type').value='tout';
  document.getElementById('hist-mode').value='';
  document.getElementById('hist-min').value='';
  document.getElementById('hist-max').value='';
  filtrerHistorique();
}

function afficherResultatsHistorique(recettes, depenses, debut, fin, type, mode, min, max) {
  // Filtrer recettes
  let rec=type==='depenses'?[]:recettes.filter(r=>{
    if(debut&&r.date<debut) return false;
    if(fin&&r.date>fin) return false;
    if(mode&&r.mode_paiement!==mode) return false;
    if(min!==null&&parseFloat(r.montant)<min) return false;
    if(max!==null&&parseFloat(r.montant)>max) return false;
    return true;
  });
  // Filtrer dépenses
  let dep=type==='recettes'?[]:depenses.filter(d=>{
    if(debut&&d.date<debut) return false;
    if(fin&&d.date>fin) return false;
    if(min!==null&&parseFloat(d.montant)<min) return false;
    if(max!==null&&parseFloat(d.montant)>max) return false;
    return true;
  });

  const totalRec=rec.reduce((s,r)=>s+parseFloat(r.montant),0);
  const totalDep=dep.reduce((s,d)=>s+parseFloat(d.montant),0);

  // Grouper par date
  const byDate={};
  rec.forEach(r=>{ if(!byDate[r.date])byDate[r.date]={rec:[],dep:[]}; byDate[r.date].rec.push(r); });
  dep.forEach(d=>{ if(!byDate[d.date])byDate[d.date]={rec:[],dep:[]}; byDate[d.date].dep.push(d); });
  const dates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💰 Recettes filtrées</div><div class="stat-value green">${fmt(totalRec)}</div><div class="stat-sub">${rec.length} transaction(s)</div></div>
      <div class="stat-card"><div class="stat-label">💸 Dépenses filtrées</div><div class="stat-value red">${fmt(totalDep)}</div><div class="stat-sub">${dep.length} transaction(s)</div></div>
      <div class="stat-card"><div class="stat-label">📊 Solde filtré</div><div class="stat-value ${totalRec-totalDep>=0?'green':'red'}">${fmt(totalRec-totalDep)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">📝 Transactions</div><div class="stat-value accent">${rec.length+dep.length}</div><div class="stat-sub">résultats</div></div>
    </div>
    ${dates.length===0?'<div class="card"><div class="empty-state"><p>Aucun résultat pour ces filtres</p></div></div>':
    dates.map(date=>{
      const items=byDate[date];
      const totR=items.rec.reduce((s,r)=>s+parseFloat(r.montant),0);
      const totD=items.dep.reduce((s,d)=>s+parseFloat(d.montant),0);
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
          <div style="font-size:14px;font-weight:700">${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
          <div style="display:flex;gap:8px">
            ${totR>0?`<span class="badge badge-green">+${fmt(totR)} FCFA</span>`:''}
            ${totD>0?`<span class="badge badge-red">-${fmt(totD)} FCFA</span>`:''}
            <span class="badge badge-accent">Solde: ${fmt(totR-totD)} FCFA</span>
          </div>
        </div>
        ${items.rec.length>0?`
        <div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:6px">💰 RECETTES</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Description</th><th>Mode</th><th>Montant</th></tr></thead>
          <tbody>${items.rec.map(r=>`<tr>
            <td>${r.description}</td>
            <td><span class="badge badge-accent">${r.mode_paiement}</span></td>
            <td class="green" style="font-weight:600">${fmt(r.montant)} FCFA</td>
          </tr>`).join('')}</tbody>
        </table></div>`:''}
        ${items.dep.length>0?`
        <div style="font-size:12px;font-weight:700;color:var(--red);margin-top:${items.rec.length>0?'12px':'0'};margin-bottom:6px">💸 DÉPENSES</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
          <tbody>${items.dep.map(d=>`<tr>
            <td>${d.description}</td>
            <td><span class="badge badge-amber">${d.categorie}</span></td>
            <td class="red" style="font-weight:600">${fmt(d.montant)} FCFA</td>
          </tr>`).join('')}</tbody>
        </table></div>`:''}
      </div>`;
    }).join('')}`;
}

async function exportHistoriquePdf() {
  const debut=document.getElementById('hist-date-debut').value;
  const fin=document.getElementById('hist-date-fin').value;
  const type=document.getElementById('hist-type').value;
  const rec=(window._histRecettes||[]).filter(r=>(!debut||r.date>=debut)&&(!fin||r.date<=fin));
  const dep=(window._histDepenses||[]).filter(d=>(!debut||d.date>=debut)&&(!fin||d.date<=fin));
  const totalRec=rec.reduce((s,r)=>s+parseFloat(r.montant),0);
  const totalDep=dep.reduce((s,d)=>s+parseFloat(d.montant),0);
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Historique</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#1a1d2e}
  h1{color:#B87333}table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#B87333;color:#fff;padding:6px 8px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .green{color:#16a060}.red{color:#e03545}.total{font-weight:bold;background:#e8e8ff}
  </style></head><body>
  <h1>📅 Historique — ${currentBoutique?.nom||''}</h1>
  <p>${debut?'Du '+debut:''} ${fin?'au '+fin:''} | Généré le ${now}</p>
  ${type!=='depenses'&&rec.length>0?`<h2>💰 Recettes (${rec.length})</h2>
  <table><thead><tr><th>Date</th><th>Description</th><th>Mode</th><th>Montant</th></tr></thead>
  <tbody>${rec.map(r=>`<tr><td>${r.date}</td><td>${r.description}</td><td>${r.mode_paiement}</td><td class="green">${fmt(r.montant)} FCFA</td></tr>`).join('')}
  <tr class="total"><td colspan="3">TOTAL</td><td class="green">${fmt(totalRec)} FCFA</td></tr></tbody></table>`:''}
  ${type!=='recettes'&&dep.length>0?`<h2>💸 Dépenses (${dep.length})</h2>
  <table><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
  <tbody>${dep.map(d=>`<tr><td>${d.date}</td><td>${d.description}</td><td>${d.categorie}</td><td class="red">${fmt(d.montant)} FCFA</td></tr>`).join('')}
  <tr class="total"><td colspan="3">TOTAL</td><td class="red">${fmt(totalDep)} FCFA</td></tr></tbody></table>`:''}
  <p style="margin-top:20px;font-size:11px;color:#999;border-top:1px solid #ccc;padding-top:8px">Nance Group — ${now}</p>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

// ===================== DEPENSES =====================
async function renderDepenses() {
  const today=new Date().toISOString().split('T')[0];
  const {data}=await sb.from('depenses').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}).order('created_at',{ascending:false});
  const total=(data||[]).reduce((s,d)=>s+parseFloat(d.montant),0);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">Ajouter une dépense</div>
      <div class="form-row">
        <div><label class="inp-label">Description</label><input class="inp" id="dep-desc" placeholder="Ex: Loyer, fournitures..."></div>
        <div><label class="inp-label">Montant (FCFA)</label><input class="inp" id="dep-mont" type="number" placeholder="0"></div>
        <div><label class="inp-label">Catégorie</label>
          <select class="inp" id="dep-cat">
            <option value="loyer">Loyer</option><option value="salaires">Salaires</option>
            <option value="fournitures">Fournitures</option><option value="transport">Transport</option>
            <option value="electricite">Électricité</option><option value="autre">Autre</option>
          </select>
        </div>
        <div><label class="inp-label">Date</label><input class="inp" id="dep-date" type="date" value="${today}"></div>
      </div>
      <button class="btn btn-accent" onclick="addDepense()">+ Enregistrer</button>
    </div>
    <div class="card">
      <div class="card-title">Toutes les dépenses</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucune dépense enregistrée</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Description</th><th>Catégorie</th><th>Date</th><th>Montant</th><th></th></tr></thead>
        <tbody>${(data||[]).map(d=>`<tr>
          <td>${d.description}</td>
          <td><span class="badge badge-amber">${d.categorie}</span></td>
          <td style="color:var(--text2)">${d.date}</td>
          <td class="red" style="font-weight:700">${fmt(d.montant)} FCFA</td>
          <td><button class="btn btn-red btn-sm" onclick="delDepense('${d.id}')">✕</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="recette-total">
        <div style="font-size:12px;color:var(--text2)">Total des dépenses</div>
        <div style="font-size:20px;font-weight:800;color:var(--red)">${fmt(total)} FCFA</div>
      </div>`}
    </div>`;
}

async function addDepense() {
  const desc=document.getElementById('dep-desc').value.trim();
  const mont=parseFloat(document.getElementById('dep-mont').value);
  const cat=document.getElementById('dep-cat').value;
  const date=document.getElementById('dep-date').value;
  if(!desc||!mont) return notif('Remplissez tous les champs','error');
  await sb.from('depenses').insert({boutique_id:currentBoutique.id,description:desc,montant:mont,categorie:cat,date});
  await logNotifPdg('depense_ajoutee','💸',`Nouvelle dépense : ${fmt(mont)} FCFA — "${desc}" (${cat})`);
  notif('Dépense enregistrée ✓','success'); renderDepenses();
}

async function delDepense(id) {
  if(!confirm('Supprimer cette dépense ?')) return;
  const {data:d}=await sb.from('depenses').select('montant,description').eq('id',id).single();
  await sb.from('depenses').delete().eq('id',id);
  if(d) await logNotifPdg('depense_supprimee','💸',`Dépense supprimée : ${fmt(d.montant)} FCFA${d.description?' — "'+d.description+'"':''}`);
  renderDepenses();
}
