// Nance Group — module sauvegarde
// ===================== SAUVEGARDE AUTOMATIQUE =====================
async function verifierSauvegardeAuto() {
  if(!currentUser||currentUser.role!=='pdg') return;
  const now=new Date();
  const today=now.toISOString().split('T')[0];
  const heure=now.getHours();
  const config=JSON.parse(localStorage.getItem('nance_sauvegarde_config')||'{}');
  const heureConfig=parseInt(config.heure)||20; // Heure configurable, 20h par défaut
  if(heure!==heureConfig) return;
  // Envoyer résumé quotidien Telegram
  await envoyerResumeTelegram();


  // Sauvegarde journalière
  if(config.jour!==false){
    const stored=localStorage.getItem('last_sauvegarde_jour');
    if(stored!==today){
      localStorage.setItem('last_sauvegarde_jour',today);
      await lancerSauvegarde('journalier',today);
    }
  }

  // Sauvegarde hebdomadaire (lundi)
  if(config.semaine!==false && now.getDay()===1){
    const semaine=today.substring(0,7)+'-S'+Math.ceil(now.getDate()/7);
    const stored=localStorage.getItem('last_sauvegarde_semaine');
    if(stored!==semaine){
      localStorage.setItem('last_sauvegarde_semaine',semaine);
      await lancerSauvegarde('hebdomadaire',today);
    }
  }

  // Sauvegarde mensuelle (1er du mois)
  if(config.mois!==false && now.getDate()===1){
    const mois=today.substring(0,7);
    const stored=localStorage.getItem('last_sauvegarde_mois');
    if(stored!==mois){
      localStorage.setItem('last_sauvegarde_mois',mois);
      await lancerSauvegarde('mensuel',today);
    }
  }
}

async function lancerSauvegarde(type, date) {
  try {
    // Collecter toutes les données
    const bList=boutiques;
    const rows=await Promise.all(bList.map(async b=>{
      const [{data:rec},{data:dep},{data:stk},{data:emp}]=await Promise.all([
        sb.from('recettes').select('*').eq('boutique_id',b.id).gte('date',date.substring(0,7)+'-01').lte('date',date),
        sb.from('depenses').select('*').eq('boutique_id',b.id).gte('date',date.substring(0,7)+'-01').lte('date',date),
        sb.from('stocks').select('*').eq('boutique_id',b.id),
        sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true),
      ]);
      return {b,rec:rec||[],dep:dep||[],stk:stk||[],emp:emp||[]};
    }));

    // Générer PDF
    await genererSauvegardePdf(type,date,rows);

    // Générer Excel
    await genererSauvegardeExcel(type,date,rows);

    // Notif Telegram
    const totalRec=rows.reduce((s,r)=>s+r.rec.reduce((ss,x)=>ss+parseFloat(x.montant),0),0);
    const totalDep=rows.reduce((s,r)=>s+r.dep.reduce((ss,x)=>ss+parseFloat(x.montant),0),0);
    await envoyerTelegram(`💾 <b>Sauvegarde ${type} — Nance Group</b>\n\n📅 Date : ${date}\n💰 Recettes : ${fmt(totalRec)} FCFA\n💸 Dépenses : ${fmt(totalDep)} FCFA\n📊 Solde : ${fmt(totalRec-totalDep)} FCFA\n\n✅ Sauvegarde téléchargée automatiquement`);

    notif(`💾 Sauvegarde ${type} effectuée ✓`,'success');
  } catch(e) {
    console.error('Sauvegarde error:', e);
  }
}

