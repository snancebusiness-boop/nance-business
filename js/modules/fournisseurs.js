// Nance Group — module fournisseurs
// ===================== FOURNISSEURS =====================
async function renderFournisseurs() {
  const {data:fournisseurs}=await sb.from('fournisseurs').select('*').eq('boutique_id',currentBoutique.id).order('nom');
  const isPdg=currentUser.role==='pdg';

  // Total solde dû
  const totalDu=(fournisseurs||[]).reduce((s,f)=>s+(f.solde_du||0),0);

  document.getElementById('content').innerHTML=`
    ${totalDu>0?`<div class="card" style="border:1px solid var(--amber)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">⚠️</span>
        <div>
          <div style="font-weight:700">Solde total dû aux fournisseurs</div>
          <div style="font-size:20px;font-weight:800;color:var(--amber)">${fmt(totalDu)} FCFA</div>
        </div>
      </div>
    </div>`:''}

    <div class="card">
      <div class="card-title">➕ Ajouter un fournisseur</div>
      <div class="form-row">
        <div><label class="inp-label">Nom</label><input class="inp" id="f-nom" placeholder="Ex: Grossiste Brazzaville"></div>
        <div><label class="inp-label">Téléphone</label><input class="inp" id="f-tel" placeholder="+242..."></div>
        <div><label class="inp-label">Email</label><input class="inp" id="f-email" placeholder="Email (optionnel)"></div>
        <div><label class="inp-label">Adresse</label><input class="inp" id="f-adresse" placeholder="Adresse (optionnel)"></div>
        <div><label class="inp-label">Produits fournis</label><input class="inp" id="f-produits" placeholder="Ex: Boissons, Vêtements..."></div>
        <div><label class="inp-label">Solde dû (FCFA)</label><input class="inp" id="f-solde" type="number" placeholder="0" value="0"></div>
      </div>
      <button class="btn btn-accent" onclick="ajouterFournisseur()">+ Ajouter</button>
    </div>

    <div class="card">
      <div class="card-title">🏭 Carnet des fournisseurs (${(fournisseurs||[]).length})</div>
      ${(fournisseurs||[]).length===0?'<div class="empty-state"><p>Aucun fournisseur enregistré</p></div>':
      `<div style="display:flex;flex-direction:column;gap:12px">
        ${(fournisseurs||[]).map(f=>`
        <div style="background:var(--bg3);border:1px solid ${f.solde_du>0?'var(--amber)':'var(--border)'};border-radius:12px;padding:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
                <div style="font-size:16px;font-weight:800">🏭 ${f.nom}</div>
                ${f.solde_du>0?`<span style="background:var(--amber)22;color:var(--amber);font-size:12px;font-weight:700;padding:3px 10px;border-radius:8px">Doit: ${fmt(f.solde_du)} FCFA</span>`:'<span class="badge badge-green">Soldé ✅</span>'}
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;font-size:12px">
                ${f.telephone?`<div>📞 <a href="tel:${f.telephone}" style="color:var(--accent)">${f.telephone}</a></div>`:''}
                ${f.email?`<div>📧 <a href="mailto:${f.email}" style="color:var(--accent)">${f.email}</a></div>`:''}
                ${f.adresse?`<div>📍 ${f.adresse}</div>`:''}
                ${f.produits?`<div>📦 ${f.produits}</div>`:''}
                <div style="color:var(--text2)">🕐 Ajouté le ${new Date(f.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn btn-accent btn-sm" onclick="showCommandesFournisseur('${f.id}','${f.nom.replace(/'/g,"\\'")}')">📋 Commandes</button>
              <button class="btn btn-amber btn-sm" onclick="editFournisseur('${f.id}','${f.nom.replace(/'/g,"\\'")}','${f.telephone||''}','${f.email||''}','${f.adresse||''}','${f.produits||''}',${f.solde_du||0})">✏️ Modifier</button>
              <button class="btn btn-red btn-sm" onclick="supprimerFournisseur('${f.id}')">✕</button>
            </div>
          </div>
        </div>`).join('')}
      </div>`}
    </div>`;
}

async function ajouterFournisseur() {
  const nom=document.getElementById('f-nom').value.trim();
  const tel=document.getElementById('f-tel').value.trim();
  const email=document.getElementById('f-email').value.trim();
  const adresse=document.getElementById('f-adresse').value.trim();
  const produits=document.getElementById('f-produits').value.trim();
  const solde=parseFloat(document.getElementById('f-solde').value)||0;
  if(!nom) return notif('Entrez le nom du fournisseur','error');
  await sb.from('fournisseurs').insert({boutique_id:currentBoutique.id,nom,telephone:tel||null,email:email||null,adresse:adresse||null,produits:produits||null,solde_du:solde});
  notif('Fournisseur ajouté ✓','success'); renderFournisseurs();
}

function editFournisseur(id,nom,tel,email,adresse,produits,solde) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">✏️ Modifier le fournisseur</div>
    <div class="form-row">
      <div><label class="inp-label">Nom</label><input class="inp" id="ef-nom" value="${nom}"></div>
      <div><label class="inp-label">Téléphone</label><input class="inp" id="ef-tel" value="${tel}"></div>
      <div><label class="inp-label">Email</label><input class="inp" id="ef-email" value="${email}"></div>
      <div><label class="inp-label">Adresse</label><input class="inp" id="ef-adresse" value="${adresse}"></div>
      <div><label class="inp-label">Produits fournis</label><input class="inp" id="ef-produits" value="${produits}"></div>
      <div><label class="inp-label">Solde dû (FCFA)</label><input class="inp" id="ef-solde" type="number" value="${solde}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveFournisseur('${id}')">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function saveFournisseur(id) {
  const nom=document.getElementById('ef-nom').value.trim();
  const tel=document.getElementById('ef-tel').value.trim();
  const email=document.getElementById('ef-email').value.trim();
  const adresse=document.getElementById('ef-adresse').value.trim();
  const produits=document.getElementById('ef-produits').value.trim();
  const solde=parseFloat(document.getElementById('ef-solde').value)||0;
  await sb.from('fournisseurs').update({nom,telephone:tel||null,email:email||null,adresse:adresse||null,produits:produits||null,solde_du:solde}).eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Fournisseur modifié ✓','success'); renderFournisseurs();
}

