// Nance Group — module stocks
// ===================== STOCKS =====================
async function renderStocks() {
  const {data}=await sb.from('stocks').select('*').eq('boutique_id',currentBoutique.id).order('produit');
  const isPdg=currentUser.role==='pdg';

  // Produits en alerte (quantité <= stock minimum)
  const enAlerte=(data||[]).filter(p=>p.stock_minimum>0&&p.quantite<=p.stock_minimum);

  document.getElementById('content').innerHTML=`
    ${enAlerte.length>0?`<div class="card" style="border:2px solid var(--red)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:20px">🚨</span>
        <div class="card-title" style="margin-bottom:0;color:var(--red)">${enAlerte.length} produit(s) en stock critique !</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${enAlerte.map(p=>`
        <div style="background:var(--red)11;border:1px solid var(--red)33;border-radius:8px;padding:10px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <span style="font-weight:700">${p.produit}</span>
            <span style="font-size:12px;color:var(--text2);margin-left:8px">Qté actuelle: <strong style="color:var(--red)">${p.quantite}</strong> / Min: ${p.stock_minimum}</span>
          </div>
          <span style="background:var(--red);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px">⚠️ RUPTURE</span>
        </div>`).join('')}
      </div>
    </div>`:''}
    <div class="card">
      <div class="card-title">Ajouter un produit</div>
      <div class="form-row">
        <div><label class="inp-label">Produit</label><input class="inp" id="stk-prod" placeholder="Nom du produit"></div>
        <div><label class="inp-label">Quantité</label><input class="inp" id="stk-qte" type="number" placeholder="0"></div>
        ${isPdg?`<div><label class="inp-label">Prix achat (FCFA) 🔒</label><input class="inp" id="stk-pa" type="number" placeholder="0"></div>`:`<input type="hidden" id="stk-pa" value="0">`}
        <div><label class="inp-label">Prix vente (FCFA)</label><input class="inp" id="stk-pv" type="number" placeholder="0"></div>
        <div><label class="inp-label">Durée (jours)</label><input class="inp" id="stk-dur" type="number" placeholder="0"></div>
        <div><label class="inp-label">🚨 Stock minimum</label><input class="inp" id="stk-min" type="number" placeholder="Ex: 5" value="0"></div>
      </div>
      <button class="btn btn-accent" onclick="addStock()">+ Ajouter</button>
    </div>
    <div class="card">
      <div class="card-title">Inventaire (${(data||[]).length} produits)</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucun produit en stock</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Produit</th><th>Qté</th><th>Min</th>${isPdg?'<th>Prix achat</th>':''}<th>Prix vente</th>${isPdg?'<th>Marge</th>':''}<th>Durée</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>${(data||[]).map(p=>{
          const marge=p.prix_vente-p.prix_achat;
          const pct=p.prix_achat>0?((marge/p.prix_achat)*100).toFixed(0):0;
          const estCritique=p.stock_minimum>0&&p.quantite<=p.stock_minimum;
          const estBas=p.stock_minimum>0&&p.quantite<=p.stock_minimum*1.5&&!estCritique;
          return `<tr style="${estCritique?'background:var(--red)08':''}">
            <td style="font-weight:600">${p.produit}</td>
            <td style="font-weight:700;color:${estCritique?'var(--red)':estBas?'var(--amber)':'var(--text)'}">${p.quantite}</td>
            <td style="color:var(--text2);font-size:12px">${p.stock_minimum||'-'}</td>
            ${isPdg?`<td>${fmt(p.prix_achat)} FCFA</td>`:''}
            <td>${fmt(p.prix_vente)} FCFA</td>
            ${isPdg?`<td class="${marge>=0?'green':'red'}" style="font-weight:600">${fmt(marge)} FCFA <span style="font-size:11px">(${pct}%)</span></td>`:''}
            <td style="color:var(--text2)">${p.duree_jours}j</td>
            <td>${estCritique?'<span class="badge badge-red">🚨 Critique</span>':estBas?'<span class="badge badge-amber">⚠️ Bas</span>':'<span class="badge badge-green">✅ OK</span>'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-amber btn-sm" onclick="editStock('${p.id}','${p.produit.replace(/'/g,"\\'")}',${p.quantite},${p.prix_achat},${p.prix_vente},${p.duree_jours},${p.stock_minimum||0})">✏️</button>
              <button class="btn btn-red btn-sm" onclick="delStock('${p.id}')">✕</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;

  // Vérifier et envoyer alertes si stock critique
  if(enAlerte.length>0){
    const stored=localStorage.getItem('last_stock_alerte_'+currentBoutique.id);
    const today=new Date().toISOString().split('T')[0];
    if(stored!==today){
      localStorage.setItem('last_stock_alerte_'+currentBoutique.id, today);
      await envoyerTelegram(`🚨 <b>Alerte stock — ${currentBoutique.nom}</b>\n\n${enAlerte.map(p=>`• ${p.produit} : ${p.quantite} restant(s) (min: ${p.stock_minimum})`).join('\n')}\n\n🕐 ${new Date().toLocaleString('fr-FR')}`);
    }
  }
}

