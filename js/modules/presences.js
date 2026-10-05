// Nance Group — module presences
// ===================== PRÉSENCES =====================
const STATUTS = {
  present:  {label:'Présent',   icon:'🟢', color:'var(--green)'},
  retard:   {label:'En retard', icon:'🟡', color:'var(--amber)'},
  absent:   {label:'Absent',    icon:'🔴', color:'var(--red)'},
  conge:    {label:'En congé',  icon:'🔵', color:'#4a9eff'},
};

async function renderPresences() {
  const today = new Date().toISOString().split('T')[0];
  const {data:employes} = await sb.from('employes').select('id,nom,poste').eq('boutique_id',currentBoutique.id).eq('actif',true).order('nom');
  const {data:presences} = await sb.from('presences').select('*').eq('boutique_id',currentBoutique.id).order('date',{ascending:false}).limit(200);

  // Grouper par date
  const parDate = {};
  (presences||[]).forEach(p => {
    if(!parDate[p.date]) parDate[p.date]=[];
    parDate[p.date].push(p);
  });

  const dates = Object.keys(parDate).sort((a,b)=>b.localeCompare(a)).slice(0,30);

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">🕐 Enregistrer les présences du jour</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <input class="inp" id="pres-date" type="date" value="${today}" style="width:180px">
        <button class="btn btn-accent" onclick="ouvrirPointage()">📋 Pointer les employés</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Historique des présences</div>
      ${dates.length===0?'<div class="empty-state"><p>Aucune présence enregistrée</p></div>':
      dates.map(date=>{
        const pres=parDate[date];
        const stats={present:0,retard:0,absent:0,conge:0};
        pres.forEach(p=>{ if(stats[p.statut]!==undefined) stats[p.statut]++; });
        return `
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="font-weight:700;font-size:14px">${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
            <span class="badge badge-green">${stats.present} présent(s)</span>
            ${stats.retard>0?`<span class="badge badge-amber">${stats.retard} retard(s)</span>`:''}
            ${stats.absent>0?`<span class="badge badge-red">${stats.absent} absent(s)</span>`:''}
            ${stats.conge>0?`<span class="badge" style="background:#4a9eff22;color:#4a9eff">${stats.conge} congé(s)</span>`:''}
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Employé</th><th>Statut</th><th>Arrivée</th><th>Départ</th><th>Durée</th><th>Note</th><th>Actions</th></tr></thead>
            <tbody>${pres.map(p=>{
              const s=STATUTS[p.statut]||STATUTS.present;
              let duree='-';
              if(p.heure_arrivee&&p.heure_depart){
                const [ah,am]=p.heure_arrivee.split(':').map(Number);
                const [dh,dm]=p.heure_depart.split(':').map(Number);
                const mins=(dh*60+dm)-(ah*60+am);
                if(mins>0) duree=`${Math.floor(mins/60)}h${mins%60>0?String(mins%60).padStart(2,'0'):'00'}`;
              }
              return `<tr>
                <td style="font-weight:600">${p.employe_nom}</td>
                <td><span style="color:${s.color};font-weight:700">${s.icon} ${s.label}</span></td>
                <td>${p.heure_arrivee||'-'}</td>
                <td>${p.heure_depart||'-'}</td>
                <td style="color:var(--text2)">${duree}</td>
                <td style="color:var(--text2);font-size:12px">${p.note||''}</td>
                <td style="display:flex;gap:4px">
                  <button class="btn btn-amber btn-sm" onclick="editPresence('${p.id}','${p.statut}','${p.heure_arrivee||''}','${p.heure_depart||''}','${(p.note||'').replace(/'/g,"\\'")}')">✏️</button>
                  <button class="btn btn-red btn-sm" onclick="delPresence('${p.id}')">✕</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>`;
      }).join('')}
    </div>`;
}

function ouvrirPointage() {
  const date = document.getElementById('pres-date').value;
  if(!date) return notif('Choisissez une date','error');
  sb.from('employes').select('id,nom,poste').eq('boutique_id',currentBoutique.id).eq('actif',true).order('nom').then(({data:employes})=>{
    if(!employes||employes.length===0) return notif('Aucun employé actif','error');
    const o=document.createElement('div'); o.className='modal-overlay';
    o.innerHTML=`<div class="modal" style="max-width:600px;max-height:80vh;overflow-y:auto">
      <div class="modal-title">📋 Pointage du ${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        ${employes.map(e=>`
        <div style="background:var(--bg3);border-radius:10px;padding:12px" id="row-${e.id}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-weight:700">${e.nom} <span style="color:var(--text2);font-size:12px">${e.poste||''}</span></div>
            <select class="inp" id="stat-${e.id}" style="width:130px" onchange="toggleHeures('${e.id}')">
              <option value="present">🟢 Présent</option>
              <option value="retard">🟡 En retard</option>
              <option value="absent">🔴 Absent</option>
              <option value="conge">🔵 En congé</option>
            </select>
          </div>
          <div id="heures-${e.id}" style="display:flex;gap:8px;flex-wrap:wrap">
            <div><label class="inp-label">Arrivée</label><input class="inp" id="arr-${e.id}" type="time" style="width:120px"></div>
            <div><label class="inp-label">Départ</label><input class="inp" id="dep-${e.id}" type="time" style="width:120px"></div>
            <div style="flex:1"><label class="inp-label">Note</label><input class="inp" id="note-${e.id}" placeholder="Optionnel..."></div>
          </div>
        </div>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
        <button class="btn btn-accent" onclick="sauverPointage('${date}',${JSON.stringify(employes.map(e=>({id:e.id,nom:e.nom}))).replace(/"/g,'&quot;')})">💾 Enregistrer tout</button>
      </div>
    </div>`;
    document.body.appendChild(o);
  });
}

function toggleHeures(empId) {
  const stat=document.getElementById('stat-'+empId).value;
  const heures=document.getElementById('heures-'+empId);
  heures.style.display=(stat==='absent'||stat==='conge')?'none':'flex';
}

async function sauverPointage(date, employes) {
  const rows=[];
  employes.forEach(e=>{
    const statut=document.getElementById('stat-'+e.id)?.value||'present';
    const heure_arrivee=document.getElementById('arr-'+e.id)?.value||null;
    const heure_depart=document.getElementById('dep-'+e.id)?.value||null;
    const note=document.getElementById('note-'+e.id)?.value||null;
    rows.push({boutique_id:currentBoutique.id,employe_id:e.id,employe_nom:e.nom,date,statut,heure_arrivee:heure_arrivee||null,heure_depart:heure_depart||null,note:note||null});
  });
  // Supprimer les anciennes entrées de ce jour si elles existent
  await sb.from('presences').delete().eq('boutique_id',currentBoutique.id).eq('date',date);
  const {error}=await sb.from('presences').insert(rows);
  if(error) return notif('Erreur: '+error.message,'error');
  // Résumé pour notif PDG
  const stats={present:0,retard:0,absent:0,conge:0};
  rows.forEach(r=>{ if(stats[r.statut]!==undefined) stats[r.statut]++; });
  await logNotifPdg('presence_enregistree','🕐',
    `Présences du ${new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})} : ${stats.present} présent(s), ${stats.retard} retard(s), ${stats.absent} absent(s), ${stats.conge} congé(s)`
  );
  document.querySelector('.modal-overlay').remove();
  notif('Présences enregistrées ✓','success');
  renderPresences();
}

function editPresence(id,statut,arrivee,depart,note) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">✏️ Modifier la présence</div>
    <div class="form-row">
      <div><label class="inp-label">Statut</label>
        <select class="inp" id="ep-stat">
          <option value="present" ${statut==='present'?'selected':''}>🟢 Présent</option>
          <option value="retard" ${statut==='retard'?'selected':''}>🟡 En retard</option>
          <option value="absent" ${statut==='absent'?'selected':''}>🔴 Absent</option>
          <option value="conge" ${statut==='conge'?'selected':''}>🔵 En congé</option>
        </select>
      </div>
      <div><label class="inp-label">Heure d'arrivée</label><input class="inp" id="ep-arr" type="time" value="${arrivee}"></div>
      <div><label class="inp-label">Heure de départ</label><input class="inp" id="ep-dep" type="time" value="${depart}"></div>
      <div><label class="inp-label">Note</label><input class="inp" id="ep-note" value="${note}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="savePresence('${id}')">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function savePresence(id) {
  const statut=document.getElementById('ep-stat').value;
  const heure_arrivee=document.getElementById('ep-arr').value||null;
  const heure_depart=document.getElementById('ep-dep').value||null;
  const note=document.getElementById('ep-note').value||null;
  await sb.from('presences').update({statut,heure_arrivee,heure_depart,note}).eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Présence modifiée ✓','success'); renderPresences();
}

async function delPresence(id) {
  if(!confirm('Supprimer cette présence ?')) return;
  await sb.from('presences').delete().eq('id',id); renderPresences();
}

// Vue globale présences (PDG + Superviseur)
async function showPresencesGlobal() {
  currentView='presences_global'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Présences — Toutes les boutiques';
  document.getElementById('topbar-boutique').textContent='Vue globale';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const today=new Date().toISOString().split('T')[0];
  const rows=await Promise.all(boutiques.map(async b=>{
    const {data}=await sb.from('presences').select('*').eq('boutique_id',b.id).eq('date',today).order('employe_nom');
    return {b,presences:data||[]};
  }));
  const isSuperviseur=currentUser.role==='superviseur';
  document.getElementById('content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:15px;font-weight:700">📅 Aujourd'hui — ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
      ${isSuperviseur?`<button class="btn btn-ghost" onclick="showPresencesGlobal()">🔄 Actualiser</button>`:''}
    </div>
    ${rows.map(({b,presences})=>{
      const stats={present:0,retard:0,absent:0,conge:0};
      presences.forEach(p=>{ if(stats[p.statut]!==undefined) stats[p.statut]++; });
      return `<div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
          <div style="font-size:14px;font-weight:700">${b.nom}</div>
          <span class="badge badge-green">🟢 ${stats.present}</span>
          <span class="badge badge-amber">🟡 ${stats.retard}</span>
          <span class="badge badge-red">🔴 ${stats.absent}</span>
          <span class="badge" style="background:#4a9eff22;color:#4a9eff">🔵 ${stats.conge}</span>
        </div>
        ${presences.length===0?'<div style="color:var(--text2);font-size:13px">Aucune présence enregistrée aujourd\'hui</div>':`
        <div class="table-wrap"><table>
          <thead><tr><th>Employé</th><th>Statut</th><th>Arrivée</th><th>Départ</th><th>Durée</th><th>Note</th></tr></thead>
          <tbody>${presences.map(p=>{
            const s=STATUTS[p.statut]||STATUTS.present;
            let duree='-';
            if(p.heure_arrivee&&p.heure_depart){
              const [ah,am]=p.heure_arrivee.split(':').map(Number);
              const [dh,dm]=p.heure_depart.split(':').map(Number);
              const mins=(dh*60+dm)-(ah*60+am);
              if(mins>0) duree=`${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`;
            }
            return `<tr>
              <td style="font-weight:600">${p.employe_nom}</td>
              <td style="color:${s.color};font-weight:700">${s.icon} ${s.label}</td>
              <td>${p.heure_arrivee||'-'}</td>
              <td>${p.heure_depart||'-'}</td>
              <td style="color:var(--text2)">${duree}</td>
              <td style="color:var(--text2);font-size:12px">${p.note||''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}
      </div>`;
    }).join('')}`;
}


let calYear=new Date().getFullYear(), calMonth=new Date().getMonth();

async function renderCalendrier() {
  document.getElementById('content').innerHTML=`<div id="cal-wrap"></div>`;
  await drawCal();
}

async function drawCal() {
  const firstDay=new Date(calYear,calMonth,1);
  const lastDay=new Date(calYear,calMonth+1,0);
  const startDate=new Date(firstDay); startDate.setDate(startDate.getDate()-((startDate.getDay()+6)%7));
  const monthStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const {data:events}=await sb.from('calendrier').select('*').eq('boutique_id',currentBoutique.id).gte('date',monthStr+'-01').lte('date',monthStr+'-31');
  const evByDate={};
  (events||[]).forEach(e=>{if(!evByDate[e.date])evByDate[e.date]=[];evByDate[e.date].push(e);});
  const today=new Date().toISOString().split('T')[0];
  const moisNoms=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  let html=`
    <div class="card">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" onclick="calNav(-1)">← Précédent</button>
        <div style="font-size:16px;font-weight:700">${moisNoms[calMonth]} ${calYear}</div>
        <button class="btn btn-ghost btn-sm" onclick="calNav(1)">Suivant →</button>
      </div>
      <div class="cal-header">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>`<div class="cal-header-day">${d}</div>`).join('')}</div>
      <div class="cal-grid">`;
  let d=new Date(startDate);
  for(let i=0;i<42;i++){
    const ds=d.toISOString().split('T')[0];
    const isToday=ds===today;
    const isOther=d.getMonth()!==calMonth;
    const evs=evByDate[ds]||[];
    html+=`<div class="cal-day ${isToday?'today':''} ${isOther?'other-month':''}" onclick="addCalEvent('${ds}')">
      <div class="cal-day-num">${d.getDate()}</div>
      ${evs.slice(0,2).map(e=>`<div class="cal-event" title="${e.titre}" onclick="event.stopPropagation();viewCalEvent('${e.id}','${e.titre.replace(/'/g,"\\'")}','${(e.description||'').replace(/'/g,"\\'")}','${e.date}','${e.heure||''}','${e.type}')">${e.titre}</div>`).join('')}
      ${evs.length>2?`<div style="font-size:9px;color:var(--text2)">+${evs.length-2} autres</div>`:''}
    </div>`;
    d.setDate(d.getDate()+1);
  }
  html+=`</div></div>`;
  document.getElementById('cal-wrap').innerHTML=html;
}

function calNav(dir) { calMonth+=dir; if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;} drawCal(); }

function addCalEvent(date) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">📆 Ajouter un événement — ${date}</div>
    <div class="form-row">
      <div><label class="inp-label">Titre</label><input class="inp" id="cal-titre" placeholder="Ex: Inventaire, Réunion..."></div>
      <div><label class="inp-label">Heure</label><input class="inp" id="cal-heure" type="time"></div>
      <div><label class="inp-label">Type</label>
        <select class="inp" id="cal-type"><option value="evenement">Événement</option><option value="rappel">Rappel</option><option value="livraison">Livraison</option><option value="paiement">Paiement</option></select>
      </div>
    </div>
    <div><label class="inp-label">Description</label><textarea class="inp" id="cal-desc" rows="3" placeholder="Détails..."></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-accent" onclick="saveCalEvent('${date}')">Enregistrer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function saveCalEvent(date) {
  const titre=document.getElementById('cal-titre').value.trim();
  const heure=document.getElementById('cal-heure').value;
  const type=document.getElementById('cal-type').value;
  const desc=document.getElementById('cal-desc').value.trim();
  if(!titre) return notif('Entrez un titre','error');
  await sb.from('calendrier').insert({boutique_id:currentBoutique.id,titre,description:desc,date,heure,type});
  document.querySelector('.modal-overlay').remove();
  notif('Événement ajouté ✓','success'); drawCal();
}

function viewCalEvent(id,titre,desc,date,heure,type) {
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal"><div class="modal-title">${titre}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">${date} ${heure?'à '+heure:''} — <span class="badge badge-accent">${type}</span></div>
    <div style="font-size:14px">${desc||'Aucune description'}</div>
    <div class="modal-actions">
      <button class="btn btn-red" onclick="delCalEvent('${id}')">🗑 Supprimer</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
    </div></div>`;
  document.body.appendChild(o);
}