async function supprimerFournisseur(id) {
  if(!confirm('Supprimer ce fournisseur ?')) return;
  await sb.from('fournisseurs').delete().eq('id',id);
  notif('Fournisseur supprimé','success'); renderFournisseurs();
}

async function showCommandesFournisseur(fournisseurId, fournisseurNom) {
  const {data:commandes}=await sb.from('commandes_fournisseurs').select('*').eq('fournisseur_id',fournisseurId).order('date',{ascending:false});
  const totalCommandes=(commandes||[]).reduce((s,c)=>s+parseFloat(c.montant),0);

  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:650px;max-height:85vh;overflow-y:auto">
    <div class="modal-title">📋 Commandes — ${fournisseurNom}</div>

    <!-- Ajouter commande -->
    <div style="background:var(--bg3);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:10px;font-size:13px">+ Nouvelle commande</div>
      <div class="form-row">
        <div><label class="inp-label">Date</label><input class="inp" id="cmd-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div style="flex:2"><label class="inp-label">Description</label><input class="inp" id="cmd-desc" placeholder="Ex: 10 caisses de boissons..."></div>
        <div><label class="inp-label">Montant (FCFA)</label><input class="inp" id="cmd-montant" type="number" placeholder="0"></div>
        <div><label class="inp-label">Statut</label>
          <select class="inp" id="cmd-statut">
            <option value="en_attente">⏳ En attente</option>
            <option value="recu">✅ Reçu</option>
            <option value="paye">💰 Payé</option>
            <option value="annule">❌ Annulé</option>
          </select>
        </div>
      </div>
      <button class="btn btn-accent btn-sm" style="margin-top:8px" onclick="ajouterCommande('${fournisseurId}')">+ Ajouter</button>
    </div>

    <!-- Liste commandes -->
    <div style="font-weight:700;margin-bottom:8px">Historique (${(commandes||[]).length} commandes • Total: ${fmt(totalCommandes)} FCFA)</div>
    ${(commandes||[]).length===0?'<div style="color:var(--text2);text-align:center;padding:20px">Aucune commande</div>':
    `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Montant</th><th>Statut</th><th>Action</th></tr></thead>
      <tbody>${(commandes||[]).map(c=>{
        const statutStyle=c.statut==='recu'?{badge:'badge-green',icon:'✅'}:c.statut==='paye'?{badge:'badge-accent',icon:'💰'}:c.statut==='annule'?{badge:'badge-red',icon:'❌'}:{badge:'badge-amber',icon:'⏳'};
        return `<tr>
          <td style="font-size:12px">${c.date}</td>
          <td>${c.description||'-'}</td>
          <td style="font-weight:700;color:var(--amber)">${fmt(c.montant)} FCFA</td>
          <td><span class="badge ${statutStyle.badge}">${statutStyle.icon} ${c.statut}</span></td>
          <td style="display:flex;gap:4px">
            <select class="inp" style="width:110px;font-size:11px" onchange="updateStatutCommande('${c.id}',this.value,'${fournisseurId}','${fournisseurNom.replace(/'/g,"\\'")}')">
              <option value="en_attente" ${c.statut==='en_attente'?'selected':''}>⏳ En attente</option>
              <option value="recu" ${c.statut==='recu'?'selected':''}>✅ Reçu</option>
              <option value="paye" ${c.statut==='paye'?'selected':''}>💰 Payé</option>
              <option value="annule" ${c.statut==='annule'?'selected':''}>❌ Annulé</option>
            </select>
            <button class="btn btn-red btn-sm" onclick="supprimerCommande('${c.id}','${fournisseurId}','${fournisseurNom.replace(/'/g,"\\'")}')">✕</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`}
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove();renderFournisseurs()">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function ajouterCommande(fournisseurId) {
  const date=document.getElementById('cmd-date').value;
  const desc=document.getElementById('cmd-desc').value.trim();
  const montant=parseFloat(document.getElementById('cmd-montant').value)||0;
  const statut=document.getElementById('cmd-statut').value;
  if(!desc) return notif('Entrez une description','error');
  await sb.from('commandes_fournisseurs').insert({fournisseur_id:fournisseurId,boutique_id:currentBoutique.id,date,description:desc,montant,statut});
  notif('Commande ajoutée ✓','success');
  document.querySelector('.modal-overlay').remove();
  showCommandesFournisseur(fournisseurId, '');
}

async function updateStatutCommande(id, statut, fournisseurId, fournisseurNom) {
  await sb.from('commandes_fournisseurs').update({statut}).eq('id',id);
  notif('Statut mis à jour ✓','success');
  document.querySelector('.modal-overlay').remove();
  showCommandesFournisseur(fournisseurId, fournisseurNom);
}

async function supprimerCommande(id, fournisseurId, fournisseurNom) {
  if(!confirm('Supprimer cette commande ?')) return;
  await sb.from('commandes_fournisseurs').delete().eq('id',id);
  notif('Commande supprimée','success');
  document.querySelector('.modal-overlay').remove();
  showCommandesFournisseur(fournisseurId, fournisseurNom);
}