async function addStock() {
  const prod=document.getElementById('stk-prod').value.trim();
  const qte=parseInt(document.getElementById('stk-qte').value)||0;
  const pa=parseFloat(document.getElementById('stk-pa').value)||0;
  const pv=parseFloat(document.getElementById('stk-pv').value)||0;
  const dur=parseInt(document.getElementById('stk-dur').value)||0;
  const min=parseInt(document.getElementById('stk-min').value)||0;
  if(!prod) return notif('Entrez le nom du produit','error');
  await sb.from('stocks').insert({boutique_id:currentBoutique.id,produit:prod,quantite:qte,prix_achat:pa,prix_vente:pv,duree_jours:dur,stock_minimum:min});
  await logNotifPdg('stock_ajoute','📦',`Nouveau produit ajouté : "${prod}" (qté: ${qte}, prix vente: ${fmt(pv)} FCFA)`);
  notif('Produit ajouté ✓','success'); renderStocks();
}

async function delStock(id) {
  if(!confirm('Supprimer ce produit ? (récupérable dans la corbeille pendant 30 jours)')) return;
  const {data:s}=await sb.from('stocks').select('*').eq('id',id).single();
  await sb.from('corbeille').insert({type:'stock',boutique_id:currentBoutique.id,boutique_nom:currentBoutique.nom,donnees:JSON.stringify(s),supprime_par:currentUser.nom_complet||currentUser.role,expire_le:new Date(Date.now()+30*86400000).toISOString()});
  await sb.from('stocks').delete().eq('id',id);
  if(s) await logNotifPdg('stock_supprime','🗑',`Produit supprimé : "${s.produit}" (qté: ${s.quantite}, prix vente: ${fmt(s.prix_vente)} FCFA)`);
  renderStocks();
}