async function delCalEvent(id) {
  if(!confirm('Supprimer cet événement ?')) return;
  await sb.from('calendrier').delete().eq('id',id);
  document.querySelector('.modal-overlay').remove();
  notif('Événement supprimé','success'); drawCal();
}

// ===================== PLANNING DES CONGÉS =====================
async function showConges() {
  currentView='conges'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='🏖 Planning des congés';
  document.getElementById('topbar-boutique').textContent='Demandes et approbations';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const isPdg=currentUser.role==='pdg';
  const {data:conges}=await sb.from('conges').select('*,boutiques(nom)').order('created_at',{ascending:false});

  document.getElementById('content').innerHTML=`
    <!-- Demande de congé -->
    <div class="card">
      <div class="card-title">➕ ${isPdg?'Ajouter un congé':'Demander un congé'}</div>
      <div class="form-row">
        ${isPdg?`<div><label class="inp-label">Boutique</label>
          <select class="inp" id="cg-boutique">
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>`:''}
        <div><label class="inp-label">Employé</label>
          <select class="inp" id="cg-emp" ${!isPdg?'disabled':''}>
            <option value="">Choisir...</option>
          </select>
        </div>
        <div><label class="inp-label">Date début</label><input class="inp" id="cg-debut" type="date"></div>
        <div><label class="inp-label">Date fin</label><input class="inp" id="cg-fin" type="date"></div>
        <div style="flex:2"><label class="inp-label">Motif</label><input class="inp" id="cg-motif" placeholder="Ex: Congé annuel, maladie..."></div>
      </div>
      ${isPdg?`<button class="btn btn-accent" onclick="ajouterConge()">+ Ajouter</button>`:
      `<button class="btn btn-accent" onclick="demanderConge()">📤 Envoyer la demande</button>`}
    </div>

    <!-- Liste congés -->
    <div class="card">
      <div class="card-title">📋 Planning des congés</div>
      ${(conges||[]).length===0?'<div class="empty-state"><p>Aucun congé enregistré</p></div>':`
      <div class="table-wrap"><table>
        <thead><tr><th>Employé</th><th>Boutique</th><th>Début</th><th>Fin</th><th>Durée</th><th>Motif</th><th>Statut</th>${isPdg?'<th>Actions</th>':''}</tr></thead>
        <tbody>${(conges||[]).map(c=>{
          const jours=Math.ceil((new Date(c.date_fin)-new Date(c.date_debut))/(1000*60*60*24))+1;
          const statutStyle=c.statut==='approuve'?'badge-green':c.statut==='refuse'?'badge-red':'badge-amber';
          const statutLabel=c.statut==='approuve'?'✅ Approuvé':c.statut==='refuse'?'❌ Refusé':'⏳ En attente';
          return `<tr>
            <td style="font-weight:700">${c.employe_nom}</td>
            <td style="color:var(--text2)">${c.boutiques?.nom||'-'}</td>
            <td>${c.date_debut}</td>
            <td>${c.date_fin}</td>
            <td style="color:var(--accent)">${jours}j</td>
            <td style="color:var(--text2)">${c.motif||'-'}</td>
            <td><span class="badge ${statutStyle}">${statutLabel}</span></td>
            ${isPdg?`<td style="display:flex;gap:4px">
              ${c.statut==='en_attente'?`
              <button class="btn btn-green btn-sm" onclick="approuverConge('${c.id}')">✅</button>
              <button class="btn btn-red btn-sm" onclick="refuserConge('${c.id}')">❌</button>`:
              `<button class="btn btn-ghost btn-sm" onclick="supprimerConge('${c.id}')">✕</button>`}
            </td>`:''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;

  // Charger employés si PDG
  if(isPdg) {
    const boutId=document.getElementById('cg-boutique')?.value;
    if(boutId) chargerEmployesConge(boutId);
    document.getElementById('cg-boutique')?.addEventListener('change',e=>chargerEmployesConge(e.target.value));
  }
}

async function chargerEmployesConge(boutiqueId) {
  const {data}=await sb.from('employes').select('id,nom').eq('boutique_id',boutiqueId).eq('actif',true);
  const sel=document.getElementById('cg-emp');
  if(sel) sel.innerHTML='<option value="">Choisir...</option>'+(data||[]).map(e=>`<option value="${e.id}" data-nom="${e.nom}">${e.nom}</option>`).join('');
}

async function ajouterConge() {
  const boutId=document.getElementById('cg-boutique')?.value;
  const empId=document.getElementById('cg-emp').value;
  const debut=document.getElementById('cg-debut').value;
  const fin=document.getElementById('cg-fin').value;
  const motif=document.getElementById('cg-motif').value.trim();
  if(!empId||!debut||!fin) return notif('Remplissez tous les champs','error');
  const empNom=document.getElementById('cg-emp').selectedOptions[0]?.dataset.nom||'';
  await sb.from('conges').insert({boutique_id:boutId,employe_id:empId,employe_nom:empNom,date_debut:debut,date_fin:fin,motif,statut:'approuve'});
  notif('Congé ajouté ✓','success'); showConges();
}

async function demanderConge() {
  const debut=document.getElementById('cg-debut').value;
  const fin=document.getElementById('cg-fin').value;
  const motif=document.getElementById('cg-motif').value.trim();
  if(!debut||!fin) return notif('Choisissez les dates','error');
  await sb.from('conges').insert({
    boutique_id:currentUser.boutique_id,
    employe_nom:currentUser.nom_complet||currentUser.identifiant,
    date_debut:debut, date_fin:fin, motif, statut:'en_attente'
  });
  await envoyerTelegram(`🏖 <b>Demande de congé</b>\n\n👤 ${currentUser.nom_complet||currentUser.identifiant}\n📅 Du ${debut} au ${fin}\n📝 ${motif||'—'}`);
  notif('Demande envoyée ✓','success'); showConges();
}

async function approuverConge(id) {
  await sb.from('conges').update({statut:'approuve'}).eq('id',id);
  notif('Congé approuvé ✓','success'); showConges();
}

async function refuserConge(id) {
  await sb.from('conges').update({statut:'refuse'}).eq('id',id);
  notif('Congé refusé','success'); showConges();
}

async function supprimerConge(id) {
  if(!confirm('Supprimer ce congé ?')) return;
  await sb.from('conges').delete().eq('id',id);
  notif('Congé supprimé','success'); showConges();
}
