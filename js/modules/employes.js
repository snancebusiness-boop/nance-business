// Nance Group — module employes
// ===================== EMPLOYES =====================
async function renderEmployes() {
  const {data}=await sb.from('employes').select('*').eq('boutique_id',currentBoutique.id).order('nom');
  const isPdg=currentUser.role==='pdg';
  document.getElementById('content').innerHTML=`
    ${isPdg?`<div class="card">
      <div class="card-title">Ajouter un employé</div>
      <div class="form-row">
        <div><label class="inp-label">Nom complet</label><input class="inp" id="emp-nom" placeholder="Prénom Nom"></div>
        <div><label class="inp-label">Poste</label><input class="inp" id="emp-poste" placeholder="Ex: Vendeur, Caissier..."></div>
        <div><label class="inp-label">Téléphone</label><input class="inp" id="emp-tel" placeholder="+242..."></div>
        <div><label class="inp-label">Email</label><input class="inp" id="emp-email" placeholder="email@..."></div>
        <div><label class="inp-label">Adresse</label><input class="inp" id="emp-adresse" placeholder="Quartier, ville..."></div>
        <div><label class="inp-label">Contact urgence (nom)</label><input class="inp" id="emp-urg-nom" placeholder="Nom du contact"></div>
        <div><label class="inp-label">Contact urgence (tél)</label><input class="inp" id="emp-urg-tel" placeholder="+242..."></div>
        <div><label class="inp-label">💰 Salaire fixe (FCFA)</label><input class="inp" id="emp-salaire" type="number" placeholder="0"></div>
        <div><label class="inp-label">📦 Recette journalière fixe</label><input class="inp" id="emp-recette-jour" type="number" placeholder="Ex: 15000"></div>
        <div><label class="inp-label">📊 Pourcentage salaire (%)</label><input class="inp" id="emp-pct" type="number" placeholder="Ex: 25" min="0" max="100"></div>
        <div><label class="inp-label">📅 Date d'embauche</label><input class="inp" id="emp-embauche" type="date"></div>
        <div><label class="inp-label">🏖 Jour de repos</label>
          <select class="inp" id="emp-repos">
            <option value="">Aucun</option>
            <option value="lundi">Lundi</option>
            <option value="mardi">Mardi</option>
            <option value="mercredi">Mercredi</option>
            <option value="jeudi">Jeudi</option>
            <option value="vendredi">Vendredi</option>
            <option value="samedi">Samedi</option>
            <option value="dimanche">Dimanche</option>
          </select>
        </div>
      </div>
      <button class="btn btn-accent" onclick="addEmploye()">+ Ajouter</button>
    </div>`:'<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:20px">🔒 Seul le PDG peut modifier les employés</div>'}
    <div class="card">
      <div class="card-title">Équipe (${(data||[]).length} personnes)</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucun employé enregistré</p></div>':`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin-bottom:0">Employés (${(data||[]).length})</div>
        ${isPdg?`<button class="btn btn-ghost btn-sm" onclick="exportTousEmployesPdf()">📄 Exporter toutes les fiches PDF</button>`:''}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Photo</th><th>Nom</th><th>Poste</th><th>Téléphone</th><th>🏖 Repos</th><th>📅 Ancienneté</th>${isPdg?'<th>💰 Salaire</th>':''}<th>Statut</th>${isPdg?'<th>Actions</th>':''}</tr></thead>
        <tbody>${(data||[]).map(e=>`<tr>
          <td>
            <div style="position:relative;display:inline-block">
              ${e.photo_url
                ?`<img src="${e.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--accent)">`
                :`<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid var(--border)">👤</div>`}
              <label style="position:absolute;bottom:-2px;right:-2px;cursor:pointer;background:var(--accent);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:10px" title="Changer photo">
                <input type="file" accept="image/*" style="display:none" onchange="uploadPhotoEmploye('${e.id}',this)">📷</label>
            </div>
          </td>
          <td style="font-weight:600">${e.nom}</td>
          <td>${e.poste||'-'}</td>
          <td style="color:var(--text2)">${e.telephone||'-'}</td>
          <td style="color:var(--accent);font-size:12px">${e.jour_repos?'🏖 '+e.jour_repos:'-'}</td>
          <td style="font-size:12px;color:var(--text2)">${(()=>{
            if(!e.date_embauche) return '—';
            const diff=Math.floor((new Date()-new Date(e.date_embauche))/(1000*60*60*24));
            const ans=Math.floor(diff/365); const mois=Math.floor((diff%365)/30);
            return ans>0?`${ans}an${ans>1?'s':''} ${mois}mois`:`${mois} mois`;
          })()}</td>
          ${isPdg?`<td style="font-weight:600;color:var(--amber)">${e.salaire?fmt(e.salaire)+' FCFA':e.recette_journaliere?fmt(e.recette_journaliere)+' FCFA/j':'-'}</td>`:''}
          <td><span class="badge ${e.actif?'badge-green':'badge-gray'}">${e.actif?'Actif':'Inactif'}</span></td>
          ${isPdg?`<td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm" onclick="exportFicheEmployePdf('${e.id}')" title="Fiche PDF">📄</button>
              <button class="btn btn-ghost btn-sm" onclick="exportContratPdf('${e.id}')" title="Contrat PDF">📋</button>
              <button class="btn btn-ghost btn-sm" onclick="showAbsencesEmploye('${e.id}','${e.nom.replace(/'/g,"\\'")}')">📅</button>
              <button class="btn btn-amber btn-sm" onclick="editEmploye('${e.id}')">✏️</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleEmploye('${e.id}',${e.actif})">${e.actif?'⏸':'▶'}</button>
              <button class="btn btn-red btn-sm" onclick="delEmploye('${e.id}')">✕</button>
            </div>
          </td>`:''}
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`;
  // Stocker les données employés pour les modals
  window._employes = data||[];
}

async function exportFicheEmployePdf(empId) {
  const {data:e}=await sb.from('employes').select('*').eq('id',empId).single();
  if(!e) return;
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fiche ${e.nom}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:30px;color:#1a1d2e;font-size:12px}
    .header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #B87333;padding-bottom:16px;margin-bottom:20px}
    .photo{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #B87333}
    .photo-placeholder{width:80px;height:80px;border-radius:50%;background:#f0f0ff;border:3px solid #B87333;display:flex;align-items:center;justify-content:center;font-size:36px}
    h1{color:#B87333;font-size:20px;margin:0}
    h2{color:#B87333;font-size:14px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-top:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .field{background:#f5f5ff;border-radius:6px;padding:8px 12px}
    .field label{font-size:10px;color:#666;text-transform:uppercase;display:block;margin-bottom:2px}
    .field value{font-weight:600;font-size:12px}
    .badge{display:inline-block;padding:3px 12px;border-radius:8px;font-size:11px;font-weight:700}
    .badge-active{background:#dcfce7;color:#16a060}
    .badge-inactive{background:#fee2e2;color:#e03545}
    .footer{margin-top:30px;font-size:10px;color:#999;border-top:1px solid #e0e0e0;padding-top:8px;text-align:center}
  </style></head><body>
  <div class="header">
    ${e.photo_url?`<img src="${e.photo_url}" class="photo">`:`<div class="photo-placeholder">👤</div>`}
    <div>
      <h1>${e.nom}</h1>
      <div style="color:#666;font-size:13px;margin-top:4px">${e.poste||'Sans poste'} • ${currentBoutique?.nom||''}</div>
      <span class="badge ${e.actif?'badge-active':'badge-inactive'}">${e.actif?'✅ Actif':'❌ Inactif'}</span>
    </div>
  </div>

  <h2>📋 Informations personnelles</h2>
  <div class="grid">
    <div class="field"><label>Nom complet</label><div>${e.nom}</div></div>
    <div class="field"><label>Poste</label><div>${e.poste||'—'}</div></div>
    <div class="field"><label>Téléphone</label><div>${e.telephone||'—'}</div></div>
    <div class="field"><label>Email</label><div>${e.email||'—'}</div></div>
    <div class="field"><label>Adresse</label><div>${e.adresse||'—'}</div></div>
    <div class="field"><label>Jour de repos</label><div>${e.jour_repos||'—'}</div></div>
  </div>

  <h2>🚨 Contact d'urgence</h2>
  <div class="grid">
    <div class="field"><label>Nom</label><div>${e.urgence_nom||'—'}</div></div>
    <div class="field"><label>Téléphone</label><div>${e.urgence_tel||'—'}</div></div>
  </div>

  <h2>💰 Informations salariales</h2>
  <div class="grid">
    <div class="field"><label>Salaire fixe</label><div>${e.salaire?fmt(e.salaire)+' FCFA':'—'}</div></div>
    <div class="field"><label>Recette journalière</label><div>${e.recette_journaliere?fmt(e.recette_journaliere)+' FCFA':'—'}</div></div>
    <div class="field"><label>Pourcentage salaire</label><div>${e.pourcentage_salaire?e.pourcentage_salaire+'%':'—'}</div></div>
    <div class="field"><label>Date d'embauche</label><div>${e.date_embauche?new Date(e.date_embauche).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'—'}</div></div>
    <div class="field"><label>Ancienneté</label><div>${(()=>{if(!e.date_embauche)return '—';const diff=Math.floor((new Date()-new Date(e.date_embauche))/(1000*60*60*24));const ans=Math.floor(diff/365);const mois=Math.floor((diff%365)/30);return ans>0?`${ans} an${ans>1?'s':''} et ${mois} mois`:`${mois} mois`;})()}</div></div>
    <div class="field"><label>Date fin contrat</label><div>${e.date_fin_contrat||'—'}</div></div>
  </div>

  <h2>✍️ Signatures</h2>
  <div style="display:flex;gap:40px;margin-top:40px">
    <div style="flex:1;text-align:center;border-top:1px solid #ccc;padding-top:8px">Signature employé</div>
    <div style="flex:1;text-align:center;border-top:1px solid #ccc;padding-top:8px">Signature employeur</div>
  </div>

  <div class="footer">Généré le ${now} — Nance Group</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function exportContratPdf(empId) {
  const {data:e}=await sb.from('employes').select('*,boutiques(nom)').eq('id',empId).single();
  if(!e) return;
  const {data:pdg}=await sb.from('comptes').select('nom_complet').eq('role','pdg').single();
  const now=new Date().toLocaleString('fr-FR');
  const today=new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrat — ${e.nom}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#1a1d2e;font-size:12px;max-width:800px;margin:0 auto}
    h1{color:#B87333;font-size:20px;text-align:center;margin-bottom:4px}
    h2{color:#B87333;font-size:14px;margin-top:24px;border-bottom:1px solid #B87333;padding-bottom:4px}
    .header{text-align:center;border-bottom:2px solid #B87333;padding-bottom:16px;margin-bottom:24px}
    .article{margin-bottom:16px;line-height:1.8}
    .article b{color:#B87333}
    .sign{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
    .sign div{flex:1;text-align:center}
    .sign .ligne{border-top:1px solid #ccc;margin-top:40px;padding-top:8px;font-size:11px;color:#666}
    .footer{margin-top:30px;font-size:10px;color:#999;border-top:1px solid #e0e0e0;padding-top:8px;text-align:center}
  </style></head><body>
  <div class="header">
    <h1>CONTRAT DE TRAVAIL</h1>
    <div style="color:#666;margin-top:4px">${e.boutiques?.nom||''} • République du Congo</div>
  </div>

  <div class="article">
    <b>Entre les soussignés :</b><br>
    <b>L'employeur :</b> ${e.boutiques?.nom||'[Nom entreprise]'}, représenté par ${pdg?.nom_complet||'[Nom PDG]'}, ci-après dénommé "l'Employeur".<br><br>
    <b>Et :</b><br>
    <b>L'employé(e) :</b> ${e.nom}, ci-après dénommé "l'Employé(e)".
  </div>

  <h2>Article 1 — Engagement</h2>
  <div class="article">
    L'Employeur engage l'Employé(e) en qualité de <b>${e.poste||'[Poste]'}</b> à compter du <b>${e.date_embauche?new Date(e.date_embauche).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'[Date d\'embauche]'}</b>.
  </div>

  <h2>Article 2 — Durée</h2>
  <div class="article">
    ${e.date_fin_contrat?`Le présent contrat est conclu pour une durée déterminée allant jusqu'au <b>${new Date(e.date_fin_contrat).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</b>.`:`Le présent contrat est conclu pour une durée <b>indéterminée</b>.`}
  </div>

  <h2>Article 3 — Rémunération</h2>
  <div class="article">
    ${e.salaire?`L'Employé(e) percevra un salaire mensuel brut de <b>${fmt(e.salaire)} FCFA</b>.`:
    e.recette_journaliere?`L'Employé(e) percevra <b>${e.pourcentage_salaire||'?'}%</b> de la recette journalière fixée à <b>${fmt(e.recette_journaliere)} FCFA/jour</b>.`:
    `La rémunération sera définie selon les termes convenus entre les parties.`}
  </div>

  <h2>Article 4 — Horaires & Repos</h2>
  <div class="article">
    L'Employé(e) exercera ses fonctions selon les horaires définis par l'Employeur.
    ${e.jour_repos?`Le jour de repos hebdomadaire est fixé au <b>${e.jour_repos}</b>.`:''}
  </div>

  <h2>Article 5 — Obligations</h2>
  <div class="article">
    L'Employé(e) s'engage à respecter le règlement intérieur, à accomplir ses tâches avec diligence et à préserver la confidentialité des informations de l'entreprise.
  </div>

  <div style="margin-top:24px;color:#666;font-size:11px">Fait à ${e.boutiques?.nom||'[Lieu]'}, le ${today}, en deux exemplaires originaux.</div>

  <div class="sign">
    <div>
      <div style="font-weight:700">${pdg?.nom_complet||'L\'Employeur'}</div>
      <div style="font-size:11px;color:#666">Signature et cachet</div>
      <div class="ligne">Lu et approuvé</div>
    </div>
    <div>
      <div style="font-weight:700">${e.nom}</div>
      <div style="font-size:11px;color:#666">L'Employé(e)</div>
      <div class="ligne">Lu et approuvé</div>
    </div>
  </div>

  <div class="footer">Document généré le ${now} — Nance Group</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function showAbsencesEmploye(empId, empNom) {
  const {data:presences}=await sb.from('presences').select('*').eq('employe_id',empId).order('date',{ascending:false});
  const absences=(presences||[]).filter(p=>p.statut==='absent');
  const retards=(presences||[]).filter(p=>p.statut==='retard');
  const conges=(presences||[]).filter(p=>p.statut==='conge');

  // Grouper par mois
  const parMois={};
  absences.forEach(p=>{
    const m=p.date.substring(0,7);
    if(!parMois[m])parMois[m]={absences:0,retards:0,conges:0};
    parMois[m].absences++;
  });
  retards.forEach(p=>{
    const m=p.date.substring(0,7);
    if(!parMois[m])parMois[m]={absences:0,retards:0,conges:0};
    parMois[m].retards++;
  });
  conges.forEach(p=>{
    const m=p.date.substring(0,7);
    if(!parMois[m])parMois[m]={absences:0,retards:0,conges:0};
    parMois[m].conges++;
  });

  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:580px;max-height:85vh;overflow-y:auto">
    <div class="modal-title">📅 Historique des absences — ${empNom}</div>
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card"><div class="stat-label">❌ Total absences</div><div class="stat-value red">${absences.length}</div></div>
      <div class="stat-card"><div class="stat-label">⚠️ Total retards</div><div class="stat-value amber">${retards.length}</div></div>
      <div class="stat-card"><div class="stat-label">🏖 Total congés</div><div class="stat-value accent">${conges.length}</div></div>
    </div>

    ${Object.keys(parMois).length>0?`
    <div style="font-weight:700;margin-bottom:8px">Par mois</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Mois</th><th>Absences</th><th>Retards</th><th>Congés</th></tr></thead>
      <tbody>${Object.entries(parMois).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>`<tr>
        <td>${new Date(m+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</td>
        <td style="color:var(--red);font-weight:600">${v.absences}</td>
        <td style="color:var(--amber)">${v.retards}</td>
        <td style="color:var(--accent)">${v.conges}</td>
      </tr>`).join('')}</tbody>
    </table></div>`:''}

    <div style="font-weight:700;margin:12px 0 8px">Détail des absences</div>
    ${absences.length===0?'<div style="color:var(--text2)">Aucune absence enregistrée</div>':
    `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Statut</th><th>Note</th></tr></thead>
      <tbody>${[...absences,...retards,...conges].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<tr>
        <td>${new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR')}</td>
        <td><span class="badge ${p.statut==='absent'?'badge-red':p.statut==='retard'?'badge-amber':'badge-accent'}">${p.statut}</span></td>
        <td style="color:var(--text2)">${p.note||'-'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`}

    <div class="modal-actions">
      <button class="btn btn-ghost btn-sm" onclick="exportAbsencesPdf('${empId}','${empNom.replace(/'/g,"\\'")}')">📄 Export PDF</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

async function exportAbsencesPdf(empId, empNom) {
  const {data:presences}=await sb.from('presences').select('*').eq('employe_id',empId).order('date',{ascending:false});
  const absences=(presences||[]).filter(p=>p.statut!=='present');
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Absences — ${empNom}</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px;color:#1a1d2e}
  h1{color:#B87333}table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#B87333;color:#fff;padding:6px 8px}td{padding:5px 8px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .absent{color:#e03545}.retard{color:#d97706}.conge{color:#B87333}
  </style></head><body>
  <h1>📅 Historique des absences — ${empNom}</h1>
  <p>Total: ${absences.filter(p=>p.statut==='absent').length} absence(s), ${absences.filter(p=>p.statut==='retard').length} retard(s), ${absences.filter(p=>p.statut==='conge').length} congé(s)</p>
  <table><thead><tr><th>Date</th><th>Statut</th><th>Note</th></tr></thead>
  <tbody>${absences.map(p=>`<tr>
    <td>${new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR')}</td>
    <td class="${p.statut}">${p.statut}</td>
    <td>${p.note||'—'}</td>
  </tr>`).join('')}</tbody></table>
  <p style="margin-top:16px;font-size:10px;color:#999">Généré le ${now} — Nance Group</p>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function exportTousEmployesPdf() {
  const {data}=await sb.from('employes').select('*').eq('boutique_id',currentBoutique.id).order('nom');
  if(!data||data.length===0) return notif('Aucun employé','error');
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fiches employés</title>
  <style>
    body{font-family:Arial,sans-serif;padding:20px;color:#1a1d2e;font-size:11px}
    .fiche{page-break-after:always;padding:20px;border:1px solid #e0e0e0;margin-bottom:20px;border-radius:8px}
    .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #B87333;padding-bottom:12px;margin-bottom:14px}
    .photo{width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #B87333}
    h2{color:#B87333;font-size:16px;margin:0}
    h3{color:#B87333;font-size:11px;margin:10px 0 4px;text-transform:uppercase}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .field{background:#f5f5ff;padding:5px 8px;border-radius:4px}
    .field label{font-size:9px;color:#888;display:block}
    .badge-active{color:#16a060;font-weight:700}
    .badge-inactive{color:#e03545;font-weight:700}
    .footer{margin-top:20px;font-size:9px;color:#999;text-align:center}
    .sign{display:flex;gap:30px;margin-top:30px}
    .sign div{flex:1;text-align:center;border-top:1px solid #ccc;padding-top:6px;font-size:10px}
  </style></head><body>
  <h1 style="color:#B87333;text-align:center">📋 Fiches employés — ${currentBoutique?.nom||''}</h1>
  <p style="text-align:center;color:#666">Généré le ${now} • ${data.length} employé(s)</p>
  ${data.map(e=>`
  <div class="fiche">
    <div class="header">
      ${e.photo_url?`<img src="${e.photo_url}" class="photo">`:`<div style="width:60px;height:60px;border-radius:50%;background:#f0f0ff;border:2px solid #B87333;display:flex;align-items:center;justify-content:center;font-size:28px">👤</div>`}
      <div>
        <h2>${e.nom}</h2>
        <div style="color:#666">${e.poste||'Sans poste'}</div>
        <span class="${e.actif?'badge-active':'badge-inactive'}">${e.actif?'✅ Actif':'❌ Inactif'}</span>
      </div>
    </div>
    <div class="grid">
      <div><h3>Infos personnelles</h3>
        <div class="field"><label>Téléphone</label>${e.telephone||'—'}</div>
        <div class="field"><label>Adresse</label>${e.adresse||'—'}</div>
        <div class="field"><label>Jour repos</label>${e.jour_repos||'—'}</div>
      </div>
      <div><h3>Urgence & Salaire</h3>
        <div class="field"><label>Contact urgence</label>${e.urgence_nom?e.urgence_nom+' — '+e.urgence_tel:'—'}</div>
        <div class="field"><label>Salaire</label>${e.salaire?fmt(e.salaire)+' FCFA':e.recette_journaliere?fmt(e.recette_journaliere)+' FCFA/j + '+e.pourcentage_salaire+'%':'—'}</div>
        <div class="field"><label>Fin contrat</label>${e.date_fin_contrat||'—'}</div>
      </div>
    </div>
    <div class="sign">
      <div>Signature employé</div>
      <div>Signature employeur</div>
    </div>
  </div>`).join('')}
  <div class="footer">Nance Group — ${now}</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function addEmploye() {
  const nom=document.getElementById('emp-nom').value.trim();
  const poste=document.getElementById('emp-poste').value.trim();
  const tel=document.getElementById('emp-tel').value.trim();
  const email=document.getElementById('emp-email').value.trim();
  const adresse=document.getElementById('emp-adresse').value.trim();
  const urgNom=document.getElementById('emp-urg-nom').value.trim();
  const urgTel=document.getElementById('emp-urg-tel').value.trim();
  const salaire=parseFloat(document.getElementById('emp-salaire')?.value)||null;
  const recetteJour=parseFloat(document.getElementById('emp-recette-jour')?.value)||null;
  const pourcentage=parseFloat(document.getElementById('emp-pct')?.value)||null;
  const repos=document.getElementById('emp-repos')?.value||null;
  const embauche=document.getElementById('emp-embauche')?.value||null;
  if(!nom) return notif('Entrez le nom','error');
  const {error}=await sb.from('employes').insert({boutique_id:currentBoutique.id,nom,poste,telephone:tel,email,adresse,urgence_nom:urgNom,urgence_tel:urgTel,salaire,recette_journaliere:recetteJour,pourcentage_salaire:pourcentage,jour_repos:repos,date_embauche:embauche});
  if(error) return notif('Erreur: '+error.message,'error');
  await logNotifPdg('employe_ajoute','👤',`Nouvel employé ajouté : "${nom}" (${poste||'sans poste'})`);
  notif('Employé ajouté ✓','success');
  await renderEmployes();
}

async function delEmploye(id) {
  if(!confirm('Supprimer cet employé ? (récupérable dans la corbeille pendant 30 jours)')) return;
  const {data:e}=await sb.from('employes').select('*').eq('id',id).single();
  await sb.from('corbeille').insert({type:'employe',boutique_id:currentBoutique.id,boutique_nom:currentBoutique.nom,donnees:JSON.stringify(e),supprime_par:currentUser.nom_complet||currentUser.role,expire_le:new Date(Date.now()+30*86400000).toISOString()});
  await sb.from('employes').delete().eq('id',id);
  if(e) await logNotifPdg('employe_supprime','🗑',`Employé supprimé : "${e.nom}" (${e.poste||'sans poste'})`);
  renderEmployes();
}

async function toggleEmploye(id,actif) {
  await sb.from('employes').update({actif:!actif}).eq('id',id); renderEmployes();
}

function editEmploye(id) {
  const e=(window._employes||[]).find(x=>x.id===id);
  if(!e) return notif('Employé introuvable','error');
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">✏️ Modifier l'employé</div>
    <div class="form-row">
      <div><label class="inp-label">Nom</label><input class="inp" id="ee-nom" value="${(e.nom||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Poste</label><input class="inp" id="ee-poste" value="${(e.poste||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Téléphone</label><input class="inp" id="ee-tel" value="${e.telephone||''}"></div>
      <div><label class="inp-label">Email</label><input class="inp" id="ee-email" value="${e.email||''}"></div>
      <div><label class="inp-label">Adresse</label><input class="inp" id="ee-adresse" value="${(e.adresse||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Contact urgence (nom)</label><input class="inp" id="ee-urg-nom" value="${(e.urgence_nom||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="inp-label">Contact urgence (tél)</label><input class="inp" id="ee-urg-tel" value="${e.urgence_tel||''}"></div>
      <div><label class="inp-label">💰 Salaire fixe (FCFA)</label><input class="inp" id="ee-salaire" type="number" value="${e.salaire||''}"></div>
      <div><label class="inp-label">📦 Recette journalière fixe</label><input class="inp" id="ee-recette-jour" type="number" value="${e.recette_journaliere||''}"></div>
      <div><label class="inp-label">📊 Pourcentage salaire (%)</label><input class="inp" id="ee-pct" type="number" value="${e.pourcentage_salaire||''}" placeholder="Ex: 25"></div>
      <div><label class="inp-label">🏖 Jour de repos</label>
        <select class="inp" id="ee-repos">
          <option value="" ${!e.jour_repos?'selected':''}>Aucun</option>
          ${['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map(j=>`<option value="${j}" ${e.jour_repos===j?'selected':''}>${j.charAt(0).toUpperCase()+j.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div><label class="inp-label">📅 Date d'embauche</label><input class="inp" id="ee-embauche" type="date" value="${e.date_embauche||''}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveEmploye('${id}')">Enregistrer</button>
      </div></div>`;
  document.body.appendChild(o);
}

async function saveEmploye(id) {
  const nom=document.getElementById('ee-nom').value.trim();
  const poste=document.getElementById('ee-poste').value.trim();
  const tel=document.getElementById('ee-tel').value.trim();
  const email=document.getElementById('ee-email').value.trim();
  const adresse=document.getElementById('ee-adresse').value.trim();
  const urgNom=document.getElementById('ee-urg-nom').value.trim();
  const urgTel=document.getElementById('ee-urg-tel').value.trim();
  const salaire=parseFloat(document.getElementById('ee-salaire')?.value)||null;
  const recetteJour=parseFloat(document.getElementById('ee-recette-jour')?.value)||null;
  const pourcentage=parseFloat(document.getElementById('ee-pct')?.value)||null;
  const repos=document.getElementById('ee-repos')?.value||null;
  const embauche=document.getElementById('ee-embauche')?.value||null;
  if(!nom) return notif('Nom requis','error');
  const ancien=(window._employes||[]).find(x=>x.id===id);
  const {error}=await sb.from('employes').update({nom,poste,telephone:tel,email,adresse,urgence_nom:urgNom,urgence_tel:urgTel,salaire,recette_journaliere:recetteJour,pourcentage_salaire:pourcentage,jour_repos:repos,date_embauche:embauche}).eq('id',id);
  if(error) return notif('Erreur: '+error.message,'error');
  // Log pour PDG
  if(currentUser.role!=='pdg' && ancien){
    const changes=[];
    if(nom!==ancien.nom) changes.push(`Nom: "${ancien.nom}" → "${nom}"`);
    if(poste!==(ancien.poste||'')) changes.push(`Poste: "${ancien.poste||'-'}" → "${poste}"`);
    if(tel!==(ancien.telephone||'')) changes.push(`Tél: "${ancien.telephone||'-'}" → "${tel}"`);
    if(adresse!==(ancien.adresse||'')) changes.push(`Adresse modifiée`);
    if(changes.length>0){
      await logNotifPdg('employe_modifie','👤',`Employé modifié — "${nom}" : ${changes.join(' | ')}`,
        {ancien:{nom:ancien.nom,poste:ancien.poste,telephone:ancien.telephone},nouveau:{nom,poste,telephone:tel}});
    }
  }
  document.querySelector('.modal-overlay').remove();
  notif('Employé modifié ✓','success');
  await renderEmployes();
}

// ===================== EMPLOYES GLOBAL (PDG + Superviseur) =====================
async function showEmployesGlobal() {
  currentView='employes_global'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Employés — Toutes les boutiques';
  document.getElementById('topbar-boutique').textContent='Vue globale';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const isSuperviseur=currentUser.role==='superviseur';
  const rows = await Promise.all(boutiques.map(async b=>{
    const {data}=await sb.from('employes').select('*').eq('boutique_id',b.id).order('nom');
    return {b,employes:data||[]};
  }));
  document.getElementById('content').innerHTML = `
    ${isSuperviseur?`<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-ghost" onclick="showEmployesGlobal()">🔄 Actualiser</button>
    </div>`:''}
    ${rows.map(({b,employes})=>`
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
        <div style="font-size:14px;font-weight:700">${b.nom}</div>
        <span class="badge badge-accent">${employes.length} employés</span>
      </div>
      ${employes.length===0?'<div style="color:var(--text2);font-size:13px">Aucun employé</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Nom</th><th>Poste</th><th>Téléphone</th><th>Adresse</th><th>Contact urgence</th>${!isSuperviseur?'<th>💰 Salaire</th>':''}<th>Statut</th></tr></thead>
        <tbody>${employes.map(e=>`<tr>
          <td style="font-weight:600">${e.nom}</td>
          <td>${e.poste||'-'}</td>
          <td>${e.telephone||'-'}</td>
          <td>${e.adresse||'-'}</td>
          <td>${e.urgence_nom?e.urgence_nom+' — '+e.urgence_tel:'-'}</td>
          ${!isSuperviseur?`<td style="font-weight:600;color:var(--amber)">${e.salaire?fmt(e.salaire)+' FCFA':'-'}</td>`:''}
          <td><span class="badge ${e.actif?'badge-green':'badge-gray'}">${e.actif?'Actif':'Inactif'}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`).join('')}`;
}

// ===================== BESOINS =====================
async function renderBesoins() {
  const {data}=await sb.from('besoins').select('*').eq('boutique_id',currentBoutique.id).order('urgence').order('created_at',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">Ajouter un besoin</div>
      <div class="form-row">
        <div><label class="inp-label">Article</label><input class="inp" id="bes-art" placeholder="Ex: Sacs plastiques..."></div>
        <div><label class="inp-label">Quantité</label><input class="inp" id="bes-qte" type="number" value="1"></div>
        <div><label class="inp-label">Unité</label>
          <select class="inp" id="bes-unit"><option>unité</option><option>paire</option><option>carton</option><option>kg</option><option>litre</option><option>sac</option></select>
        </div>
        <div><label class="inp-label">Urgence</label>
          <select class="inp" id="bes-urg"><option value="haute">🔴 Haute</option><option value="moyenne" selected>🟡 Moyenne</option><option value="basse">🟢 Basse</option></select>
        </div>
      </div>
      <button class="btn btn-accent" onclick="addBesoin()">+ Ajouter</button>
    </div>
    <div class="card">
      <div class="card-title">Liste des besoins (${(data||[]).filter(b=>!b.recu).length} en attente)</div>
      ${(data||[]).length===0?'<div class="empty-state"><p>Aucun besoin enregistré</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Article</th><th>Quantité</th><th>Urgence</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>${(data||[]).map(b=>`<tr>
          <td style="font-weight:600;${b.recu?'text-decoration:line-through;color:var(--text2)':''}">${b.article}</td>
          <td>${b.quantite} ${b.unite}</td>
          <td><span class="badge ${b.urgence==='haute'?'badge-red':b.urgence==='moyenne'?'badge-amber':'badge-green'}">${b.urgence}</span></td>
          <td><span class="badge ${b.recu?'badge-green':'badge-gray'}">${b.recu?'Reçu':'En attente'}</span></td>
          <td style="display:flex;gap:4px">
            ${!b.recu?`<button class="btn btn-green btn-sm" onclick="recuBesoin('${b.id}')">✓ Reçu</button>`:''}
            <button class="btn btn-red btn-sm" onclick="delBesoin('${b.id}')">✕</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`;
}

async function addBesoin() {
  const art=document.getElementById('bes-art').value.trim();
  const qte=parseInt(document.getElementById('bes-qte').value)||1;
  const unite=document.getElementById('bes-unit').value;
  const urgence=document.getElementById('bes-urg').value;
  if(!art) return notif("Entrez le nom de l'article",'error');
  await sb.from('besoins').insert({boutique_id:currentBoutique.id,article:art,quantite:qte,unite,urgence});
  const icone=urgence==='haute'?'🔴':urgence==='moyenne'?'🟡':'🟢';
  await logNotifPdg('besoin_ajoute','🛒',`Nouveau besoin : "${art}" x${qte} ${unite} — Urgence ${icone} ${urgence}`);
  notif('Besoin ajouté ✓','success'); renderBesoins();
}

async function recuBesoin(id) {
  const {data:b}=await sb.from('besoins').select('article,quantite,unite').eq('id',id).single();
  await sb.from('besoins').update({recu:true}).eq('id',id);
  if(b) await logNotifPdg('besoin_recu','✅',`Besoin marqué reçu : "${b.article}" x${b.quantite} ${b.unite||''}`);
  renderBesoins();
}

async function delBesoin(id) {
  if(!confirm('Supprimer ce besoin ?')) return;
  const {data:b}=await sb.from('besoins').select('article,quantite,unite,urgence').eq('id',id).single();
  await sb.from('besoins').delete().eq('id',id);
  if(b) await logNotifPdg('besoin_supprime','🗑',`Besoin supprimé : "${b.article}" x${b.quantite} ${b.unite||''}`);
  renderBesoins();
}

// Vue globale employés avec actualisation superviseur
async function showEmployesGlobalSuperviseur() {
  return showEmployesGlobal();
}

// ===================== RAPPORT DE PAIE =====================
async function showRapportPaie() {
  currentView='paie'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Rapport de paie';
  document.getElementById('topbar-boutique').textContent='Calcul mensuel des salaires';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const moisCourant=new Date().toISOString().substring(0,7);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">💵 Générer le rapport de paie</div>
      <div class="form-row">
        <div><label class="inp-label">Mois</label><input class="inp" id="paie-mois" type="month" value="${moisCourant}"></div>
        <div><label class="inp-label">Boutique</label>
          <select class="inp" id="paie-boutique">
            <option value="toutes">🌍 Toutes les boutiques</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Jours ouvrables du mois</label><input class="inp" id="paie-jours" type="number" value="26" min="1" max="31"></div>
      </div>
      <button class="btn btn-accent" onclick="calculerPaie()">📊 Calculer les salaires</button>
    </div>
    <div id="paie-results"></div>`;
}

async function calculerPaie() {
  const mois=document.getElementById('paie-mois').value;
  const boutiqueVal=document.getElementById('paie-boutique').value;
  const joursOuvrables=parseInt(document.getElementById('paie-jours').value)||26;
  const el=document.getElementById('paie-results');
  el.innerHTML='<div class="empty-state"><p>⏳ Calcul en cours...</p></div>';
  const bList=boutiqueVal==='toutes'?boutiques:boutiques.filter(b=>b.id===boutiqueVal);
  const dateDebut=mois+'-01', dateFin=mois+'-31';
  const moisLabel=new Date(mois+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  const rows=await Promise.all(bList.map(async b=>{
    const [{data:employes},{data:presences},{data:avances},{data:versements}]=await Promise.all([
      sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true).order('nom'),
      sb.from('presences').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
      sb.from('avances_salaire').select('*').eq('boutique_id',b.id).eq('mois',mois).eq('rembourse',false),
      sb.from('versements').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
    ]);
    const paieEmployes=(employes||[]).map(e=>{
      const salaire=e.salaire||0;
      // Calculer les jours ouvrables en excluant le jour de repos de l'employé
      let joursOuvrablesEmp=joursOuvrables;
      if(e.jour_repos){
        const joursRepos=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
        const jourIdx=joursRepos.indexOf(e.jour_repos);
        if(jourIdx>=0){
          // Compter le nombre de fois que ce jour apparaît dans le mois
          const [annee,moisNum]=mois.split('-').map(Number);
          let count=0;
          const nbJours=new Date(annee,moisNum,0).getDate();
          for(let d=1;d<=nbJours;d++){
            const date=new Date(annee,moisNum-1,d);
            if(date.getDay()===(jourIdx+1)%7) count++;
          }
          joursOuvrablesEmp=Math.max(1,joursOuvrables-count);
        }
      }
      const salaireJournalier=joursOuvrablesEmp>0?salaire/joursOuvrablesEmp:0;
      const absences=(presences||[]).filter(p=>p.employe_id===e.id&&p.statut==='absent').length;
      const conges=(presences||[]).filter(p=>p.employe_id===e.id&&p.statut==='conge').length;
      const retards=(presences||[]).filter(p=>p.employe_id===e.id&&p.statut==='retard').length;
      const presentsJours=(presences||[]).filter(p=>p.employe_id===e.id&&(p.statut==='present'||p.statut==='retard')).length;
      const deductionAbsences=Math.round(salaireJournalier*absences);
      const avancesEmp=(avances||[]).filter(a=>a.employe_id===e.id).reduce((s,a)=>s+a.montant,0);

      // Système versements (transport) si configuré
      let salaireNet=0;
      let usesVersements=false;
      if(e.recette_journaliere&&e.pourcentage_salaire) {
        usesVersements=true;
        const vEmp=(versements||[]).filter(v=>v.employe_id===e.id);
        const verseTotal=vEmp.reduce((s,v)=>s+(v.montant_verse||0),0);
        const detteTotal=vEmp.reduce((s,v)=>s+(v.dette||0),0);
        const salaireBrut=Math.round(verseTotal*(e.pourcentage_salaire/100));
        salaireNet=Math.max(0,salaireBrut-detteTotal-avancesEmp);
      } else {
        salaireNet=Math.max(0,(e.salaire||0)-deductionAbsences-avancesEmp);
      }
      return {e,salaire:e.salaire||0,salaireJournalier:Math.round(salaireJournalier),joursOuvrablesEmp,absences,conges,retards,presentsJours,deductionAbsences,avancesEmp,salaireNet,usesVersements};
    });
    const totalBrut=paieEmployes.reduce((s,p)=>s+p.salaire,0);
    const totalDeductions=paieEmployes.reduce((s,p)=>s+p.deductionAbsences,0);
    const totalNet=paieEmployes.reduce((s,p)=>s+p.salaireNet,0);
    return {b,paieEmployes,totalBrut,totalDeductions,totalNet};
  }));

  const grandTotalBrut=rows.reduce((s,r)=>s+r.totalBrut,0);
  const grandTotalNet=rows.reduce((s,r)=>s+r.totalNet,0);
  const grandTotalDeductions=rows.reduce((s,r)=>s+r.totalDeductions,0);

  el.innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💰 Masse salariale brute</div><div class="stat-value amber">${fmt(grandTotalBrut)}</div><div class="stat-sub">FCFA — ${moisLabel}</div></div>
      <div class="stat-card"><div class="stat-label">📉 Total déductions</div><div class="stat-value red">${fmt(grandTotalDeductions)}</div><div class="stat-sub">FCFA absences</div></div>
      <div class="stat-card"><div class="stat-label">✅ Total à payer</div><div class="stat-value green">${fmt(grandTotalNet)}</div><div class="stat-sub">FCFA net</div></div>
      <div class="stat-card"><div class="stat-label">👥 Employés</div><div class="stat-value accent">${rows.reduce((s,r)=>s+r.paieEmployes.length,0)}</div><div class="stat-sub">actifs ce mois</div></div>
    </div>
    ${rows.map(({b,paieEmployes,totalBrut,totalDeductions,totalNet})=>`
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
          <div style="font-size:15px;font-weight:700">${b.nom}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge badge-amber">Brut: ${fmt(totalBrut)} FCFA</span>
          <span class="badge badge-red">Déd: ${fmt(totalDeductions)} FCFA</span>
          <span class="badge badge-green">Net: ${fmt(totalNet)} FCFA</span>
        </div>
      </div>
      ${paieEmployes.length===0?'<div style="color:var(--text2)">Aucun employé actif ou salaire non défini</div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Employé</th><th>Salaire brut</th><th>Jours ouvr.</th><th>Sal./jour</th><th>Présents</th><th>Absents</th><th>Congés</th><th>Retards</th><th>Déduction abs.</th><th>Avances</th><th style="color:var(--green)">Net à payer</th></tr></thead>
        <tbody>${paieEmployes.map(({e,salaire,salaireJournalier,joursOuvrablesEmp,absences,conges,retards,presentsJours,deductionAbsences,avancesEmp,salaireNet})=>`
          <tr>
            <td><div style="font-weight:700">${e.nom}</div><div style="font-size:11px;color:var(--text2)">${e.poste||''}${e.jour_repos?` • 🏖 repos: ${e.jour_repos}`:''}</div></td>
            <td style="color:var(--amber);font-weight:600">${fmt(salaire)} FCFA</td>
            <td style="color:var(--text2);font-size:12px">${joursOuvrablesEmp}j</td>
            <td style="color:var(--text2);font-size:12px">${fmt(salaireJournalier)} FCFA</td>
            <td style="color:var(--green);font-weight:600">${presentsJours}j</td>
            <td style="${absences>0?'color:var(--red);font-weight:700':'color:var(--text2)'}">${absences}j</td>
            <td style="color:#4a9eff">${conges}j</td>
            <td style="color:var(--amber)">${retards}j</td>
            <td style="color:var(--red);font-weight:600">${deductionAbsences>0?'-'+fmt(deductionAbsences)+' FCFA':'—'}</td>
            <td style="color:var(--red);font-weight:600">${avancesEmp>0?'-'+fmt(avancesEmp)+' FCFA':'—'}</td>
            <td style="color:var(--green);font-weight:800;font-size:14px">${fmt(salaireNet)} FCFA</td>
          </tr>`).join('')}
          <tr style="background:var(--bg3);font-weight:800;border-top:2px solid var(--border)">
            <td>TOTAL</td><td style="color:var(--amber)">${fmt(totalBrut)} FCFA</td>
            <td colspan="5"></td>
            <td style="color:var(--red)">${totalDeductions>0?'-'+fmt(totalDeductions)+' FCFA':'—'}</td>
            <td style="color:var(--green);font-size:14px">${fmt(totalNet)} FCFA</td>
          </tr>
        </tbody></table></div>`}
      <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="exportPaiePdf('${b.id}','${b.nom.replace(/'/g,"\\'")}')">📄 Exporter PDF</button>
    </div>`).join('')}`;
}

async function exportPaiePdf(boutiqueId, boutiqueNom) {
  const mois=document.getElementById('paie-mois').value;
  const joursOuvrables=parseInt(document.getElementById('paie-jours').value)||26;
  const dateDebut=mois+'-01', dateFin=mois+'-31';
  const moisLabel=new Date(mois+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const [{data:employes},{data:presences}]=await Promise.all([
    sb.from('employes').select('*').eq('boutique_id',boutiqueId).eq('actif',true).order('nom'),
    sb.from('presences').select('*').eq('boutique_id',boutiqueId).gte('date',dateDebut).lte('date',dateFin),
  ]);
  const paie=(employes||[]).map(e=>{
    const salaire=e.salaire||0;
    const sj=joursOuvrables>0?salaire/joursOuvrables:0;
    const abs=(presences||[]).filter(p=>p.employe_id===e.id&&p.statut==='absent').length;
    const ded=Math.round(sj*abs);
    return {nom:e.nom,poste:e.poste||'',salaire,abs,ded,net:Math.max(0,salaire-ded)};
  });
  const totalNet=paie.reduce((s,p)=>s+p.net,0);
  const totalDed=paie.reduce((s,p)=>s+p.ded,0);
  const now=new Date().toLocaleString('fr-FR');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fiche de paie</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1d2e;font-size:13px}
  h1{color:#B87333;font-size:20px}h2{font-size:15px;border-bottom:2px solid #B87333;padding-bottom:4px;margin-top:20px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#B87333;color:#fff;padding:8px;text-align:left;font-size:12px}
  td{padding:7px 8px;border-bottom:1px solid #e0e0e0}
  tr:nth-child(even) td{background:#f5f5ff}
  .total td{font-weight:bold;background:#e8e8ff;border-top:2px solid #B87333}
  .green{color:#16a060}.red{color:#e03545}.amber{color:#d97706}
  .footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #ccc;padding-top:8px;text-align:center}
  </style></head><body>
  <h1>💵 Nance Group — Rapport de Paie</h1>
  <p><b>Boutique :</b> ${boutiqueNom} &nbsp;|&nbsp; <b>Période :</b> ${moisLabel} &nbsp;|&nbsp; <b>Jours ouvrables :</b> ${joursOuvrables}</p>
  <h2>Détail des salaires</h2>
  <table><thead><tr><th>Employé</th><th>Poste</th><th>Salaire brut</th><th>Jours absents</th><th>Déduction</th><th>Net à payer</th></tr></thead>
  <tbody>${paie.map(p=>`<tr>
    <td><b>${p.nom}</b></td><td>${p.poste}</td>
    <td class="amber">${fmt(p.salaire)} FCFA</td>
    <td class="${p.abs>0?'red':''}">${p.abs} jour(s)</td>
    <td class="red">${p.ded>0?'-'+fmt(p.ded)+' FCFA':'—'}</td>
    <td class="green"><b>${fmt(p.net)} FCFA</b></td>
  </tr>`).join('')}
  <tr class="total"><td colspan="4">TOTAL</td>
    <td class="red">${totalDed>0?'-'+fmt(totalDed)+' FCFA':'—'}</td>
    <td class="green">${fmt(totalNet)} FCFA</td>
  </tr></tbody></table>
  <div class="footer">Généré le ${now} par Nance Group</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

// ===================== AVANCES SUR SALAIRE =====================
async function renderAvances() {
  const isPdg=currentUser.role==='pdg';
  const moisCourant=new Date().toISOString().substring(0,7);
  const {data:employes}=await sb.from('employes').select('*').eq('boutique_id',currentBoutique.id).eq('actif',true).order('nom');
  const {data:avances}=await sb.from('avances_salaire').select('*').eq('boutique_id',currentBoutique.id).order('created_at',{ascending:false});

  const totalNonRembourse=(avances||[]).filter(a=>!a.rembourse).reduce((s,a)=>s+a.montant,0);

  document.getElementById('content').innerHTML=`
    ${totalNonRembourse>0?`<div class="card" style="border:1px solid var(--amber)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">💳</span>
        <div>
          <div style="font-weight:700">Total avances non remboursées</div>
          <div style="font-size:20px;font-weight:800;color:var(--amber)">${fmt(totalNonRembourse)} FCFA</div>
        </div>
      </div>
    </div>`:''}

    <div class="card">
      <div class="card-title">💳 Enregistrer une avance</div>
      <div class="form-row">
        <div><label class="inp-label">Employé</label>
          <select class="inp" id="av-emp">
            <option value="">Choisir...</option>
            ${(employes||[]).map(e=>`<option value="${e.id}">${e.nom} — ${e.poste||''}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Montant (FCFA)</label><input class="inp" id="av-montant" type="number" placeholder="0"></div>
        <div><label class="inp-label">Mois à déduire</label><input class="inp" id="av-mois" type="month" value="${moisCourant}"></div>
        <div style="flex:2"><label class="inp-label">Motif</label><input class="inp" id="av-motif" placeholder="Ex: Urgence médicale, loyer..."></div>
      </div>
      <button class="btn btn-accent" onclick="ajouterAvance()">+ Enregistrer l'avance</button>
    </div>

    <div class="card">
      <div class="card-title">Historique des avances (${(avances||[]).length})</div>
      ${(avances||[]).length===0?'<div class="empty-state"><p>Aucune avance enregistrée</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Employé</th><th>Montant</th><th>Mois déduit</th><th>Motif</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${(avances||[]).map(a=>{
          const emp=(employes||[]).find(e=>e.id===a.employe_id);
          return `<tr>
            <td style="font-weight:700">${emp?.nom||a.employe_nom||'?'}</td>
            <td style="color:var(--amber);font-weight:700">${fmt(a.montant)} FCFA</td>
            <td style="color:var(--text2)">${a.mois||'-'}</td>
            <td style="color:var(--text2);font-size:12px">${a.motif||'-'}</td>
            <td>${a.rembourse
              ?'<span class="badge badge-green">✅ Déduit</span>'
              :'<span class="badge badge-amber">⏳ En attente</span>'}
            </td>
            <td style="font-size:11px;color:var(--text2)">${new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
            <td style="display:flex;gap:4px">
              ${!a.rembourse?`<button class="btn btn-green btn-sm" onclick="marquerAvanceRembourse('${a.id}')">✅ Déduit</button>`:''}
              ${isPdg?`<button class="btn btn-red btn-sm" onclick="supprimerAvance('${a.id}')">✕</button>`:''}
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;
}

async function ajouterAvance() {
  const empId=document.getElementById('av-emp').value;
  const montant=parseFloat(document.getElementById('av-montant').value)||0;
  const mois=document.getElementById('av-mois').value;
  const motif=document.getElementById('av-motif').value.trim();
  if(!empId) return notif('Choisissez un employé','error');
  if(!montant) return notif('Entrez un montant','error');
  const {data:emp}=await sb.from('employes').select('nom').eq('id',empId).single();
  await sb.from('avances_salaire').insert({
    boutique_id:currentBoutique.id, employe_id:empId,
    employe_nom:emp?.nom||'', montant, mois, motif:motif||null, rembourse:false
  });
  await logNotifPdg('avance_salaire','💳',`Avance de ${fmt(montant)} FCFA pour "${emp?.nom||'?'}" — déduction en ${mois}`);
  notif('Avance enregistrée ✓','success'); renderAvances();
}

async function marquerAvanceRembourse(id) {
  await sb.from('avances_salaire').update({rembourse:true}).eq('id',id);
  notif('Avance marquée comme déduite ✓','success'); renderAvances();
}

async function supprimerAvance(id) {
  if(!confirm('Supprimer cette avance ?')) return;
  await sb.from('avances_salaire').delete().eq('id',id);
  notif('Avance supprimée','success'); renderAvances();
}

// ===================== MEILLEUR EMPLOYÉ DU MOIS =====================
async function showMeilleurEmploye() {
  currentView='meilleur'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='🏆 Meilleur employé du mois';
  document.getElementById('topbar-boutique').textContent='Classement & Performance';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const moisCourant=new Date().toISOString().substring(0,7);
  const moisLabel=new Date(moisCourant+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const dateDebut=moisCourant+'-01';
  const dateFin=moisCourant+'-31';

  document.getElementById('content').innerHTML=`<div class="empty-state"><p>⏳ Calcul en cours...</p></div>`;

  // Charger données toutes boutiques
  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:employes},{data:presences},{data:versements}]=await Promise.all([
      sb.from('employes').select('*').eq('boutique_id',b.id).eq('actif',true),
      sb.from('presences').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
      sb.from('versements').select('*').eq('boutique_id',b.id).gte('date',dateDebut).lte('date',dateFin),
    ]);
    return {b, employes:employes||[], presences:presences||[], versements:versements||[]};
  }));

  // Calculer score pour chaque employé
  const scores=[];
  rows.forEach(({b,employes,presences,versements})=>{
    employes.forEach(e=>{
      const pEmp=presences.filter(p=>p.employe_id===e.id);
      const presents=pEmp.filter(p=>p.statut==='present').length;
      const retards=pEmp.filter(p=>p.statut==='retard').length;
      const absents=pEmp.filter(p=>p.statut==='absent').length;
      const total=presents+retards+absents;

      // Score présences (max 50 pts)
      const tauxPresence=total>0?((presents+retards*0.5)/total)*100:0;
      const scorePresence=Math.round(tauxPresence*0.5);

      // Score versements (max 50 pts) si applicable
      let scoreVersement=0;
      let verseTotal=0, attenduTotal=0;
      if(e.recette_journaliere&&e.pourcentage_salaire){
        const vEmp=versements.filter(v=>v.employe_id===e.id);
        verseTotal=vEmp.reduce((s,v)=>s+(v.montant_verse||0),0);
        attenduTotal=vEmp.reduce((s,v)=>s+(v.montant_attendu||0),0);
        scoreVersement=attenduTotal>0?Math.round((verseTotal/attenduTotal)*50):0;
      } else {
        scoreVersement=50; // Pas de versement = score neutre
      }

      const scoreTotal=scorePresence+scoreVersement;

      scores.push({
        e, b, presents, retards, absents, total,
        tauxPresence:Math.round(tauxPresence),
        verseTotal, attenduTotal, scorePresence, scoreVersement, scoreTotal
      });
    });
  });

  // Trier par score
  scores.sort((a,b)=>b.scoreTotal-a.scoreTotal);
  const top3=scores.slice(0,3);
  const reste=scores.slice(3);

  const podiumColors=['#FFD700','#C0C0C0','#CD7F32'];
  const podiumEmojis=['🥇','🥈','🥉'];
  const podiumLabels=['1er','2ème','3ème'];

  document.getElementById('content').innerHTML=`
    <div style="text-align:center;margin-bottom:8px">
      <div style="font-size:14px;color:var(--text2)">Classement du mois de <b>${moisLabel}</b></div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">Score = Présences (50pts) + Versements (50pts)</div>
    </div>

    <!-- PODIUM -->
    ${top3.length>0?`<div class="card">
      <div class="card-title" style="text-align:center">🏆 Podium</div>
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;padding:16px 0;flex-wrap:wrap">
        ${[top3[1],top3[0],top3[2]].filter(Boolean).map((s,i)=>{
          const realRank=s===top3[0]?0:s===top3[1]?1:2;
          const heights=['200px','160px','140px'];
          const height=realRank===0?'200px':realRank===1?'160px':'140px';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <div style="font-size:${realRank===0?'32px':'24px'}">${podiumEmojis[realRank]}</div>
            ${s.e.photo_url?`<img src="${s.e.photo_url}" style="width:${realRank===0?'80px':'60px'};height:${realRank===0?'80px':'60px'};border-radius:50%;object-fit:cover;border:3px solid ${podiumColors[realRank]}">`
            :`<div style="width:${realRank===0?'80px':'60px'};height:${realRank===0?'80px':'60px'};border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:${realRank===0?'36px':'28px'};border:3px solid ${podiumColors[realRank]}">👤</div>`}
            <div style="font-weight:800;font-size:${realRank===0?'15px':'13px'};text-align:center;max-width:100px">${s.e.nom}</div>
            <div style="font-size:11px;color:var(--text2);text-align:center">${s.b.nom}</div>
            <div style="background:${podiumColors[realRank]};color:#000;font-weight:800;padding:6px 16px;border-radius:20px;font-size:14px">${s.scoreTotal} pts</div>
            <div style="background:${podiumColors[realRank]}22;border:2px solid ${podiumColors[realRank]};border-radius:8px 8px 0 0;width:80px;height:${height};display:flex;align-items:center;justify-content:center">
              <span style="font-size:20px;font-weight:800;color:${podiumColors[realRank]}">${podiumLabels[realRank]}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`:''}

    <!-- CLASSEMENT COMPLET -->
    <div class="card">
      <div class="card-title">📊 Classement complet (${scores.length} employés)</div>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Employé</th><th>Boutique</th><th>Présents</th><th>Absents</th><th>Taux présence</th><th>Score présence</th><th>Score versement</th><th style="color:var(--accent)">Score total</th></tr></thead>
        <tbody>${scores.map((s,i)=>`<tr style="${i<3?'background:var(--accent)08':''}">
          <td style="font-weight:800;color:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--text2)'}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              ${s.e.photo_url?`<img src="${s.e.photo_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:`<div style="width:28px;height:28px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>`}
              <div><div style="font-weight:700">${s.e.nom}</div><div style="font-size:11px;color:var(--text2)">${s.e.poste||''}</div></div>
            </div>
          </td>
          <td style="font-size:12px;color:var(--text2)">${s.b.nom}</td>
          <td style="color:var(--green);font-weight:600">${s.presents}j</td>
          <td style="color:${s.absents>0?'var(--red)':'var(--text2)'}">${s.absents}j</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="background:var(--bg3);border-radius:4px;height:6px;width:60px">
                <div style="background:${s.tauxPresence>=80?'var(--green)':s.tauxPresence>=50?'var(--amber)':'var(--red)'};height:6px;border-radius:4px;width:${s.tauxPresence}%"></div>
              </div>
              <span style="font-size:12px">${s.tauxPresence}%</span>
            </div>
          </td>
          <td style="font-weight:600">${s.scorePresence}/50</td>
          <td style="font-weight:600">${s.scoreVersement}/50</td>
          <td style="font-weight:800;font-size:15px;color:${i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--accent)'}">${s.scoreTotal}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}