function editStock(id,prod,qte,pa,pv,dur,min=0) {
  const isPdg=currentUser.role==='pdg';
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">Modifier le produit</div>
    <div class="form-row">
      <div><label class="inp-label">Produit</label><input class="inp" id="e-prod" value="${prod}"></div>
      <div><label class="inp-label">Quantité</label><input class="inp" id="e-qte" type="number" value="${qte}"></div>
      ${isPdg?`<div><label class="inp-label">Prix achat 🔒 PDG</label><input class="inp" id="e-pa" type="number" value="${pa}"></div>`:`<input type="hidden" id="e-pa" value="${pa}">`}
      <div><label class="inp-label">Prix vente</label><input class="inp" id="e-pv" type="number" value="${pv}"></div>
      <div><label class="inp-label">Durée (jours)</label><input class="inp" id="e-dur" type="number" value="${dur}"></div>
      <div><label class="inp-label">🚨 Stock minimum</label><input class="inp" id="e-min" type="number" value="${min}" placeholder="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveStock('${id}',${pa},${pv},'${prod.replace(/'/g,"\\'")}',${qte})">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function saveStock(id,oldPa,oldPv,oldProd,oldQte) {
  const prod=document.getElementById('e-prod').value.trim();
  const qte=parseInt(document.getElementById('e-qte').value)||0;
  const pa=parseFloat(document.getElementById('e-pa').value)||0;
  const pv=parseFloat(document.getElementById('e-pv').value)||0;
  const dur=parseInt(document.getElementById('e-dur').value)||0;
  const min=parseInt(document.getElementById('e-min')?.value)||0;
  await sb.from('stocks').update({produit:prod,quantite:qte,prix_achat:pa,prix_vente:pv,duree_jours:dur,stock_minimum:min,updated_at:new Date().toISOString()}).eq('id',id);

  // Log des changements de prix
  const prixChanges=[];
  if(pa!==oldPa) prixChanges.push({champ:'Prix achat',ancien:oldPa,nouveau:pa});
  if(pv!==oldPv) prixChanges.push({champ:'Prix vente',ancien:oldPv,nouveau:pv});
  if(prixChanges.length>0){
    await sb.from('prix_log').insert(prixChanges.map(c=>({
      boutique_id:currentBoutique.id,
      boutique_nom:currentBoutique.nom,
      produit:prod,
      stock_id:id,
      champ:c.champ,
      ancien_prix:c.ancien,
      nouveau_prix:c.nouveau,
      modifie_par:currentUser.nom_complet||currentUser.boutiques?.nom||currentUser.role,
      role_modificateur:currentUser.role,
    })));
  }

  // Log pour PDG
  if(currentUser.role!=='pdg'){
    const changes=[];
    if(prod!==oldProd) changes.push(`Produit: "${oldProd}" → "${prod}"`);
    if(qte!==oldQte) changes.push(`Quantité: ${oldQte} → ${qte}`);
    if(pv!==oldPv) changes.push(`Prix vente: ${fmt(oldPv)} → ${fmt(pv)} FCFA`);
    if(changes.length>0){
      await logNotifPdg('stock_modifie','📦',`Stock modifié — "${prod}" : ${changes.join(' | ')}`,
        {ancien:{produit:oldProd,quantite:oldQte,prix_vente:oldPv},nouveau:{produit:prod,quantite:qte,prix_vente:pv}});
    }
  }
  document.querySelector('.modal-overlay').remove();
  notif('Produit modifié ✓','success'); renderStocks();
}

