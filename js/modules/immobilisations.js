// Nance Group — module immobilisations
// ===================== IMMOBILISATIONS =====================
async function renderImmobilisations() {
  const {data}=await sb.from('immobilisations').select('*').eq('boutique_id',currentBoutique.id).order('designation');
  const isPdg=currentUser.role==='pdg';
  const isSuperviseur=currentUser.role==='superviseur';
  const canEdit=isPdg||isSuperviseur;
  const canEditPrix=isPdg;

  // Calculs PDG - tenant compte de la quantité
  const totalValeur=(data||[]).reduce((s,im)=>s+((im.prix_achat||0)*(im.quantite||1)),0);
  const totalAmortMensuel=(data||[]).reduce((s,im)=>{
    if(im.prix_achat&&im.duree_amortissement>0){
      const moisEcoules=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
      if(moisEcoules<im.duree_amortissement) return s+((im.prix_achat*(im.quantite||1))/im.duree_amortissement);
    }
    return s;
  },0);
  const nbAmortiesTotal=(data||[]).filter(im=>{
    const moisEcoules=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
    return moisEcoules>=(im.duree_amortissement||0);
  }).length;

  document.getElementById('content').innerHTML=`
    ${isPdg?`<div class="stats-grid">
      <div class="stat-card"><div class="stat-label">🏗 Nombre d'immobilisations</div><div class="stat-value accent">${(data||[]).length}</div><div class="stat-sub">désignations enregistrées</div></div>
      <div class="stat-card"><div class="stat-label">💰 Valeur totale</div><div class="stat-value amber">${fmt(totalValeur)}</div><div class="stat-sub">FCFA (prix d'achat)</div></div>
      <div class="stat-card"><div class="stat-label">📉 Amortissement mensuel 🔒</div><div class="stat-value red">${fmt(Math.round(totalAmortMensuel))}</div><div class="stat-sub">FCFA à déduire ce mois</div></div>
      <div class="stat-card"><div class="stat-label">✅ Totalement amorties</div><div class="stat-value green">${nbAmortiesTotal}</div><div class="stat-sub">immobilisations soldées</div></div>
    </div>`:''}
    <div class="card">
      ${canEdit?`<div class="card-title">Ajouter une immobilisation</div>
      <div class="form-row">
        <div><label class="inp-label">Désignation</label><input class="inp" id="immo-des" placeholder="Ex: Réfrigérateur, Meuble..."></div>
        <div><label class="inp-label">Catégorie</label>
          <select class="inp" id="immo-cat">
            <option value="mobilier">Mobilier</option><option value="materiel">Matériel</option>
            <option value="vehicule">Véhicule</option><option value="informatique">Informatique</option>
            <option value="batiment">Bâtiment</option><option value="autre">Autre</option>
          </select>
        </div>
        ${canEditPrix?`<div><label class="inp-label">Prix d'achat (FCFA) 🔒 PDG</label><input class="inp" id="immo-pa" type="number" placeholder="0"></div>`:''}
        <div><label class="inp-label">Quantité</label><input class="inp" id="immo-qte" type="number" placeholder="1" value="1" min="1"></div>
        <div><label class="inp-label">Date acquisition</label><input class="inp" id="immo-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div><label class="inp-label">Durée amortissement (mois)</label><input class="inp" id="immo-amort" type="number" placeholder="60"></div>
        <div><label class="inp-label">État</label>
          <select class="inp" id="immo-etat">
            <option value="bon">Bon état</option><option value="moyen">État moyen</option><option value="mauvais">Mauvais état</option>
          </select>
        </div>
      </div>
      <button class="btn btn-accent" onclick="addImmobilisation()">+ Ajouter</button>`
      :'<div style="color:var(--text2);font-size:13px">🔒 Consultation uniquement</div>'}
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:0">Registre des immobilisations (${(data||[]).length} désignations)</div>
        ${isSuperviseur?`<button class="btn btn-ghost btn-sm" onclick="renderImmobilisations()">🔄 Actualiser</button>`:''}
      </div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucune immobilisation enregistrée</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Désignation</th><th>Qté</th><th>Catégorie</th>${canEditPrix?'<th>Prix achat</th>':''}<th>Date achat</th><th>Amortissement</th>${isPdg?'<th>Amort./mois 🔒</th>':''}<th>État</th>${canEdit?'<th>Actions</th>':''}</tr></thead>
        <tbody>${(data||[]).map(im=>{
          const moisEcoules=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
          const pct=im.duree_amortissement>0?Math.min(100,Math.round((moisEcoules/im.duree_amortissement)*100)):0;
          const amortMensuel=im.prix_achat&&im.duree_amortissement>0?Math.round((im.prix_achat*(im.quantite||1))/im.duree_amortissement):0;
          const estAmorties=moisEcoules>=(im.duree_amortissement||0);
          return `<tr>
            <td style="font-weight:600">${im.designation}</td>
            <td style="font-weight:700;color:var(--accent);text-align:center">${im.quantite||1}</td>
            <td><span class="badge badge-accent">${im.categorie}</span></td>
            ${canEditPrix?`<td style="color:var(--amber);font-weight:600">
              ${fmt(im.prix_achat||0)} FCFA
              ${(im.quantite||1)>1?`<div style="font-size:10px;color:var(--text2)">Total: ${fmt((im.prix_achat||0)*(im.quantite||1))} FCFA</div>`:''}
            </td>`:''}
            <td style="color:var(--text2)">${im.date_acquisition||'-'}</td>
            <td>
              <div style="font-size:12px;color:var(--text2);margin-bottom:3px">${pct}% (${moisEcoules}/${im.duree_amortissement||'?'} mois)</div>
              <div style="background:var(--bg3);border-radius:4px;height:6px;width:120px">
                <div style="background:${pct>=100?'var(--red)':pct>60?'var(--amber)':'var(--green)'};height:6px;border-radius:4px;width:${pct}%"></div>
              </div>
            </td>
            ${isPdg?`<td style="font-weight:700;color:${estAmorties?'var(--green)':'var(--red)'}">
              ${estAmorties?'✅ Soldée':`${fmt(amortMensuel)} FCFA`}
            </td>`:''}
            <td><span class="badge ${im.etat==='bon'?'badge-green':im.etat==='moyen'?'badge-amber':'badge-red'}">${im.etat||'bon'}</span></td>
            ${canEdit?`<td style="display:flex;gap:4px">
              <button class="btn btn-amber btn-sm" onclick="editImmo('${im.id}','${im.designation.replace(/'/g,"\\'")}','${im.categorie}',${im.prix_achat||0},'${im.date_acquisition}',${im.duree_amortissement||0},'${im.etat||'bon'}')">✏️</button>
              ${isPdg?`<button class="btn btn-red btn-sm" onclick="delImmo('${im.id}')">✕</button>`:''}
            </td>`:''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;
}

async function addImmobilisation() {
  const des=document.getElementById('immo-des').value.trim();
  const cat=document.getElementById('immo-cat').value;
  const pa=parseFloat(document.getElementById('immo-pa')?.value)||0;
  const qte=parseInt(document.getElementById('immo-qte')?.value)||1;
  const date=document.getElementById('immo-date').value;
  const amort=parseInt(document.getElementById('immo-amort').value)||0;
  const etat=document.getElementById('immo-etat').value;
  if(!des) return notif('Entrez la désignation','error');
  await sb.from('immobilisations').insert({boutique_id:currentBoutique.id,designation:des,categorie:cat,prix_achat:pa,quantite:qte,date_acquisition:date,duree_amortissement:amort,etat});
  notif('Immobilisation ajoutée ✓','success'); renderImmobilisations();
}

function editImmo(id,des,cat,pa,date,amort,etat) {
  const isPdg=currentUser.role==='pdg';
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">✏️ Modifier l'immobilisation</div>
    <div class="form-row">
      <div><label class="inp-label">Désignation</label><input class="inp" id="ei-des" value="${des}"></div>
      <div><label class="inp-label">Quantité</label><input class="inp" id="ei-qte" type="number" value="${arguments[7]||1}" min="1"></div>
      <div><label class="inp-label">Catégorie</label>
        <select class="inp" id="ei-cat">
          <option value="mobilier" ${cat==='mobilier'?'selected':''}>Mobilier</option>
          <option value="materiel" ${cat==='materiel'?'selected':''}>Matériel</option>
          <option value="vehicule" ${cat==='vehicule'?'selected':''}>Véhicule</option>
          <option value="informatique" ${cat==='informatique'?'selected':''}>Informatique</option>
          <option value="batiment" ${cat==='batiment'?'selected':''}>Bâtiment</option>
          <option value="autre" ${cat==='autre'?'selected':''}>Autre</option>
        </select>
      </div>
      ${isPdg?`<div><label class="inp-label">Prix d'achat 🔒 PDG</label><input class="inp" id="ei-pa" type="number" value="${pa}"></div>`:`<input type="hidden" id="ei-pa" value="${pa}">`}
      <div><label class="inp-label">Date acquisition</label><input class="inp" id="ei-date" type="date" value="${date}"></div>
      <div><label class="inp-label">Amortissement (mois)</label><input class="inp" id="ei-amort" type="number" value="${amort}"></div>
      <div><label class="inp-label">État</label>
        <select class="inp" id="ei-etat">
          <option value="bon" ${etat==='bon'?'selected':''}>Bon état</option>
          <option value="moyen" ${etat==='moyen'?'selected':''}>État moyen</option>
          <option value="mauvais" ${etat==='mauvais'?'selected':''}>Mauvais état</option>
        </select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveImmo('${id}','${des.replace(/'/g,"\\'")}',${pa},'${etat}')">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function saveImmo(id,oldDes,oldPa,oldEtat) {
  const des=document.getElementById('ei-des').value.trim();
  const cat=document.getElementById('ei-cat').value;
  const pa=parseFloat(document.getElementById('ei-pa').value)||0;
  const qte=parseInt(document.getElementById('ei-qte').value)||1;
  const date=document.getElementById('ei-date').value;
  const amort=parseInt(document.getElementById('ei-amort').value)||0;
  const etat=document.getElementById('ei-etat').value;
  await sb.from('immobilisations').update({designation:des,categorie:cat,prix_achat:pa,quantite:qte,date_acquisition:date,duree_amortissement:amort,etat}).eq('id',id);
  // Log superviseur modifications
  if(currentUser.role==='superviseur'){
    const changes=[];
    if(des!==oldDes) changes.push(`Désignation: "${oldDes}" → "${des}"`);
    if(etat!==oldEtat) changes.push(`État: "${oldEtat}" → "${etat}"`);
    if(changes.length>0){
      await sb.from('notifs_pdg').insert({
        type:'immo_modifie',
        boutique_id:currentBoutique?.id||null,
        boutique_nom:currentBoutique?.nom||'Global',
        auteur:'Superviseur',
        message:`Immobilisation modifiée — ${changes.join(' | ')}`,
        details:JSON.stringify({ancien:{designation:oldDes,etat:oldEtat},nouveau:{designation:des,etat}}),
        lu:false
      });
    }
  }
  document.querySelector('.modal-overlay').remove();
  notif('Immobilisation modifiée ✓','success'); renderImmobilisations();
}

async function delImmo(id) {
  if(!confirm('Supprimer cette immobilisation ?')) return;
  await sb.from('immobilisations').delete().eq('id',id); renderImmobilisations();
}

// Vue globale immobilisations (PDG + Superviseur)
async function showImmoGlobal() {
  currentView='immo_global'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Immobilisations — Toutes les boutiques';
  document.getElementById('topbar-boutique').textContent='Vue globale';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const isSuperviseur=currentUser.role==='superviseur';
  const isPdg=currentUser.role==='pdg';
  const rows=await Promise.all(boutiques.map(async b=>{
    const {data}=await sb.from('immobilisations').select('*').eq('boutique_id',b.id).order('designation');
    return {b,items:data||[]};
  }));
  const totalValeur=rows.reduce((s,{items})=>s+items.reduce((ss,i)=>ss+(i.prix_achat||0),0),0);
  document.getElementById('content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      ${isPdg?`<div class="stat-card" style="flex:1;margin-right:12px"><div class="stat-label">Valeur totale immobilisations</div><div class="stat-value amber">${fmt(totalValeur)} FCFA</div></div>`:''}
      ${isSuperviseur?`<button class="btn btn-ghost" onclick="showImmoGlobal()">🔄 Actualiser</button>`:''}
    </div>
    ${rows.map(({b,items})=>`
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
        <div style="font-size:14px;font-weight:700">${b.nom}</div>
        <span class="badge badge-accent">${items.length} immobilisation(s)</span>
        ${isPdg?`<span class="badge badge-amber" style="margin-left:auto">${fmt(items.reduce((s,i)=>s+(i.prix_achat||0),0))} FCFA</span>`:''}
      </div>
      ${items.length===0?'<div style="color:var(--text2);font-size:13px">Aucune immobilisation</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Désignation</th><th>Catégorie</th>${isPdg?'<th>Prix achat</th>':''}<th>Date achat</th><th>État</th><th>Amortissement</th></tr></thead>
        <tbody>${items.map(im=>{
          const moisEcoules=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
          const pct=im.duree_amortissement>0?Math.min(100,Math.round((moisEcoules/im.duree_amortissement)*100)):0;
          return `<tr>
            <td style="font-weight:600">${im.designation}</td>
            <td><span class="badge badge-accent">${im.categorie}</span></td>
            ${isPdg?`<td style="color:var(--amber);font-weight:600">${fmt(im.prix_achat||0)} FCFA</td>`:''}
            <td style="color:var(--text2)">${im.date_acquisition||'-'}</td>
            <td><span class="badge ${im.etat==='bon'?'badge-green':im.etat==='moyen'?'badge-amber':'badge-red'}">${im.etat||'bon'}</span></td>
            <td>
              <div style="font-size:11px;color:var(--text2)">${pct}%</div>
              <div style="background:var(--bg3);border-radius:4px;height:5px;width:80px;margin-top:2px">
                <div style="background:${pct>=100?'var(--red)':pct>60?'var(--amber)':'var(--green)'};height:5px;border-radius:4px;width:${pct}%"></div>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`).join('')}`;
}
