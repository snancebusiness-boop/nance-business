// Nance Group — module notifications
// ===================== NOTIFICATIONS BESOINS =====================
async function startNotifCheck() {
  await checkBesoinsNotif();
  await verifierSauvegardeAuto();
  await mettreAJourStatutEnLigne(true);
  await afficherUtilisateursEnLigne();
  notifInterval=setInterval(async ()=>{
    await checkBesoinsNotif();
    await verifierSauvegardeAuto();
    await mettreAJourStatutEnLigne(true);
    await afficherUtilisateursEnLigne();
  },30000); // Toutes les 30 secondes
}

async function checkBesoinsNotif() {
  if(!currentUser) return;
  const badge=document.getElementById('chat-badge');
  let unread=0;
  if(currentUser.role==='pdg'){
    // Tous canaux normaux non lus
    const {data:m1}=await sb.from('messages').select('id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).not('boutique_id','is',null);
    // Canaux spéciaux (groupe + superviseur) non lus
    const {data:m2}=await sb.from('messages').select('id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).not('canal_id','is',null);
    unread=((m1||[]).length)+((m2||[]).length);
    // Badge notifs PDG
    const {data:notifsData}=await sb.from('notifs_pdg').select('id').eq('lu',false);
    const notifsBadge=document.getElementById('notifs-pdg-badge');
    if(notifsBadge){
      const cnt=(notifsData||[]).length;
      notifsBadge.style.display=cnt>0?'inline':'none';
      notifsBadge.textContent=cnt;
    }
  } else if(currentUser.role==='superviseur'){
    // Superviseur : messages non lus dans canal privé PDG (lu_responsable=false) + groupes (lu_pdg=false)
    const {data:m1}=await sb.from('messages').select('id').eq('boutique_id',CANAL_SUPERVISEUR).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
    const {data:m2}=await sb.from('messages').select('id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).neq('boutique_id',CANAL_SUPERVISEUR);
    unread=((m1||[]).length)+((m2||[]).length);
  } else {
    const boutiqueId=currentUser.boutique_id||currentUser.boutiques?.id;
    if(boutiqueId){
      // Responsable : canal privé + canal groupe
      const grp=getCanalGroupe(boutiqueId);
      const {data:msgs}=await sb.from('messages').select('id').eq('lu_responsable',false).neq('expediteur_id',currentUser.id).in('boutique_id',[boutiqueId,grp]);
      unread=(msgs||[]).length;
    }
  }
  if(badge){
    if(unread>0){
      badge.style.display='inline';
      badge.textContent=unread;
    } else {
      badge.style.display='none';
    }
  }
  if(currentUser.role==='pdg'){
    const {data}=await sb.from('besoins').select('id,article,urgence').eq('recu',false).eq('urgence','haute').order('created_at',{ascending:false});
    if(data&&data.length>0){
      const stored=localStorage.getItem('last_besoin_notif');
      const lastId=data[0].id;
      if(stored!==lastId){
        localStorage.setItem('last_besoin_notif',lastId);
        notif(`🔴 Nouveau besoin urgent : ${data[0].article}`,'error');
      }
    }
    // Notif toast pour nouvelles modifs
    const {data:newNotifs}=await sb.from('notifs_pdg').select('id,message').eq('lu',false).order('created_at',{ascending:false}).limit(1);
    if(newNotifs&&newNotifs.length>0){
      const stored=localStorage.getItem('last_pdg_notif');
      if(stored!==newNotifs[0].id){
        localStorage.setItem('last_pdg_notif',newNotifs[0].id);
        notif(`🔔 ${newNotifs[0].message}`,'error');
      }
    }
    // Vérifier stocks critiques pour notification PDG
    const {data:stocksCritiques}=await sb.from('stocks').select('produit,quantite,stock_minimum,boutiques(nom)').gt('stock_minimum',0).filter('quantite','lte','stock_minimum');
    if(stocksCritiques&&stocksCritiques.length>0){
      const stored=localStorage.getItem('last_stock_check');
      const today=new Date().toISOString().split('T')[0];
      if(stored!==today){
        localStorage.setItem('last_stock_check',today);
        notif(`🚨 ${stocksCritiques.length} produit(s) en stock critique !`,'error');
      }
    }
  }
  // Badge sondages non répondus
  if(currentUser) {
    try {
      const {data:sonds}=await sb.from('sondages').select('id').eq('actif',true);
      const repond=JSON.parse(localStorage.getItem('nance_sondages_repond_'+currentUser.id)||'[]');
      const nonRepond=(sonds||[]).filter(s=>!repond.includes(s.id)).length;
      const badge=document.getElementById('sondages-badge');
      if(badge){ badge.style.display=nonRepond>0?'inline':'none'; badge.textContent=nonRepond; }
    } catch(e){}
  }
  // Badge annonces non lues
  try {
    const {data:anns}=await sb.from('annonces').select('id').eq('active',true);
    const lues=JSON.parse(localStorage.getItem('nance_annonces_lues')||'[]');
    const nonLues=(anns||[]).filter(a=>!lues.includes(a.id)).length;
    const annBadge=document.getElementById('annonces-badge');
    if(annBadge){
      annBadge.style.display=nonLues>0?'inline':'none';
      annBadge.textContent=nonLues;
    }
  } catch(e){}
}

// ===================== NOTIFICATIONS PDG =====================
async function showNotifsPdg() {
  currentView='notifs_pdg'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Notifications de modifications';
  document.getElementById('topbar-boutique').textContent='Activités des responsables';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const {data}=await sb.from('notifs_pdg').select('*').order('created_at',{ascending:false}).limit(100);
  // Marquer tout comme lu
  await sb.from('notifs_pdg').update({lu:true}).eq('lu',false);
  const notifsBadge=document.getElementById('notifs-pdg-badge');
  if(notifsBadge){notifsBadge.style.display='none';notifsBadge.textContent='0';}
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin-bottom:0">Journal des modifications</div>
        <button class="btn btn-red btn-sm" onclick="clearAllNotifsPdg()">🗑 Tout effacer</button>
      </div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucune notification</p></div>':`
      <div style="display:flex;flex-direction:column;gap:10px">
        ${(data||[]).map(n=>{
          let details=null;
          try{details=JSON.parse(n.details);}catch(e){}
          const time=new Date(n.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
          const icon=n.type==='stock_modifie'?'📦':n.type==='employe_modifie'?'👤':'🏗';
          return `<div style="background:var(--bg3);border:1px solid ${n.lu?'var(--border)':'var(--accent)'};border-radius:10px;padding:14px;position:relative">
            ${!n.lu?`<div style="position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>`:''}
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:18px">${icon}</span>
              <div>
                <div style="font-weight:700;font-size:13px">${n.message}</div>
                <div style="font-size:11px;color:var(--text2)">${n.boutique_nom||''} • Par ${n.auteur||'?'} • ${time}</div>
              </div>
            </div>
            ${details?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
              <div style="background:var(--bg2);border:1px solid #f04f5e33;border-radius:8px;padding:10px">
                <div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;margin-bottom:6px">AVANT</div>
                ${Object.entries(details.ancien||{}).map(([k,v])=>`<div style="font-size:12px"><span style="color:var(--text2)">${k}:</span> <span>${v||'-'}</span></div>`).join('')}
              </div>
              <div style="background:var(--bg2);border:1px solid #22c97a33;border-radius:8px;padding:10px">
                <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;margin-bottom:6px">APRÈS</div>
                ${Object.entries(details.nouveau||{}).map(([k,v])=>`<div style="font-size:12px"><span style="color:var(--text2)">${k}:</span> <span style="font-weight:600">${v||'-'}</span></div>`).join('')}
              </div>
            </div>`:''}
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

async function clearAllNotifsPdg() {
  if(!confirm('Effacer toutes les notifications ?')) return;
  await sb.from('notifs_pdg').delete().neq('id','00000000-0000-0000-0000-000000000000');
  notif('Notifications effacées','success'); showNotifsPdg();
}

// ===================== RAPPELS & ÉCHÉANCES =====================
async function verifierRappels() {
  if(!currentUser||currentUser.role==='responsable') return;
  const today=new Date().toISOString().split('T')[0];
  const dans7j=new Date(Date.now()+7*86400000).toISOString().split('T')[0];

  // Rappels personnalisés à échéance
  const {data:rappels}=await sb.from('rappels').select('*').lte('date_echeance',dans7j).eq('fait',false).order('date_echeance');
  const nbRappels=(rappels||[]).length;

  // Immobilisations amorties
  const {data:immos}=await sb.from('immobilisations').select('*');
  const immoAmorties=(immos||[]).filter(im=>{
    const mois=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
    return mois>=(im.duree_amortissement||0)&&im.duree_amortissement>0;
  });

  // Badge total
  const total=nbRappels+immoAmorties.length;
  const badge=document.getElementById('rappels-badge');
  if(badge){
    badge.style.display=total>0?'inline':'none';
    badge.textContent=total;
  }

  // Toast pour rappels urgents du jour
  const urgents=(rappels||[]).filter(r=>r.date_echeance<=today);
  if(urgents.length>0){
    const stored=localStorage.getItem('last_rappel_toast');
    if(stored!==today){
      localStorage.setItem('last_rappel_toast',today);
      notif(`⏰ ${urgents.length} rappel(s) arrivent à échéance aujourd'hui !`,'error');
      // Telegram
      await envoyerTelegram(`⏰ <b>Rappels du jour — Nance Group</b>\n\n${urgents.map(r=>`• ${r.titre} (${r.boutique_nom||'Global'})`).join('\n')}`);
    }
  }
}

async function showRappels() {
  currentView='rappels'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Rappels & Échéances';
  document.getElementById('topbar-boutique').textContent='Alertes automatiques et personnalisées';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const today=new Date().toISOString().split('T')[0];
  const isPdg=currentUser.role==='pdg';

  // Charger rappels personnalisés
  const {data:rappels}=await sb.from('rappels').select('*').order('date_echeance');

  // Immobilisations amorties
  const {data:immos}=await sb.from('immobilisations').select('*,boutiques(nom)');
  const immoAmorties=(immos||[]).filter(im=>{
    const mois=Math.floor((Date.now()-new Date(im.date_acquisition).getTime())/(1000*60*60*24*30));
    return mois>=(im.duree_amortissement||0)&&im.duree_amortissement>0;
  });

  // Contrats employés (ceux avec date_fin_contrat dans 30j)
  const {data:employes}=await sb.from('employes').select('*,boutiques(nom)');
  const dans30j=new Date(Date.now()+30*86400000).toISOString().split('T')[0];
  const contratsExpires=(employes||[]).filter(e=>e.date_fin_contrat&&e.date_fin_contrat<=dans30j&&e.actif);

  document.getElementById('content').innerHTML=`
    <!-- Ajouter rappel -->
    <div class="card">
      <div class="card-title">➕ Ajouter un rappel personnalisé</div>
      <div class="form-row">
        <div style="flex:2"><label class="inp-label">Titre du rappel</label><input class="inp" id="rapp-titre" placeholder="Ex: Renouveler contrat Jean, Payer loyer..."></div>
        <div><label class="inp-label">Date d'échéance</label><input class="inp" id="rapp-date" type="date" value="${today}"></div>
        <div><label class="inp-label">Boutique concernée</label>
          <select class="inp" id="rapp-boutique">
            <option value="">🌍 Toute l'entreprise</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Priorité</label>
          <select class="inp" id="rapp-priorite">
            <option value="haute">🔴 Haute</option>
            <option value="moyenne" selected>🟡 Moyenne</option>
            <option value="basse">🟢 Basse</option>
          </select>
        </div>
        <div style="flex:2"><label class="inp-label">Description (optionnel)</label><input class="inp" id="rapp-desc" placeholder="Détails..."></div>
      </div>
      <button class="btn btn-accent" onclick="ajouterRappel()">+ Ajouter le rappel</button>
    </div>

    <!-- Rappels personnalisés -->
    <div class="card">
      <div class="card-title">📋 Rappels personnalisés (${(rappels||[]).filter(r=>!r.fait).length} actifs)</div>
      ${(rappels||[]).length===0?'<div style="color:var(--text2)">Aucun rappel</div>':
      `<div style="display:flex;flex-direction:column;gap:8px">
        ${(rappels||[]).map(r=>{
          const b=boutiques.find(x=>x.id===r.boutique_id);
          const estPasse=r.date_echeance<today;
          const estAujourd=r.date_echeance===today;
          const couleur=r.fait?'var(--text2)':estPasse?'var(--red)':estAujourd?'var(--amber)':'var(--text)';
          const icon=r.priorite==='haute'?'🔴':r.priorite==='moyenne'?'🟡':'🟢';
          return `<div style="background:var(--bg3);border:1px solid ${r.fait?'var(--border)':estPasse?'var(--red)33':estAujourd?'var(--amber)33':'var(--border)'};border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;${r.fait?'opacity:0.6':''}">
            <div style="font-size:20px">${r.fait?'✅':icon}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px;color:${couleur};text-decoration:${r.fait?'line-through':'none'}">${r.titre}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px">
                📅 ${new Date(r.date_echeance+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
                ${estPasse&&!r.fait?'<span style="color:var(--red);font-weight:700"> — EN RETARD</span>':''}
                ${estAujourd&&!r.fait?'<span style="color:var(--amber);font-weight:700"> — AUJOURD\'HUI</span>':''}
                ${b?` • ${b.nom}`:''}
                ${r.description?` • ${r.description}`:''}
              </div>
            </div>
            <div style="display:flex;gap:4px">
              ${!r.fait?`<button class="btn btn-green btn-sm" onclick="marquerRappelFait('${r.id}')">✅</button>`:''}
              ${isPdg?`<button class="btn btn-red btn-sm" onclick="supprimerRappel('${r.id}')">✕</button>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>

    <!-- Immobilisations amorties -->
    ${immoAmorties.length>0?`<div class="card">
      <div class="card-title">🏗 Immobilisations totalement amorties (${immoAmorties.length})</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Ces immobilisations sont soldées — à renouveler ou retirer de l'inventaire</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Désignation</th><th>Boutique</th><th>Prix achat</th><th>Date achat</th><th>Durée</th></tr></thead>
        <tbody>${immoAmorties.map(im=>`<tr>
          <td style="font-weight:700">${im.designation}</td>
          <td>${im.boutiques?.nom||'-'}</td>
          <td style="color:var(--amber)">${fmt(im.prix_achat||0)} FCFA</td>
          <td style="color:var(--text2)">${im.date_acquisition}</td>
          <td style="color:var(--green)">✅ ${im.duree_amortissement} mois soldés</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`:''}

    <!-- Contrats expirés -->
    ${contratsExpires.length>0?`<div class="card">
      <div class="card-title">👤 Contrats à renouveler dans 30 jours (${contratsExpires.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Employé</th><th>Boutique</th><th>Poste</th><th>Fin de contrat</th><th>Jours restants</th></tr></thead>
        <tbody>${contratsExpires.map(e=>{
          const jours=Math.ceil((new Date(e.date_fin_contrat)-new Date())/(1000*60*60*24));
          return `<tr>
            <td style="font-weight:700">${e.nom}</td>
            <td>${e.boutiques?.nom||'-'}</td>
            <td>${e.poste||'-'}</td>
            <td style="color:var(--amber)">${e.date_fin_contrat}</td>
            <td style="color:${jours<=7?'var(--red)':'var(--amber)'};font-weight:700">${jours<=0?'⚠️ EXPIRÉ':jours+' jours'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`:'<div class="card"><div style="color:var(--green);font-size:13px">✅ Aucun contrat n\'expire dans les 30 prochains jours</div></div>'}`;
}

async function ajouterRappel() {
  const titre=document.getElementById('rapp-titre').value.trim();
  const date=document.getElementById('rapp-date').value;
  const boutique_id=document.getElementById('rapp-boutique').value||null;
  const priorite=document.getElementById('rapp-priorite').value;
  const desc=document.getElementById('rapp-desc').value.trim();
  if(!titre) return notif('Entrez le titre du rappel','error');
  if(!date) return notif('Choisissez une date','error');
  const b=boutiques.find(x=>x.id===boutique_id);
  await sb.from('rappels').insert({titre,date_echeance:date,boutique_id,boutique_nom:b?.nom||'Global',priorite,description:desc||null,fait:false});
  notif('Rappel ajouté ✓','success');
  showRappels();
}

async function marquerRappelFait(id) {
  await sb.from('rappels').update({fait:true}).eq('id',id);
  notif('Rappel marqué comme fait ✓','success');
  showRappels();
}

async function supprimerRappel(id) {
  if(!confirm('Supprimer ce rappel ?')) return;
  await sb.from('rappels').delete().eq('id',id);
  notif('Rappel supprimé','success');
  showRappels();
}
