// Nance Group — module communication
// ===================== ANNONCES INTERNES =====================
async function showAnnonces() {
  currentView='annonces'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Annonces internes';
  document.getElementById('topbar-boutique').textContent='Communications officielles';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const isPdg=currentUser.role==='pdg';
  const {data:annonces}=await sb.from('annonces').select('*').order('created_at',{ascending:false});

  // Marquer toutes comme lues
  const lues=JSON.parse(localStorage.getItem('nance_annonces_lues')||'[]');
  const nouvellesLues=[...new Set([...lues,...(annonces||[]).filter(a=>a.active).map(a=>a.id)])];
  localStorage.setItem('nance_annonces_lues',JSON.stringify(nouvellesLues));
  const badge=document.getElementById('annonces-badge');
  if(badge){badge.style.display='none';}

  document.getElementById('content').innerHTML=`
    ${isPdg?`<div class="card">
      <div class="card-title">📢 Publier une annonce</div>
      <div class="form-row">
        <div style="flex:2"><label class="inp-label">Titre</label><input class="inp" id="ann-titre" placeholder="Ex: Réunion obligatoire, Nouveau règlement..."></div>
        <div><label class="inp-label">Priorité</label>
          <select class="inp" id="ann-priorite">
            <option value="normale">📋 Normale</option>
            <option value="importante">⚠️ Importante</option>
            <option value="urgente">🚨 Urgente</option>
          </select>
        </div>
        <div><label class="inp-label">Destinataires</label>
          <select class="inp" id="ann-dest">
            <option value="tous">👥 Tous</option>
            <option value="responsables">👤 Responsables uniquement</option>
            <option value="superviseurs">👁 Superviseurs uniquement</option>
          </select>
        </div>
      </div>
      <div style="margin-top:8px">
        <label class="inp-label">Message</label>
        <textarea class="inp" id="ann-message" rows="4" placeholder="Contenu de l'annonce..." style="resize:vertical;width:100%"></textarea>
      </div>
      <button class="btn btn-accent" style="margin-top:10px" onclick="publierAnnonce()">📢 Publier l'annonce</button>
    </div>`:''}

    <!-- Liste annonces -->
    <div id="ann-list">
      ${(annonces||[]).length===0?'<div class="card"><div class="empty-state"><p>Aucune annonce pour le moment</p></div></div>':
      (annonces||[]).map(a=>{
        const estLue=lues.includes(a.id);
        const prioriteStyle=a.priorite==='urgente'?{bg:'var(--red)11',border:'var(--red)',icon:'🚨',badge:'badge-red'}:
          a.priorite==='importante'?{bg:'var(--amber)11',border:'var(--amber)',icon:'⚠️',badge:'badge-amber'}:
          {bg:'var(--bg3)',border:'var(--border)',icon:'📋',badge:'badge-accent'};
        const date=new Date(a.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
        return `<div class="card" style="border:1px solid ${prioriteStyle.border};background:${prioriteStyle.bg};${!a.active?'opacity:0.5':''}">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="font-size:28px;flex-shrink:0">${prioriteStyle.icon}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <div style="font-size:15px;font-weight:800">${a.titre}</div>
                ${!estLue&&a.active?'<span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px">NOUVEAU</span>':''}
                <span class="badge ${prioriteStyle.badge}">${a.priorite}</span>
                ${!a.active?'<span class="badge badge-gray">Archivée</span>':''}
              </div>
              <div style="font-size:13px;line-height:1.6;margin-bottom:10px;white-space:pre-wrap">${a.message}</div>
              <div style="font-size:11px;color:var(--text2)">
                📅 ${date} • 👑 PDG • 
                ${a.destinataires==='tous'?'👥 Tous':a.destinataires==='responsables'?'👤 Responsables':'👁 Superviseurs'}
              </div>
            </div>
            ${isPdg?`<div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="toggleAnnonce('${a.id}',${a.active})">${a.active?'📦 Archiver':'♻️ Réactiver'}</button>
              <button class="btn btn-red btn-sm" onclick="supprimerAnnonce('${a.id}')">✕</button>
            </div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function publierAnnonce() {
  const titre=document.getElementById('ann-titre').value.trim();
  const message=document.getElementById('ann-message').value.trim();
  const priorite=document.getElementById('ann-priorite').value;
  const destinataires=document.getElementById('ann-dest').value;
  if(!titre) return notif('Entrez un titre','error');
  if(!message) return notif('Entrez un message','error');
  await sb.from('annonces').insert({titre,message,priorite,destinataires,active:true});
  // Réinitialiser les "lues" pour que tout le monde voie la nouvelle annonce
  // Notif Telegram
  const icon=priorite==='urgente'?'🚨':priorite==='importante'?'⚠️':'📋';
  await envoyerTelegram(`${icon} <b>Nouvelle annonce — Nance Group</b>\n\n<b>${titre}</b>\n\n${message}\n\n👥 Destinataires : ${destinataires}`);
  notif('Annonce publiée ✓','success');
  showAnnonces();
}

async function toggleAnnonce(id, active) {
  await sb.from('annonces').update({active:!active}).eq('id',id);
  notif(active?'Annonce archivée':'Annonce réactivée ✓','success');
  showAnnonces();
}

async function supprimerAnnonce(id) {
  if(!confirm('Supprimer cette annonce ?')) return;
  await sb.from('annonces').delete().eq('id',id);
  notif('Annonce supprimée','success');
  showAnnonces();
}

// ===================== SONDAGES =====================
async function showSondages() {
  currentView='sondages'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Sondages';
  document.getElementById('topbar-boutique').textContent='Questions & Votes';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const isPdg=currentUser.role==='pdg';
  const {data:sondages}=await sb.from('sondages').select('*').order('created_at',{ascending:false});
  const repond=JSON.parse(localStorage.getItem('nance_sondages_repond_'+currentUser.id)||'[]');

  // Mettre à jour badge
  const nonRepond=(sondages||[]).filter(s=>s.actif&&!repond.includes(s.id)).length;
  const badge=document.getElementById('sondages-badge');
  if(badge){ badge.style.display=nonRepond>0?'inline':'none'; badge.textContent=nonRepond; }

  document.getElementById('content').innerHTML=`
    ${isPdg?`<div class="card">
      <div class="card-title">📊 Créer un sondage</div>
      <div class="form-row">
        <div style="flex:2"><label class="inp-label">Question</label><input class="inp" id="s-question" placeholder="Ex: Êtes-vous satisfait de votre travail ?"></div>
        <div><label class="inp-label">Type</label>
          <select class="inp" id="s-type" onchange="toggleSondageOptions()">
            <option value="oui_non">✅ Oui / Non</option>
            <option value="choix_multiple">📋 Choix multiple</option>
            <option value="ouverte">💬 Question ouverte</option>
          </select>
        </div>
      </div>
      <div id="s-options-wrap" style="display:none;margin-top:8px">
        <label class="inp-label">Options (une par ligne)</label>
        <textarea class="inp" id="s-options" rows="4" placeholder="Option 1&#10;Option 2&#10;Option 3" style="resize:vertical;width:100%"></textarea>
      </div>
      <button class="btn btn-accent" style="margin-top:10px" onclick="creerSondage()">📊 Publier le sondage</button>
    </div>`:''}

    <!-- Liste sondages -->
    ${(sondages||[]).length===0?'<div class="card"><div class="empty-state"><p>Aucun sondage pour le moment</p></div></div>':
    (sondages||[]).map(s=>{
      const aRepondu=repond.includes(s.id);
      const reponses=JSON.parse(s.reponses||'{}');
      const totalReponses=Object.values(reponses).reduce((sum,v)=>sum+(Array.isArray(v)?v.length:1),0);

      return `<div class="card" style="border:1px solid ${!s.actif?'var(--border)':aRepondu?'var(--green)':'var(--accent)'}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <div style="font-size:15px;font-weight:800">${s.question}</div>
              ${!s.actif?'<span class="badge badge-gray">Fermé</span>':''}
              ${aRepondu?'<span class="badge badge-green">✅ Répondu</span>':''}
              ${!aRepondu&&s.actif?'<span style="background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px">NOUVEAU</span>':''}
              <span class="badge badge-accent">${s.type==='oui_non'?'Oui/Non':s.type==='choix_multiple'?'Choix multiple':'Question ouverte'}</span>
            </div>

            ${!aRepondu&&s.actif?`
            <!-- Formulaire de réponse -->
            <div style="background:var(--bg3);border-radius:10px;padding:14px;margin-bottom:12px">
              <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px">Votre réponse :</div>
              ${s.type==='oui_non'?`
              <div style="display:flex;gap:10px">
                <button class="btn btn-green" onclick="repondre('${s.id}','oui_non','Oui')">✅ Oui</button>
                <button class="btn btn-red" onclick="repondre('${s.id}','oui_non','Non')">❌ Non</button>
              </div>`:s.type==='choix_multiple'?`
              <div style="display:flex;flex-direction:column;gap:6px">
                ${(JSON.parse(s.options||'[]')).map((opt,i)=>`
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--bg2);padding:8px 12px;border-radius:8px">
                  <input type="radio" name="sond-${s.id}" value="${opt}" style="accent-color:var(--accent)">
                  <span>${opt}</span>
                </label>`).join('')}
                <button class="btn btn-accent btn-sm" style="margin-top:6px;align-self:flex-start" onclick="repondreChoix('${s.id}')">Envoyer ma réponse</button>
              </div>`:s.type==='ouverte'?`
              <div style="display:flex;gap:8px">
                <textarea class="inp" id="rep-ouverte-${s.id}" placeholder="Votre réponse..." rows="2" style="flex:1;resize:vertical"></textarea>
                <button class="btn btn-accent" onclick="repondre('${s.id}','ouverte',document.getElementById('rep-ouverte-${s.id}').value)">Envoyer</button>
              </div>`:''}
            </div>`:''}

            <!-- Résultats (PDG voit tout, autres voient après avoir répondu) -->
            ${(isPdg||aRepondu)?`
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px">📊 Résultats (${totalReponses} réponse(s)) :</div>
              ${afficherResultatsSondage(s)}
            </div>`:''}
          </div>
          ${isPdg?`<div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="toggleSondage('${s.id}',${s.actif})">${s.actif?'🔒 Fermer':'🔓 Rouvrir'}</button>
            <button class="btn btn-red btn-sm" onclick="supprimerSondage('${s.id}')">✕</button>
          </div>`:''}
        </div>
      </div>`;
    }).join('')}`;
}

function afficherResultatsSondage(s) {
  const reponses=JSON.parse(s.reponses||'{}');
  if(s.type==='oui_non') {
    const oui=(reponses['Oui']||[]).length;
    const non=(reponses['Non']||[]).length;
    const total=oui+non||1;
    return `<div style="display:flex;flex-direction:column;gap:6px">
      ${[{label:'✅ Oui',count:oui,color:'var(--green)'},{label:'❌ Non',count:non,color:'var(--red)'}].map(r=>`
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${r.label}</span><span style="font-weight:700">${r.count} (${Math.round(r.count/total*100)}%)</span>
        </div>
        <div style="background:var(--bg3);border-radius:4px;height:8px">
          <div style="background:${r.color};height:8px;border-radius:4px;width:${Math.round(r.count/total*100)}%;transition:width 0.5s"></div>
        </div>
      </div>`).join('')}
    </div>`;
  } else if(s.type==='choix_multiple') {
    const options=JSON.parse(s.options||'[]');
    const total=Object.values(reponses).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0)||1;
    return `<div style="display:flex;flex-direction:column;gap:6px">
      ${options.map(opt=>{
        const count=(reponses[opt]||[]).length;
        return `<div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
            <span>${opt}</span><span style="font-weight:700">${count} (${Math.round(count/total*100)}%)</span>
          </div>
          <div style="background:var(--bg3);border-radius:4px;height:8px">
            <div style="background:var(--accent);height:8px;border-radius:4px;width:${Math.round(count/total*100)}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    // Question ouverte
    const toutes=Object.values(reponses).flat();
    return toutes.length===0?'<div style="color:var(--text2);font-size:12px">Aucune réponse</div>':
    `<div style="display:flex;flex-direction:column;gap:4px">
      ${toutes.map(r=>`<div style="background:var(--bg3);border-radius:8px;padding:8px 12px;font-size:12px">"${r}"</div>`).join('')}
    </div>`;
  }
}

function toggleSondageOptions() {
  const type=document.getElementById('s-type').value;
  document.getElementById('s-options-wrap').style.display=type==='choix_multiple'?'block':'none';
}

async function creerSondage() {
  const question=document.getElementById('s-question').value.trim();
  const type=document.getElementById('s-type').value;
  const optionsText=document.getElementById('s-options')?.value||'';
  if(!question) return notif('Entrez une question','error');
  const options=type==='choix_multiple'?JSON.stringify(optionsText.split('\n').map(o=>o.trim()).filter(o=>o)):null;
  if(type==='choix_multiple'&&(!options||JSON.parse(options).length<2)) return notif('Entrez au moins 2 options','error');
  await sb.from('sondages').insert({question,type,options,reponses:'{}',actif:true});
  await envoyerTelegram(`📊 <b>Nouveau sondage — Nance Group</b>\n\n<b>${question}</b>\n\nType : ${type==='oui_non'?'Oui/Non':type==='choix_multiple'?'Choix multiple':'Question ouverte'}\n\nConnectez-vous pour répondre !`);
  notif('Sondage publié ✓','success'); showSondages();
}

async function repondre(sondageId, type, valeur) {
  if(!valeur||!valeur.trim()) return notif('Entrez une réponse','error');
  const auteur=currentUser.nom_complet||currentUser.boutiques?.nom||currentUser.role;
  const {data:s}=await sb.from('sondages').select('reponses').eq('id',sondageId).single();
  const reponses=JSON.parse(s?.reponses||'{}');
  if(!reponses[valeur]) reponses[valeur]=[];
  reponses[valeur].push(auteur);
  await sb.from('sondages').update({reponses:JSON.stringify(reponses)}).eq('id',sondageId);
  const repond=JSON.parse(localStorage.getItem('nance_sondages_repond_'+currentUser.id)||'[]');
  repond.push(sondageId);
  localStorage.setItem('nance_sondages_repond_'+currentUser.id,JSON.stringify(repond));
  notif('Réponse enregistrée ✓','success'); showSondages();
}

async function repondreChoix(sondageId) {
  const selected=document.querySelector(`input[name="sond-${sondageId}"]:checked`);
  if(!selected) return notif('Choisissez une option','error');
  await repondre(sondageId,'choix_multiple',selected.value);
}

async function toggleSondage(id,actif) {
  await sb.from('sondages').update({actif:!actif}).eq('id',id);
  notif(actif?'Sondage fermé':'Sondage rouvert ✓','success'); showSondages();
}

async function supprimerSondage(id) {
  if(!confirm('Supprimer ce sondage ?')) return;
  await sb.from('sondages').delete().eq('id',id);
  notif('Sondage supprimé','success'); showSondages();
}

// ===================== FIL D'ACTUALITÉ =====================
async function showFilActualite() {
  currentView='fil'; currentBoutique=null;
  document.getElementById('topbar-title').textContent="Fil d'actualité";
  document.getElementById('topbar-boutique').textContent='Toutes les activités en temps réel';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  document.getElementById('content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;font-weight:700">📰 Activités récentes — Toutes les boutiques</div>
      <button class="btn btn-ghost btn-sm" onclick="showFilActualite()">🔄 Actualiser</button>
    </div>
    <div id="fil-content"><div class="empty-state"><p>⏳ Chargement...</p></div></div>`;

  await chargerFilActualite();
}

async function chargerFilActualite() {
  const el=document.getElementById('fil-content');
  if(!el) return;

  // Charger les données des 7 derniers jours
  const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
  const today=new Date().toISOString().split('T')[0];

  const [
    {data:notifs},
    {data:recettes},
    {data:depenses},
    {data:presences},
    {data:annonces},
    {data:connexions},
    {data:besoins}
  ]=await Promise.all([
    sb.from('notifs_pdg').select('*').gte('created_at',since).order('created_at',{ascending:false}).limit(30),
    sb.from('recettes').select('*,boutiques(nom,couleur)').gte('created_at',since).order('created_at',{ascending:false}).limit(20),
    sb.from('depenses').select('*,boutiques(nom,couleur)').gte('created_at',since).order('created_at',{ascending:false}).limit(20),
    sb.from('presences').select('*,boutiques(nom,couleur)').gte('date',today).order('created_at',{ascending:false}).limit(30),
    sb.from('annonces').select('*').gte('created_at',since).order('created_at',{ascending:false}).limit(10),
    sb.from('connexions').select('*').gte('created_at',since).order('created_at',{ascending:false}).limit(20),
    sb.from('besoins').select('*,boutiques(nom,couleur)').gte('created_at',since).eq('recu',false).order('created_at',{ascending:false}).limit(15),
  ]);

  // Créer un fil unifié
  const items=[];

  // Notifs PDG (modifications)
  (notifs||[]).forEach(n=>items.push({
    time:n.created_at, icon:n.type==='stock_modifie'?'📦':n.type==='employe_modifie'?'👤':n.type==='stock_ajoute'?'➕':n.type==='employe_ajoute'?'👤':'🔔',
    titre:n.message, sous:`${n.boutique_nom||''} • Par ${n.auteur||'?'}`, couleur:'var(--accent)',
    type:'notif'
  }));

  // Recettes
  (recettes||[]).forEach(r=>items.push({
    time:r.created_at, icon:'💰',
    titre:`Recette enregistrée : ${fmt(r.montant)} FCFA`,
    sous:`${r.boutiques?.nom||''} • ${r.description||''} • ${r.mode_paiement}`,
    couleur:'var(--green)', type:'recette'
  }));

  // Dépenses
  (depenses||[]).forEach(d=>items.push({
    time:d.created_at, icon:'💸',
    titre:`Dépense : ${fmt(d.montant)} FCFA`,
    sous:`${d.boutiques?.nom||''} • ${d.description||''} • ${d.categorie}`,
    couleur:'var(--red)', type:'depense'
  }));

  // Présences
  const presencesGroupe={};
  (presences||[]).forEach(p=>{
    const key=p.boutique_id+'_'+p.date;
    if(!presencesGroupe[key]) presencesGroupe[key]={boutique:p.boutiques?.nom,couleur:p.boutiques?.couleur,date:p.date,time:p.created_at,count:0,presents:0,absents:0};
    presencesGroupe[key].count++;
    if(p.statut==='present'||p.statut==='retard') presencesGroupe[key].presents++;
    if(p.statut==='absent') presencesGroupe[key].absents++;
  });
  Object.values(presencesGroupe).forEach(g=>items.push({
    time:g.time, icon:'🕐',
    titre:`Pointage enregistré — ${g.count} employé(s)`,
    sous:`${g.boutique||''} • ${g.presents} présent(s), ${g.absents} absent(s)`,
    couleur:'var(--amber)', type:'presence'
  }));

  // Annonces
  (annonces||[]).forEach(a=>items.push({
    time:a.created_at, icon:'📢',
    titre:`Nouvelle annonce : "${a.titre}"`,
    sous:`PDG • Priorité: ${a.priorite}`,
    couleur:'var(--accent)', type:'annonce'
  }));

  // Connexions
  (connexions||[]).forEach(c=>items.push({
    time:c.created_at, icon:c.appareil||'💻',
    titre:`Connexion — ${c.boutique_nom||c.identifiant}`,
    sous:`${c.role} • ${c.appareil||''}`,
    couleur:'var(--text2)', type:'connexion'
  }));

  // Besoins urgents
  (besoins||[]).filter(b=>b.urgence==='haute').forEach(b=>items.push({
    time:b.created_at, icon:'🔴',
    titre:`Besoin urgent : "${b.article}"`,
    sous:`${b.boutiques?.nom||''} • Qté: ${b.quantite} ${b.unite||''}`,
    couleur:'var(--red)', type:'besoin'
  }));

  // Trier par date décroissante
  items.sort((a,b)=>new Date(b.time)-new Date(a.time));

  if(items.length===0){
    el.innerHTML='<div class="empty-state"><p>Aucune activité récente</p></div>';
    return;
  }

  // Filtres
  const types=['tout','recette','depense','notif','presence','connexion','annonce','besoin'];
  const typeLabels={tout:'Tout',recette:'💰 Recettes',depense:'💸 Dépenses',notif:'🔔 Modifications',presence:'🕐 Présences',connexion:'🔐 Connexions',annonce:'📢 Annonces',besoin:'🛒 Besoins'};

  el.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      ${types.map(t=>`<button class="btn btn-ghost btn-sm" id="fil-filter-${t}" onclick="filtrerFil('${t}')" style="${t==='tout'?'background:var(--accent);color:#fff':''}">
        ${typeLabels[t]}
      </button>`).join('')}
    </div>
    <div id="fil-items" style="display:flex;flex-direction:column;gap:8px">
      ${items.map(item=>`
      <div class="fil-item" data-type="${item.type}" style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${item.couleur};border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;flex-shrink:0">${item.icon}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${item.titre}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${item.sous}</div>
        </div>
        <div style="font-size:11px;color:var(--text2);text-align:right;flex-shrink:0">
          ${new Date(item.time).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>`).join('')}
    </div>`;

  window._filItems=items;
}

function filtrerFil(type) {
  // Mettre à jour les boutons
  document.querySelectorAll('[id^="fil-filter-"]').forEach(btn=>{
    btn.style.background=''; btn.style.color='';
  });
  const activeBtn=document.getElementById('fil-filter-'+type);
  if(activeBtn){ activeBtn.style.background='var(--accent)'; activeBtn.style.color='#fff'; }

  // Filtrer les items
  document.querySelectorAll('.fil-item').forEach(el=>{
    el.style.display=(type==='tout'||el.dataset.type===type)?'flex':'none';
  });
}