async function genererSauvegardePdf(type,date,rows) {
  const now=new Date().toLocaleString('fr-FR');
  const moisLabel=new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sauvegarde ${type}</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px;color:#1a1d2e}
  h1{color:#B87333;font-size:18px}h2{color:#B87333;font-size:14px;border-bottom:1px solid #B87333;padding-bottom:4px;margin-top:16px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
  th{background:#B87333;color:#fff;padding:5px 6px;text-align:left}
  td{padding:4px 6px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .green{color:#16a060}.red{color:#e03545}.total{font-weight:bold;background:#e8e8ff}
  .page{page-break-after:always}
  </style></head><body>
  <h1>💾 Sauvegarde ${type} — Nance Group</h1>
  <p><b>Période :</b> ${moisLabel} | <b>Générée le :</b> ${now}</p>
  ${rows.map(({b,rec,dep,stk,emp},i)=>{
    const totRec=rec.reduce((s,r)=>s+parseFloat(r.montant),0);
    const totDep=dep.reduce((s,d)=>s+parseFloat(d.montant),0);
    return `<div class="${i<rows.length-1?'page':''}">
      <h2>${b.nom} — ${b.lieu||''}</h2>
      <p>💰 Recettes: <b>${fmt(totRec)} FCFA</b> | 💸 Dépenses: <b>${fmt(totDep)} FCFA</b> | 📊 Solde: <b>${fmt(totRec-totDep)} FCFA</b></p>
      ${rec.length>0?`<h3>Recettes (${rec.length})</h3>
      <table><thead><tr><th>Date</th><th>Description</th><th>Mode</th><th>Montant</th></tr></thead>
      <tbody>${rec.map(r=>`<tr><td>${r.date}</td><td>${r.description}</td><td>${r.mode_paiement}</td><td class="green">${fmt(r.montant)} FCFA</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTAL</td><td class="green">${fmt(totRec)} FCFA</td></tr></tbody></table>`:''}
      ${dep.length>0?`<h3>Dépenses (${dep.length})</h3>
      <table><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
      <tbody>${dep.map(d=>`<tr><td>${d.date}</td><td>${d.description}</td><td>${d.categorie}</td><td class="red">${fmt(d.montant)} FCFA</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTAL</td><td class="red">${fmt(totDep)} FCFA</td></tr></tbody></table>`:''}
      ${stk.length>0?`<h3>Stocks (${stk.length} produits)</h3>
      <table><thead><tr><th>Produit</th><th>Quantité</th><th>Prix vente</th></tr></thead>
      <tbody>${stk.map(p=>`<tr><td>${p.produit}</td><td>${p.quantite}</td><td>${fmt(p.prix_vente)} FCFA</td></tr>`).join('')}</tbody></table>`:''}
    </div>`;
  }).join('')}
  </body></html>`;

  const win=window.open('','_blank');
  if(win){ win.document.write(html); win.document.close(); win.onload=()=>win.print(); }
}

async function genererSauvegardeExcel(type,date,rows) {
  // Créer CSV (compatible Excel)
  let csv='Boutique,Type,Date,Description,Catégorie/Mode,Montant\n';
  rows.forEach(({b,rec,dep})=>{
    rec.forEach(r=>{ csv+=`"${b.nom}","Recette","${r.date}","${r.description}","${r.mode_paiement}","${r.montant}"\n`; });
    dep.forEach(d=>{ csv+=`"${b.nom}","Dépense","${d.date}","${d.description}","${d.categorie}","${d.montant}"\n`; });
  });
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`sauvegarde_${type}_${date}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function showSauvegarde() {
  currentView='sauvegarde'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Sauvegarde automatique';
  document.getElementById('topbar-boutique').textContent='Paramètres et sauvegarde manuelle';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const config=JSON.parse(localStorage.getItem('nance_sauvegarde_config')||'{"jour":true,"semaine":true,"mois":true,"heure":20}');
  const heureConfig=parseInt(config.heure)||20;
  const dernierJour=localStorage.getItem('last_sauvegarde_jour')||'Jamais';
  const dernierSemaine=localStorage.getItem('last_sauvegarde_semaine')||'Jamais';
  const dernierMois=localStorage.getItem('last_sauvegarde_mois')||'Jamais';

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">⚙️ Configuration des sauvegardes automatiques</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Les sauvegardes se déclenchent automatiquement à l'heure choisie quand tu es connecté.</div>

      <div style="margin-bottom:16px;background:var(--bg3);border-radius:10px;padding:14px">
        <label class="inp-label">🕐 Heure de déclenchement automatique</label>
        <select class="inp" id="sav-heure" style="width:180px">
          ${Array.from({length:24},(_,i)=>`<option value="${i}" ${i===heureConfig?'selected':''}>${String(i).padStart(2,'0')}:00</option>`).join('')}
        </select>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
        <label style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border-radius:10px;padding:14px;cursor:pointer">
          <div>
            <div style="font-weight:700">📅 Sauvegarde journalière</div>
            <div style="font-size:12px;color:var(--text2)">Dernière : ${dernierJour}</div>
          </div>
          <input type="checkbox" id="sav-jour" ${config.jour!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)">
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border-radius:10px;padding:14px;cursor:pointer">
          <div>
            <div style="font-weight:700">📆 Sauvegarde hebdomadaire</div>
            <div style="font-size:12px;color:var(--text2)">Chaque lundi | Dernière : ${dernierSemaine}</div>
          </div>
          <input type="checkbox" id="sav-sem" ${config.semaine!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)">
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border-radius:10px;padding:14px;cursor:pointer">
          <div>
            <div style="font-weight:700">🗓 Sauvegarde mensuelle</div>
            <div style="font-size:12px;color:var(--text2)">Le 1er de chaque mois | Dernière : ${dernierMois}</div>
          </div>
          <input type="checkbox" id="sav-mois" ${config.mois!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)">
        </label>
      </div>
      <button class="btn btn-accent" onclick="sauvegarderConfig()">💾 Enregistrer la configuration</button>
    </div>

    <div class="card">
      <div class="card-title">🔧 Sauvegarde manuelle</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Générer une sauvegarde maintenant sans attendre l'heure automatique.</div>
      <div class="form-row">
        <div><label class="inp-label">Période</label>
          <select class="inp" id="sav-periode">
            <option value="aujourd_hui">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois" selected>Ce mois</option>
            <option value="tout">Tout l'historique</option>
          </select>
        </div>
        <div><label class="inp-label">Format</label>
          <select class="inp" id="sav-format">
            <option value="pdf_excel">PDF + Excel (CSV)</option>
            <option value="pdf">PDF uniquement</option>
            <option value="excel">Excel (CSV) uniquement</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="sauvegardeManuelle()">⬇️ Télécharger maintenant</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📊 Résumé des sauvegardes</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">📅 Dernière sauvegarde jour</div><div class="stat-value accent" style="font-size:16px">${dernierJour}</div></div>
        <div class="stat-card"><div class="stat-label">📆 Dernière sauvegarde semaine</div><div class="stat-value accent" style="font-size:16px">${dernierSemaine}</div></div>
        <div class="stat-card"><div class="stat-label">🗓 Dernière sauvegarde mois</div><div class="stat-value accent" style="font-size:16px">${dernierMois}</div></div>
      </div>
    </div>`;
}

function sauvegarderConfig() {
  const config={
    jour:document.getElementById('sav-jour').checked,
    semaine:document.getElementById('sav-sem').checked,
    mois:document.getElementById('sav-mois').checked,
    heure:parseInt(document.getElementById('sav-heure').value)||20,
  };
  localStorage.setItem('nance_sauvegarde_config',JSON.stringify(config));
  notif(`Configuration sauvegardée ✓ — Déclenchement à ${String(config.heure).padStart(2,'0')}:00`,'success');
}

async function sauvegardeManuelle() {
  const periode=document.getElementById('sav-periode').value;
  const format=document.getElementById('sav-format').value;
  const today=new Date().toISOString().split('T')[0];
  let dateDebut=today;
  if(periode==='semaine'){
    const d=new Date(); d.setDate(d.getDate()-d.getDay()+1);
    dateDebut=d.toISOString().split('T')[0];
  } else if(periode==='mois'){
    dateDebut=today.substring(0,7)+'-01';
  } else if(periode==='tout'){
    dateDebut='2020-01-01';
  }

  notif('Génération en cours...','success');

  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:rec},{data:dep},{data:stk},{data:emp}]=await Promise.all([
      sb.from('recettes').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',today),
      sb.from('depenses').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',today),
      sb.from('stocks').select('*').eq('boutique_id',b.id),
      sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true),
    ]);
    return {b,rec:rec||[],dep:dep||[],stk:stk||[],emp:emp||[]};
  }));

  if(format!=='excel') await genererSauvegardePdf('manuelle',today,rows);
  if(format!=='pdf') await genererSauvegardeExcel('manuelle',today,rows);

  const totalRec=rows.reduce((s,r)=>s+r.rec.reduce((ss,x)=>ss+parseFloat(x.montant),0),0);
  const totalDep=rows.reduce((s,r)=>s+r.dep.reduce((ss,x)=>ss+parseFloat(x.montant),0),0);
  await envoyerTelegram(`💾 <b>Sauvegarde manuelle — Nance Group</b>\n\n📅 Période : ${dateDebut} → ${today}\n💰 Recettes : ${fmt(totalRec)} FCFA\n💸 Dépenses : ${fmt(totalDep)} FCFA\n📊 Solde : ${fmt(totalRec-totalDep)} FCFA\n\n✅ Fichier(s) téléchargé(s)`);
  notif('Sauvegarde générée ✓','success');
}