// ===================== LOG DES PRIX =====================
async function showLogPrix() {
  currentView='logprix'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Journal des modifications de prix';
  document.getElementById('topbar-boutique').textContent='Historique complet';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const {data}=await sb.from('prix_log').select('*').order('created_at',{ascending:false}).limit(500);

  // Filtres
  const boutiquesOptions=boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('');

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">💹 Filtres</div>
      <div class="form-row">
        <div><label class="inp-label">Boutique</label>
          <select class="inp" id="lp-boutique" onchange="filtrerLogPrix()">
            <option value="">Toutes</option>${boutiquesOptions}
          </select>
        </div>
        <div><label class="inp-label">Produit</label>
          <input class="inp" id="lp-produit" placeholder="Nom du produit..." oninput="filtrerLogPrix()">
        </div>
        <div><label class="inp-label">Type de prix</label>
          <select class="inp" id="lp-champ" onchange="filtrerLogPrix()">
            <option value="">Tous</option>
            <option value="Prix vente">Prix vente</option>
            <option value="Prix achat">Prix achat</option>
          </select>
        </div>
        <div><label class="inp-label">Rôle modificateur</label>
          <select class="inp" id="lp-role" onchange="filtrerLogPrix()">
            <option value="">Tous</option>
            <option value="pdg">PDG</option>
            <option value="responsable">Responsable</option>
            <option value="superviseur">Superviseur</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">Journal (${(data||[]).length} modifications)</div>
        <button class="btn btn-ghost btn-sm" onclick="exportLogPrixPdf()">📄 Exporter PDF</button>
      </div>
      <div id="lp-results">
        ${renderLogPrixTable(data||[])}
      </div>
    </div>`;

  window._logPrixData=data||[];
}

function renderLogPrixTable(data) {
  if(data.length===0) return '<div class="empty-state"><p>Aucune modification de prix enregistrée</p></div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date & Heure</th><th>Boutique</th><th>Produit</th><th>Type</th><th>Ancien prix</th><th>Nouveau prix</th><th>Variation</th><th>Modifié par</th></tr></thead>
    <tbody>${data.map(l=>{
      const diff=l.nouveau_prix-l.ancien_prix;
      const pct=l.ancien_prix>0?Math.round((diff/l.ancien_prix)*100):0;
      const date=new Date(l.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      return `<tr>
        <td style="font-size:12px;color:var(--text2)">${date}</td>
        <td style="font-size:12px">${l.boutique_nom||'-'}</td>
        <td style="font-weight:700">${l.produit}</td>
        <td><span class="badge ${l.champ==='Prix vente'?'badge-accent':'badge-amber'}">${l.champ}</span></td>
        <td style="color:var(--text2)">${fmt(l.ancien_prix)} FCFA</td>
        <td style="font-weight:700">${fmt(l.nouveau_prix)} FCFA</td>
        <td style="color:${diff>=0?'var(--green)':'var(--red)'};font-weight:700">
          ${diff>=0?'+':''}${fmt(diff)} FCFA
          <span style="font-size:11px">(${pct>=0?'+':''}${pct}%)</span>
        </td>
        <td style="font-size:12px">
          <span class="badge ${l.role_modificateur==='pdg'?'badge-accent':l.role_modificateur==='superviseur'?'badge-amber':'badge-green'}">${l.modifie_par||l.role_modificateur}</span>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function filtrerLogPrix() {
  const boutique=document.getElementById('lp-boutique').value;
  const produit=document.getElementById('lp-produit').value.toLowerCase();
  const champ=document.getElementById('lp-champ').value;
  const role=document.getElementById('lp-role').value;
  const filtered=(window._logPrixData||[]).filter(l=>{
    if(boutique&&l.boutique_id!==boutique) return false;
    if(produit&&!l.produit.toLowerCase().includes(produit)) return false;
    if(champ&&l.champ!==champ) return false;
    if(role&&l.role_modificateur!==role) return false;
    return true;
  });
  document.getElementById('lp-results').innerHTML=renderLogPrixTable(filtered);
}

async function exportLogPrixPdf() {
  const data=window._logPrixData||[];
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Log des prix</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px;color:#1a1d2e}
  h1{color:#B87333;font-size:18px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#B87333;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
  td{padding:5px 8px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .green{color:#16a060}.red{color:#e03545}
  </style></head><body>
  <h1>💹 Journal des modifications de prix</h1>
  <p>Exporté le ${now} | ${data.length} modifications</p>
  <table><thead><tr><th>Date</th><th>Boutique</th><th>Produit</th><th>Type</th><th>Ancien</th><th>Nouveau</th><th>Variation</th><th>Par</th></tr></thead>
  <tbody>${data.map(l=>{
    const diff=l.nouveau_prix-l.ancien_prix;
    const pct=l.ancien_prix>0?Math.round((diff/l.ancien_prix)*100):0;
    const date=new Date(l.created_at).toLocaleString('fr-FR');
    return `<tr>
      <td>${date}</td><td>${l.boutique_nom||'-'}</td><td><b>${l.produit}</b></td>
      <td>${l.champ}</td>
      <td>${fmt(l.ancien_prix)} FCFA</td>
      <td><b>${fmt(l.nouveau_prix)} FCFA</b></td>
      <td class="${diff>=0?'green':'red'}">${diff>=0?'+':''}${fmt(diff)} FCFA (${pct>=0?'+':''}${pct}%)</td>
      <td>${l.modifie_par||l.role_modificateur}</td>
    </tr>`;
  }).join('')}</tbody></table>
  <p style="margin-top:16px;font-size:10px;color:#999;border-top:1px solid #ccc;padding-top:8px">Nance Group — ${now}</p>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}
