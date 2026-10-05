// Nance Group — module corbeille
// ===================== CORBEILLE =====================
async function showCorbeille() {
  currentView='corbeille'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Corbeille';
  document.getElementById('topbar-boutique').textContent='Éléments supprimés — récupérables 30 jours';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const {data}=await sb.from('corbeille').select('*').order('created_at',{ascending:false});
  const today=new Date();

  // Mettre à jour badge
  const badge=document.getElementById('corbeille-badge');
  if(badge){ badge.style.display=(data||[]).length>0?'inline':'none'; badge.textContent=(data||[]).length; }

  const typeLabels={stock:'📦 Stock',employe:'👤 Employé',recette:'💰 Recette',depense:'💸 Dépense',document:'📁 Document'};
  const typeBadges={stock:'badge-accent',employe:'badge-green',recette:'badge-green',depense:'badge-red',document:'badge-amber'};

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">🗑 Corbeille (${(data||[]).length} élément(s))</div>
        ${(data||[]).length>0?`<button class="btn btn-red btn-sm" onclick="viderCorbeille()">🗑 Vider la corbeille</button>`:''}
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:16px">⚠️ Les éléments sont automatiquement supprimés définitivement après 30 jours.</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>La corbeille est vide</p></div>':`
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(data||[]).map(item=>{
          const expire=new Date(item.expire_le);
          const joursRestants=Math.ceil((expire-today)/(1000*60*60*24));
          const donnees=JSON.parse(item.donnees||'{}');
          const titre=donnees.produit||donnees.nom||donnees.description||donnees.titre||'Élément';
          const boutique=boutiques.find(b=>b.id===item.boutique_id);
          return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
            <div style="font-size:24px">${item.type==='stock'?'📦':item.type==='employe'?'👤':item.type==='recette'?'💰':item.type==='depense'?'💸':'📁'}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">${titre}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:3px">
                <span class="badge ${typeBadges[item.type]||'badge-accent'}">${typeLabels[item.type]||item.type}</span>
                ${boutique?`<span style="margin-left:6px;color:${boutique.couleur};font-weight:600">${boutique.nom}</span>`:''}
                • Supprimé par ${item.supprime_par||'?'}
                • ${new Date(item.created_at).toLocaleDateString('fr-FR')}
              </div>
              <div style="font-size:11px;margin-top:4px;color:${joursRestants<=3?'var(--red)':'var(--text2)'}">
                ⏱ ${joursRestants<=0?'Expire aujourd\'hui !':joursRestants+' jour(s) avant suppression définitive'}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn btn-green btn-sm" onclick="restaurerElement('${item.id}','${item.type}')">♻️ Restaurer</button>
              <button class="btn btn-red btn-sm" onclick="supprimerDefinitivement('${item.id}')">✕ Supprimer</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

async function restaurerElement(corbeilleId, type) {
  const {data:item}=await sb.from('corbeille').select('*').eq('id',corbeilleId).single();
  if(!item) return notif('Élément introuvable','error');
  const donnees=JSON.parse(item.donnees||'{}');
  // Supprimer l'id pour réinsérer
  delete donnees.id;
  const table=type==='stock'?'stocks':type==='employe'?'employes':type==='recette'?'recettes':type==='depense'?'depenses':'documents';
  const {error}=await sb.from(table).insert(donnees);
  if(error) return notif('Erreur lors de la restauration: '+error.message,'error');
  await sb.from('corbeille').delete().eq('id',corbeilleId);
  notif('Élément restauré ✓','success');
  showCorbeille();
}

async function supprimerDefinitivement(id) {
  if(!confirm('Supprimer définitivement ? Cette action est irréversible.')) return;
  await sb.from('corbeille').delete().eq('id',id);
  notif('Supprimé définitivement','success');
  showCorbeille();
}

async function viderCorbeille() {
  if(!confirm('Vider toute la corbeille ? Toutes les données seront perdues définitivement.')) return;
  await sb.from('corbeille').delete().neq('id','00000000-0000-0000-0000-000000000000');
  notif('Corbeille vidée','success');
  showCorbeille();
}
