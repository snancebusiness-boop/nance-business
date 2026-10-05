// Nance Group — module outils
// ===================== RECHERCHE GLOBALE =====================
async function showRecherche() {
  currentView='recherche'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Recherche globale';
  document.getElementById('topbar-boutique').textContent='Toutes les boutiques';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const isPdg=currentUser.role==='pdg'||currentUser.role==='superviseur';
  const boutiquesFiltrees=isPdg?boutiques:boutiques.filter(b=>b.id===currentUser.boutique_id);

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">🔍 Recherche globale</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:200px">
          <label class="inp-label">Mot clé</label>
          <input class="inp" id="srch-q" placeholder="Nom employé, produit, description..." onkeydown="if(event.key==='Enter')lancerRecherche()">
        </div>
        <div>
          <label class="inp-label">Catégorie</label>
          <select class="inp" id="srch-cat">
            <option value="tout">Tout</option>
            <option value="employes">👥 Employés</option>
            <option value="stocks">📦 Stocks</option>
            <option value="recettes">💰 Recettes</option>
            <option value="depenses">💸 Dépenses</option>
            <option value="besoins">🛒 Besoins</option>
          </select>
        </div>
        <button class="btn btn-accent" onclick="lancerRecherche()">🔍 Rechercher</button>
      </div>
    </div>
    <div id="srch-results"></div>`;
}

async function lancerRecherche() {
  const q=document.getElementById('srch-q').value.trim().toLowerCase();
  const cat=document.getElementById('srch-cat').value;
  const el=document.getElementById('srch-results');
  if(!q) return notif('Entrez un mot clé','error');
  el.innerHTML='<div class="empty-state"><p>Recherche en cours...</p></div>';

  const isPdg=currentUser.role==='pdg'||currentUser.role==='superviseur';
  const boutiquesFiltrees=isPdg?boutiques:boutiques.filter(b=>b.id===currentUser.boutique_id);
  const bids=boutiquesFiltrees.map(b=>b.id);
  const bMap={}; boutiquesFiltrees.forEach(b=>bMap[b.id]=b);

  let resultats=[];

  // Employés
  if(cat==='tout'||cat==='employes'){
    const {data}=await sb.from('employes').select('*').in('boutique_id',bids);
    (data||[]).filter(e=>e.nom.toLowerCase().includes(q)||( e.poste||'').toLowerCase().includes(q)||(e.telephone||'').includes(q)).forEach(e=>{
      resultats.push({type:'employe',icon:'👤',boutique:bMap[e.boutique_id]?.nom||'',titre:e.nom,sous:`${e.poste||'Sans poste'} — ${e.telephone||''}`,badge:'badge-green',badgeLabel:'Employé'});
    });
  }

  // Stocks
  if(cat==='tout'||cat==='stocks'){
    const {data}=await sb.from('stocks').select('*').in('boutique_id',bids);
    (data||[]).filter(p=>p.produit.toLowerCase().includes(q)).forEach(p=>{
      resultats.push({type:'stock',icon:'📦',boutique:bMap[p.boutique_id]?.nom||'',titre:p.produit,sous:`Qté: ${p.quantite} — Prix vente: ${fmt(p.prix_vente)} FCFA`,badge:'badge-accent',badgeLabel:'Stock'});
    });
  }

  // Recettes
  if(cat==='tout'||cat==='recettes'){
    const {data}=await sb.from('recettes').select('*').in('boutique_id',bids).order('date',{ascending:false}).limit(500);
    (data||[]).filter(r=>(r.description||'').toLowerCase().includes(q)).forEach(r=>{
      resultats.push({type:'recette',icon:'💰',boutique:bMap[r.boutique_id]?.nom||'',titre:r.description,sous:`${r.date} — ${fmt(r.montant)} FCFA — ${r.mode_paiement}`,badge:'badge-green',badgeLabel:'Recette'});
    });
  }

  // Dépenses
  if(cat==='tout'||cat==='depenses'){
    const {data}=await sb.from('depenses').select('*').in('boutique_id',bids).order('date',{ascending:false}).limit(500);
    (data||[]).filter(d=>(d.description||'').toLowerCase().includes(q)||(d.categorie||'').toLowerCase().includes(q)).forEach(d=>{
      resultats.push({type:'depense',icon:'💸',boutique:bMap[d.boutique_id]?.nom||'',titre:d.description,sous:`${d.date} — ${fmt(d.montant)} FCFA — ${d.categorie}`,badge:'badge-red',badgeLabel:'Dépense'});
    });
  }

  // Besoins
  if(cat==='tout'||cat==='besoins'){
    const {data}=await sb.from('besoins').select('*').in('boutique_id',bids);
    (data||[]).filter(b=>(b.article||'').toLowerCase().includes(q)).forEach(b=>{
      resultats.push({type:'besoin',icon:'🛒',boutique:bMap[b.boutique_id]?.nom||'',titre:b.article,sous:`Qté: ${b.quantite} ${b.unite||''} — Urgence: ${b.urgence} — ${b.recu?'✅ Reçu':'⏳ En attente'}`,badge:'badge-amber',badgeLabel:'Besoin'});
    });
  }

  if(resultats.length===0){
    el.innerHTML=`<div class="card"><div class="empty-state"><p>Aucun résultat pour "<strong>${q}</strong>"</p></div></div>`;
    return;
  }

  // Grouper par boutique
  const parBoutique={};
  resultats.forEach(r=>{
    if(!parBoutique[r.boutique]) parBoutique[r.boutique]=[];
    parBoutique[r.boutique].push(r);
  });

  el.innerHTML=`
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">${resultats.length} résultat(s) pour "<strong>${q}</strong>"</div>
      </div>
      ${Object.entries(parBoutique).map(([boutique,items])=>`
        <div style="margin-bottom:20px">
          <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${boutique||'—'}</div>
          ${items.map(r=>`
            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:var(--bg3);margin-bottom:6px">
              <div style="font-size:22px">${r.icon}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${r.titre}</div>
                <div style="font-size:12px;color:var(--text2);margin-top:2px">${r.sous}</div>
              </div>
              <span class="badge ${r.badge}">${r.badgeLabel}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
}

// ===================== EXPORT PDF =====================
async function showExportPdf() {
  currentView='pdf'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Export PDF';
  document.getElementById('topbar-boutique').textContent='Générer des rapports';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const isPdg=currentUser.role==='pdg'||currentUser.role==='superviseur';
  const today=new Date().toISOString().split('T')[0];
  const moisCourant=today.substring(0,7);

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">📄 Générer un rapport PDF</div>
      <div class="form-row">
        <div>
          <label class="inp-label">Type de rapport</label>
          <select class="inp" id="pdf-type" onchange="togglePdfOptions()">
            <option value="journalier">📅 Rapport journalier</option>
            <option value="mensuel">📆 Rapport mensuel</option>
          </select>
        </div>
        <div id="pdf-date-wrap">
          <label class="inp-label">Date</label>
          <input class="inp" id="pdf-date" type="date" value="${today}">
        </div>
        <div id="pdf-mois-wrap" style="display:none">
          <label class="inp-label">Mois</label>
          <input class="inp" id="pdf-mois" type="month" value="${moisCourant}">
        </div>
        ${isPdg?`<div>
          <label class="inp-label">Boutique</label>
          <select class="inp" id="pdf-boutique">
            <option value="toutes">🌍 Toutes les boutiques</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>`:`<input type="hidden" id="pdf-boutique" value="${currentUser.boutique_id}">`}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="pdf-rec" checked> 💰 Recettes & Dépenses</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="pdf-stk" checked> 📦 Stocks</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="pdf-emp" checked> 👥 Employés</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="pdf-pres" checked> 🕐 Présences</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="pdf-bes" checked> 🛒 Besoins</label>
      </div>
      <button class="btn btn-accent" style="margin-top:16px" onclick="genererPdf()">📥 Générer & Télécharger le PDF</button>
    </div>
    <div id="pdf-preview"></div>`;
}

function togglePdfOptions() {
  const type=document.getElementById('pdf-type').value;
  document.getElementById('pdf-date-wrap').style.display=type==='journalier'?'block':'none';
  document.getElementById('pdf-mois-wrap').style.display=type==='mensuel'?'block':'none';
}

async function genererPdf() {
  const type=document.getElementById('pdf-type').value;
  const dateVal=document.getElementById('pdf-date')?.value;
  const moisVal=document.getElementById('pdf-mois')?.value;
  const boutiqueVal=document.getElementById('pdf-boutique')?.value;
  const inclRec=document.getElementById('pdf-rec').checked;
  const inclStk=document.getElementById('pdf-stk').checked;
  const inclEmp=document.getElementById('pdf-emp').checked;
  const inclPres=document.getElementById('pdf-pres').checked;
  const inclBes=document.getElementById('pdf-bes').checked;

  const el=document.getElementById('pdf-preview');
  el.innerHTML='<div class="empty-state"><p>⏳ Génération en cours...</p></div>';

  const bList=boutiqueVal==='toutes'?boutiques:boutiques.filter(b=>b.id===boutiqueVal);
  const dateDebut=type==='journalier'?dateVal:moisVal+'-01';
  const dateFin=type==='journalier'?dateVal:moisVal+'-31';
  const titreDate=type==='journalier'
    ?new Date(dateVal+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
    :new Date(moisVal+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  // Charger les données pour chaque boutique
  const data=await Promise.all(bList.map(async b=>{
    const [rec,dep,stk,emp,pres,bes]=await Promise.all([
      inclRec?sb.from('recettes').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin).order('date'):{data:[]},
      inclRec?sb.from('depenses').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin).order('date'):{data:[]},
      inclStk?sb.from('stocks').select('*').eq('boutique_id',b.id).order('produit'):{data:[]},
      inclEmp?sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true).order('nom'):{data:[]},
      inclPres?sb.from('presences').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin).order('date'):{data:[]},
      inclBes?sb.from('besoins').select('*').eq('boutique_id',b.id).eq('recu',false).order('urgence'):{data:[]},
    ]);
    return {b,rec:rec.data||[],dep:dep.data||[],stk:stk.data||[],emp:emp.data||[],pres:pres.data||[],bes:bes.data||[]};
  }));

  // Générer le HTML du rapport
  const now=new Date().toLocaleString('fr-FR');
  let html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Rapport Nance Group — ${titreDate}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#1a1d2e;margin:0;padding:20px;font-size:12px}
    h1{font-size:22px;color:#B87333;margin-bottom:4px}
    h2{font-size:15px;color:#B87333;border-bottom:2px solid #B87333;padding-bottom:4px;margin-top:24px}
    h3{font-size:13px;color:#333;margin-top:16px;margin-bottom:6px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #B87333}
    .meta{font-size:11px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
    th{background:#B87333;color:#fff;padding:6px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #e0e0e0}
    tr:nth-child(even) td{background:#f5f5ff}
    .total-row td{font-weight:bold;background:#e8e8ff;border-top:2px solid #B87333}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold}
    .green{color:#16a060}.red{color:#e03545}.amber{color:#d97706}
    .bg-green{background:#e6f9f0;color:#16a060}
    .bg-red{background:#ffeef0;color:#e03545}
    .bg-amber{background:#fff8e6;color:#d97706}
    .stats{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}
    .stat{background:#f0f0ff;border:1px solid #d0d0ff;border-radius:8px;padding:10px 16px;min-width:120px}
    .stat-val{font-size:16px;font-weight:bold;color:#B87333}
    .stat-lbl{font-size:10px;color:#666;margin-top:2px}
    .page-break{page-break-before:always}
    @media print{.page-break{page-break-before:always}}
  </style></head><body>
  <div class="header">
    <div>
      <h1>📊 Nance Group</h1>
      <div style="font-size:14px;font-weight:bold;margin-top:4px">Rapport ${type==='journalier'?'Journalier':'Mensuel'} — ${titreDate}</div>
      <div class="meta">Généré le ${now} | ${bList.length > 1 ? 'Toutes les boutiques' : bList[0]?.nom}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#666">
      <div style="font-size:20px;font-weight:800;color:#B87333">NANCE</div>
      <div>Business Management</div>
    </div>
  </div>`;

  // Résumé global si plusieurs boutiques
  if(bList.length>1){
    const totalRec=data.reduce((s,d)=>s+d.rec.reduce((ss,r)=>ss+parseFloat(r.montant),0),0);
    const totalDep=data.reduce((s,d)=>s+d.dep.reduce((ss,r)=>ss+parseFloat(r.montant),0),0);
    html+=`<h2>🌍 Résumé Global</h2>
    <div class="stats">
      <div class="stat"><div class="stat-val" style="color:#16a060">${fmt(totalRec)} FCFA</div><div class="stat-lbl">Total Recettes</div></div>
      <div class="stat"><div class="stat-val" style="color:#e03545">${fmt(totalDep)} FCFA</div><div class="stat-lbl">Total Dépenses</div></div>
      <div class="stat"><div class="stat-val" style="color:${totalRec-totalDep>=0?'#16a060':'#e03545'}">${fmt(totalRec-totalDep)} FCFA</div><div class="stat-lbl">Solde Global</div></div>
      <div class="stat"><div class="stat-val">${data.reduce((s,d)=>s+d.emp.length,0)}</div><div class="stat-lbl">Employés actifs</div></div>
    </div>
    <table>
      <thead><tr><th>Boutique</th><th>Recettes</th><th>Dépenses</th><th>Solde</th><th>Employés</th><th>Besoins</th></tr></thead>
      <tbody>${data.map(d=>{
        const r=d.rec.reduce((s,x)=>s+parseFloat(x.montant),0);
        const dep=d.dep.reduce((s,x)=>s+parseFloat(x.montant),0);
        return `<tr><td><b>${d.b.nom}</b></td><td class="green">${fmt(r)} FCFA</td><td class="red">${fmt(dep)} FCFA</td>
        <td class="${r-dep>=0?'green':'red'}" style="font-weight:bold">${fmt(r-dep)} FCFA</td>
        <td>${d.emp.length}</td><td>${d.bes.length}</td></tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // Détail par boutique
  data.forEach((d,i)=>{
    const totalRec=d.rec.reduce((s,r)=>s+parseFloat(r.montant),0);
    const totalDep=d.dep.reduce((s,r)=>s+parseFloat(r.montant),0);
    html+=`${i>0?'<div class="page-break"></div>':''}<h2>${d.b.nom} — ${d.b.lieu||''}</h2>`;

    // Stats boutique
    html+=`<div class="stats">
      <div class="stat"><div class="stat-val" style="color:#16a060">${fmt(totalRec)} FCFA</div><div class="stat-lbl">Recettes</div></div>
      <div class="stat"><div class="stat-val" style="color:#e03545">${fmt(totalDep)} FCFA</div><div class="stat-lbl">Dépenses</div></div>
      <div class="stat"><div class="stat-val" style="color:${totalRec-totalDep>=0?'#16a060':'#e03545'}">${fmt(totalRec-totalDep)} FCFA</div><div class="stat-lbl">Solde</div></div>
    </div>`;

    // Recettes
    if(inclRec && d.rec.length>0){
      html+=`<h3>💰 Recettes (${d.rec.length})</h3>
      <table><thead><tr><th>Date</th><th>Description</th><th>Mode</th><th>Montant</th></tr></thead>
      <tbody>${d.rec.map(r=>`<tr><td>${r.date}</td><td>${r.description}</td><td>${r.mode_paiement}</td><td class="green">${fmt(r.montant)} FCFA</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">TOTAL RECETTES</td><td class="green">${fmt(totalRec)} FCFA</td></tr>
      </tbody></table>`;
    }

    // Dépenses
    if(inclRec && d.dep.length>0){
      html+=`<h3>💸 Dépenses (${d.dep.length})</h3>
      <table><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
      <tbody>${d.dep.map(r=>`<tr><td>${r.date}</td><td>${r.description}</td><td>${r.categorie}</td><td class="red">${fmt(r.montant)} FCFA</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">TOTAL DÉPENSES</td><td class="red">${fmt(totalDep)} FCFA</td></tr>
      </tbody></table>`;
    }

    // Stocks
    if(inclStk && d.stk.length>0){
      html+=`<h3>📦 Stocks (${d.stk.length} produits)</h3>
      <table><thead><tr><th>Produit</th><th>Quantité</th><th>Prix vente</th><th>Durée</th></tr></thead>
      <tbody>${d.stk.map(p=>`<tr><td>${p.produit}</td><td>${p.quantite}</td><td>${fmt(p.prix_vente)} FCFA</td><td>${p.duree_jours}j</td></tr>`).join('')}
      </tbody></table>`;
    }

    // Employés
    if(inclEmp && d.emp.length>0){
      html+=`<h3>👥 Employés actifs (${d.emp.length})</h3>
      <table><thead><tr><th>Nom</th><th>Poste</th><th>Téléphone</th><th>Adresse</th></tr></thead>
      <tbody>${d.emp.map(e=>`<tr><td>${e.nom}</td><td>${e.poste||'-'}</td><td>${e.telephone||'-'}</td><td>${e.adresse||'-'}</td></tr>`).join('')}
      </tbody></table>`;
    }

    // Présences
    if(inclPres && d.pres.length>0){
      const statsP={present:0,retard:0,absent:0,conge:0};
      d.pres.forEach(p=>{ if(statsP[p.statut]!==undefined) statsP[p.statut]++; });
      html+=`<h3>🕐 Présences (${d.pres.length} enregistrements) — Présent: ${statsP.present} | Retard: ${statsP.retard} | Absent: ${statsP.absent} | Congé: ${statsP.conge}</h3>
      <table><thead><tr><th>Date</th><th>Employé</th><th>Statut</th><th>Arrivée</th><th>Départ</th><th>Note</th></tr></thead>
      <tbody>${d.pres.map(p=>`<tr><td>${p.date}</td><td>${p.employe_nom}</td>
        <td><span class="badge ${p.statut==='present'?'bg-green':p.statut==='retard'?'bg-amber':'bg-red'}">${p.statut}</span></td>
        <td>${p.heure_arrivee||'-'}</td><td>${p.heure_depart||'-'}</td><td>${p.note||''}</td></tr>`).join('')}
      </tbody></table>`;
    }

    // Besoins
    if(inclBes && d.bes.length>0){
      html+=`<h3>🛒 Besoins en attente (${d.bes.length})</h3>
      <table><thead><tr><th>Article</th><th>Quantité</th><th>Urgence</th></tr></thead>
      <tbody>${d.bes.map(b=>`<tr><td>${b.article}</td><td>${b.quantite} ${b.unite||''}</td>
        <td><span class="badge ${b.urgence==='haute'?'bg-red':b.urgence==='moyenne'?'bg-amber':'bg-green'}">${b.urgence}</span></td></tr>`).join('')}
      </tbody></table>`;
    }
  });

  html+=`<div style="margin-top:30px;padding-top:12px;border-top:1px solid #ccc;font-size:10px;color:#999;text-align:center">
    Rapport généré par Nance Group — ${now}
  </div></body></html>`;

  // Ouvrir dans une nouvelle fenêtre et imprimer
  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  win.onload=()=>{ win.focus(); win.print(); };

  el.innerHTML=`<div class="card" style="text-align:center;padding:24px">
    <div style="font-size:32px;margin-bottom:12px">✅</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:6px">Rapport généré !</div>
    <div style="color:var(--text2);font-size:13px">Une fenêtre s'est ouverte avec le rapport. Utilise <strong>Ctrl+P</strong> pour imprimer ou sauvegarder en PDF.</div>
  </div>`;
}


// ===================== HISTORIQUE CONNEXIONS =====================
async function showConnexions() {
  currentView='connexions'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Historique des connexions';
  document.getElementById('topbar-boutique').textContent='Activité des comptes';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const {data}=await sb.from('connexions').select('*').order('created_at',{ascending:false}).limit(200);

  // Statistiques
  const aujourd_hui=new Date().toISOString().split('T')[0];
  const aujourd_hui_count=(data||[]).filter(c=>c.created_at?.startsWith(aujourd_hui)).length;
  const parRole={pdg:0,superviseur:0,responsable:0};
  (data||[]).forEach(c=>{ if(parRole[c.role]!==undefined) parRole[c.role]++; });

  // Grouper par date
  const parDate={};
  (data||[]).forEach(c=>{
    const date=c.created_at?.split('T')[0];
    if(!parDate[date]) parDate[date]=[];
    parDate[date].push(c);
  });

  document.getElementById('content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">🔐 Connexions aujourd'hui</div><div class="stat-value accent">${aujourd_hui_count}</div><div class="stat-sub">accès ce jour</div></div>
      <div class="stat-card"><div class="stat-label">👑 Connexions PDG</div><div class="stat-value amber">${parRole.pdg}</div><div class="stat-sub">total</div></div>
      <div class="stat-card"><div class="stat-label">👁 Connexions Superviseur</div><div class="stat-value accent">${parRole.superviseur}</div><div class="stat-sub">total</div></div>
      <div class="stat-card"><div class="stat-label">👤 Connexions Responsables</div><div class="stat-value green">${parRole.responsable}</div><div class="stat-sub">total</div></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">Journal des connexions (${(data||[]).length})</div>
        <button class="btn btn-red btn-sm" onclick="clearConnexions()">🗑 Effacer</button>
      </div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucune connexion enregistrée</p></div>':
      Object.entries(parDate).map(([date,items])=>`
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:8px">
            ${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
            <span class="badge badge-accent" style="margin-left:8px">${items.length} connexion(s)</span>
          </div>
          ${items.map(c=>{
            const heure=new Date(c.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
            const roleColor=c.role==='pdg'?'var(--amber)':c.role==='superviseur'?'var(--accent)':'var(--green)';
            const roleIcon=c.role==='pdg'?'👑':c.role==='superviseur'?'👁':'👤';
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:var(--bg3);margin-bottom:6px">
              <div style="font-size:20px">${c.appareil||'💻'}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${roleIcon} ${c.boutique_nom||c.identifiant}</div>
                <div style="font-size:11px;color:var(--text2);margin-top:2px">${c.identifiant} • ${heure}</div>
              </div>
              <span style="background:${roleColor}22;color:${roleColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px">${c.role}</span>
            </div>`;
          }).join('')}
        </div>`).join('')}
    </div>`;
}

async function clearConnexions() {
  if(!confirm('Effacer tout l\'historique des connexions ?')) return;
  await sb.from('connexions').delete().neq('id','00000000-0000-0000-0000-000000000000');
  notif('Historique effacé','success'); showConnexions();
}

// ===================== ORGANIGRAMME =====================
async function showOrganigramme() {
  currentView='organigramme'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Organigramme';
  document.getElementById('topbar-boutique').textContent='Structure de l\'entreprise';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  // Charger tous les employés par boutique
  const rows = await Promise.all(boutiques.map(async b=>{
    const {data}=await sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true).order('poste');
    return {b, employes:data||[]};
  }));

  // Charger comptes superviseur
  const {data:superviseurs}=await sb.from('comptes').select('identifiant,photo_url,nom_complet,telephone').eq('role','superviseur');
  // Charger info PDG
  const {data:pdgData}=await sb.from('comptes').select('identifiant,photo_url,nom_complet,telephone').eq('role','pdg').single();

  document.getElementById('content').innerHTML=`
    <div style="overflow-x:auto;padding-bottom:32px;min-width:600px">

      <!-- NIVEAU 1 : PDG — Grande carte centrale -->
      <div style="display:flex;justify-content:center;margin-bottom:0">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:linear-gradient(135deg,#B87333,#E0B285);border-radius:24px;padding:28px 40px;text-align:center;min-width:220px;box-shadow:0 8px 40px #B8733360;position:relative">
            <!-- Couronne -->
            <div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:28px">👑</div>
            <!-- Photo PDG -->
            ${pdgData?.photo_url
              ? `<img src="${pdgData.photo_url}" style="width:150px;height:150px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.5);margin-bottom:12px;margin-top:8px">`
              : `<div style="width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:64px;margin:8px auto 12px;border:4px solid rgba(255,255,255,0.3)">👤</div>`}
            <div style="font-weight:900;font-size:20px;color:#fff;letter-spacing:-0.5px">${pdgData?.nom_complet||'PDG'}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px;font-weight:600">Directeur Général</div>
            ${pdgData?.telephone?`<div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:3px">📞 ${pdgData.telephone}</div>`:''}
            <div style="background:rgba(255,255,255,0.25);color:#fff;font-size:11px;font-weight:800;border-radius:8px;padding:4px 14px;margin-top:10px;display:inline-block;letter-spacing:1px">PDG</div>
          </div>
          <div style="width:3px;height:40px;background:linear-gradient(to bottom,#B87333,var(--border))"></div>
        </div>
      </div>

      <!-- LIGNE HORIZONTALE -->
      <div style="display:flex;justify-content:center;margin-bottom:0">
        <div style="width:min(90vw,${Math.max(400,((superviseurs||[]).length+(rows||[]).length)*220)}px);height:3px;background:var(--border);border-radius:2px"></div>
      </div>

      <!-- NIVEAU 2 : Superviseur(s) + Responsables -->
      <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:0;padding:0 16px">

        <!-- Superviseurs -->
        ${(superviseurs||[]).map(s=>`
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:3px;height:40px;background:var(--amber)"></div>
          <div style="background:var(--bg2);border:2px solid var(--amber);border-radius:20px;padding:20px 24px;text-align:center;min-width:160px;box-shadow:0 4px 16px #f59e0b22">
            ${s.photo_url
              ? `<img src="${s.photo_url}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid var(--amber);margin-bottom:8px">`
              : `<div style="width:60px;height:60px;border-radius:50%;background:var(--amber)22;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 8px;border:3px solid var(--amber)">👁</div>`}
            <div style="font-weight:800;font-size:14px">Superviseur</div>
            <div style="font-size:11px;color:var(--text2);margin-top:3px">${s.nom_complet||s.identifiant}</div>
            ${s.telephone?`<div style="font-size:11px;color:var(--amber);margin-top:3px">📞 ${s.telephone}</div>`:''}
            <div style="background:var(--amber);color:#fff;font-size:10px;font-weight:700;border-radius:6px;padding:3px 10px;margin-top:8px;display:inline-block">Toutes boutiques</div>
          </div>
        </div>`).join('')}

        <!-- Responsables par boutique -->
        ${rows.map(({b,employes})=>`
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:3px;height:40px;background:${b.couleur}"></div>
          <div style="background:var(--bg2);border:2px solid ${b.couleur};border-radius:20px;padding:20px 24px;text-align:center;min-width:170px;box-shadow:0 4px 16px ${b.couleur}22">
            ${b.image_url
              ? `<img src="${b.image_url}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid ${b.couleur};margin-bottom:8px">`
              : `<div style="width:60px;height:60px;border-radius:50%;background:${b.couleur}22;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 8px;border:3px solid ${b.couleur}">🏪</div>`}
            <div style="font-weight:800;font-size:14px">${b.nom}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:3px">${b.lieu||''}</div>
            <div style="background:${b.couleur};color:#fff;font-size:10px;font-weight:700;border-radius:6px;padding:3px 10px;margin-top:8px;display:inline-block">Responsable</div>
          </div>

          <!-- Employés de cette boutique -->
          ${employes.length>0?`
          <div style="width:3px;height:24px;background:${b.couleur}55"></div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:320px">
            ${employes.map(e=>`
            <div style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:12px 16px;text-align:center;min-width:115px;transition:transform 0.15s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
              ${e.photo_url
                ? `<img src="${e.photo_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${b.couleur};margin-bottom:6px">`
                : `<div style="width:40px;height:40px;border-radius:50%;background:${b.couleur}22;display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 6px;border:2px solid ${b.couleur}33">👤</div>`}
              <div style="font-weight:700;font-size:12px">${e.nom}</div>
              <div style="font-size:10px;color:var(--text2);margin-top:2px">${e.poste||'Employé'}</div>
            </div>`).join('')}
          </div>`
          :`<div style="font-size:11px;color:var(--text2);margin-top:14px;padding:8px 16px;background:var(--bg3);border-radius:8px">Aucun employé</div>`}
        </div>`).join('')}
      </div>

      <!-- Légende -->
      <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:32px;padding-top:20px;border-top:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#B87333,#E0B285)"></div> PDG</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:12px;height:12px;border-radius:50%;background:var(--amber)"></div> Superviseur</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:12px;height:12px;border-radius:50%;background:var(--accent)"></div> Responsable de boutique</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)"><div style="width:12px;height:12px;border-radius:50%;background:var(--bg3);border:1px solid var(--border)"></div> Employé</div>
      </div>
    </div>`;
}

// ===================== DOCUMENTS =====================
async function showDocuments() {
  currentView='documents'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Documents';
  document.getElementById('topbar-boutique').textContent='Contrats, règlements et fichiers';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const isPdg=currentUser.role==='pdg';
  const isSuperviseur=currentUser.role==='superviseur';
  const isResp=currentUser.role==='responsable';

  const {data:docs}=await sb.from('documents').select('*').order('created_at',{ascending:false});

  const categories=['contrat','reglement','procedure','autre'];
  const catLabels={contrat:'📋 Contrats',reglement:'📜 Règlement intérieur',procedure:'📌 Procédures',autre:'📂 Autres'};

  document.getElementById('content').innerHTML=`
    <!-- Upload section -->
    <div class="card">
      <div class="card-title">📤 Ajouter un document</div>
      <div class="form-row">
        <div><label class="inp-label">Nom du document</label><input class="inp" id="doc-nom" placeholder="Ex: Contrat Jean Dupont..."></div>
        <div><label class="inp-label">Catégorie</label>
          <select class="inp" id="doc-cat">
            <option value="contrat">📋 Contrat employé</option>
            <option value="reglement">📜 Règlement intérieur</option>
            <option value="procedure">📌 Procédure</option>
            <option value="autre">📂 Autre</option>
          </select>
        </div>
        <div><label class="inp-label">Boutique concernée</label>
          <select class="inp" id="doc-boutique">
            <option value="">🌍 Toute l'entreprise</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>
        <div style="flex:2"><label class="inp-label">Description</label><input class="inp" id="doc-desc" placeholder="Description optionnelle..."></div>
      </div>

      <!-- Choix : upload fichier OU lien URL -->
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:200px">
          <label class="inp-label">📎 Uploader un fichier (depuis ton appareil)</label>
          <label style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:2px dashed var(--border);border-radius:10px;padding:14px;cursor:pointer;transition:border-color 0.2s" 
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <input type="file" id="doc-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" onchange="previewDocFichier(this)">
            <span style="font-size:24px">📄</span>
            <div>
              <div style="font-weight:600;font-size:13px" id="doc-file-label">Cliquez pour choisir un fichier</div>
              <div style="font-size:11px;color:var(--text2)">PDF, Word, Excel, Image (max 10MB)</div>
            </div>
          </label>
        </div>
        <div style="color:var(--text2);font-weight:700;font-size:13px;padding-top:20px">OU</div>
        <div style="flex:1;min-width:200px">
          <label class="inp-label">🔗 Lien URL (Google Drive, Dropbox...)</label>
          <input class="inp" id="doc-url" placeholder="https://drive.google.com/...">
        </div>
      </div>

      <button class="btn btn-accent" style="margin-top:14px" onclick="ajouterDocument()">+ Ajouter le document</button>
    </div>

    <!-- Documents par catégorie -->
    ${categories.map(cat=>{
      const items=(docs||[]).filter(d=>d.categorie===cat);
      return `
      <div class="card">
        <div class="card-title">${catLabels[cat]} (${items.length})</div>
        ${items.length===0?`<div style="color:var(--text2);font-size:13px">Aucun document dans cette catégorie</div>`:`
        <div style="display:flex;flex-direction:column;gap:8px">
          ${items.map(d=>{
            const b=boutiques.find(x=>x.id===d.boutique_id);
            const date=new Date(d.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
            const isImage=d.url&&/\.(png|jpg|jpeg|gif|webp)$/i.test(d.url);
            return `
            <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
              <div style="font-size:28px">${d.categorie==='contrat'?'📋':d.categorie==='reglement'?'📜':d.categorie==='procedure'?'📌':'📂'}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${d.nom}</div>
                <div style="font-size:11px;color:var(--text2);margin-top:3px">
                  ${b?`<span style="color:${b.couleur};font-weight:600">${b.nom}</span> • `:'🌍 Toute l\'entreprise • '}
                  Ajouté le ${date} par ${d.auteur||'?'}${d.description?' • '+d.description:''}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${d.url?`
                  <a href="${d.url}" target="_blank" class="btn btn-accent btn-sm">🔗 Ouvrir</a>
                  <button class="btn btn-ghost btn-sm" onclick="telechargerDocument('${d.url}','${d.nom.replace(/'/g,"\\'")}')">⬇️ Télécharger</button>
                `:'<span style="font-size:11px;color:var(--text2)">Pas de fichier</span>'}
                ${currentUser.role==='pdg'?`<button class="btn btn-red btn-sm" onclick="supprimerDocument('${d.id}','${d.fichier_path||''}')">✕</button>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>`;
    }).join('')}`;
}

function previewDocFichier(input) {
  const file=input.files[0];
  if(file) document.getElementById('doc-file-label').textContent=`✅ ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`;
}

async function ajouterDocument() {
  const nom=document.getElementById('doc-nom').value.trim();
  const cat=document.getElementById('doc-cat').value;
  const boutique_id=document.getElementById('doc-boutique').value||null;
  const urlInput=document.getElementById('doc-url').value.trim();
  const desc=document.getElementById('doc-desc').value.trim();
  const fileInput=document.getElementById('doc-file');
  const file=fileInput?.files[0];

  if(!nom) return notif('Entrez le nom du document','error');
  if(!file && !urlInput) return notif('Choisissez un fichier ou entrez un lien URL','error');

  const auteur=currentUser.role==='pdg'?'PDG':currentUser.role==='superviseur'?'Superviseur':(currentUser.boutiques?.nom||'Responsable');
  let url=urlInput;
  let fichier_path=null;

  // Upload fichier si sélectionné
  if(file){
    if(file.size>10*1024*1024) return notif('Fichier trop grand (max 10MB)','error');
    notif('Upload en cours...','success');
    const ext=file.name.split('.').pop();
    const path=`documents/${Date.now()}_${nom.replace(/\s/g,'_').substring(0,30)}.${ext}`;
    const {error:upErr}=await sb.storage.from('photos').upload(path,file,{upsert:true});
    if(upErr) return notif('Erreur upload: '+upErr.message,'error');
    const {data:urlData}=sb.storage.from('photos').getPublicUrl(path);
    url=urlData.publicUrl;
    fichier_path=path;
  }

  const {error}=await sb.from('documents').insert({nom,categorie:cat,boutique_id,url:url||null,fichier_path,description:desc||null,auteur});
  if(error) return notif('Erreur: '+error.message,'error');
  await logNotifPdg('document_ajoute','📁',`Nouveau document ajouté : "${nom}" (${cat}) par ${auteur}`);
  notif('Document ajouté ✓','success');
  showDocuments();
}

async function telechargerDocument(url, nom) {
  try {
    // Essayer avec l'API Web Share (mobile)
    if(navigator.share) {
      await navigator.share({title: nom, url: url});
      return;
    }
    // Sinon téléchargement classique
    const response = await fetch(url);
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch(e) {
    // Fallback : ouvrir dans un nouvel onglet
    window.open(url, '_blank');
    notif('Appuyez longuement sur le fichier pour le sauvegarder','success');
  }
}

function imprimerDocument(url, nom) {
  const win = window.open(url, '_blank');
  if(win) {
    win.onload = () => {
      try { win.print(); }
      catch(e) { notif('Ouvre le fichier et utilise Ctrl+P pour imprimer','success'); }
    };
  } else {
    notif('Active les popups pour imprimer directement','error');
  }
}

async function supprimerDocument(id, fichierPath) {
  if(!confirm('Supprimer ce document ?')) return;
  // Supprimer le fichier du storage si uploadé
  if(fichierPath) await sb.storage.from('photos').remove([fichierPath]);
  await sb.from('documents').delete().eq('id',id);
  notif('Document supprimé','success');
  showDocuments();
}
