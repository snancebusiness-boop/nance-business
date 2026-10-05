// Nance Group — module messages
// Canal fixe pour la conversation PDG ↔ Superviseur
const CANAL_SUPERVISEUR = '00000000-0000-0000-0000-000000000001';
// Canaux de groupe : UUID déterministe par boutique
let canalGroupeMap = {}; // boutiqueId -> UUID canal groupe
function getCanalGroupe(boutiqueId){
  if(!canalGroupeMap[boutiqueId]){
    // Utilise les 8 premiers chars du boutique_id pour créer un UUID unique de groupe
    const clean = boutiqueId.replace(/-/g,'');
    canalGroupeMap[boutiqueId] = 'ffffffff-ffff-ffff-'+clean.substring(0,4)+'-'+clean.substring(4,16);
  }
  return canalGroupeMap[boutiqueId];
}
function isGroupeCanal(id){ return typeof id==='string' && id.startsWith('ffffffff-ffff-ffff-'); }

async function showChat() {
  currentView='chat'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Messages';
  document.getElementById('topbar-boutique').textContent='Zone de conversation';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  if(chatInterval) clearInterval(chatInterval);
  const isSuperviseur=currentUser.role==='superviseur';
  const isPdg=currentUser.role==='pdg';
  if(isSuperviseur){
    // Superviseur : commence sur le canal privé PDG
    chatBoutiqueId = CANAL_SUPERVISEUR;
  } else if(isPdg){
    // PDG : commence sur le groupe de la première boutique
    chatBoutiqueId = boutiques.length>0 ? getCanalGroupe(boutiques[0].id) : null;
  } else {
    // Responsable : commence sur le groupe de sa boutique
    chatBoutiqueId = currentUser.boutique_id ? getCanalGroupe(currentUser.boutique_id) : currentUser.boutique_id;
  }
  renderChat();
  chatInterval=setInterval(()=>{ if(currentView==='chat'){ loadMessages(); checkTyping(); afficherTypingStatus(); } },3000);
}

async function renderChat() {
  const isPdg=currentUser.role==='pdg';
  const isSuperviseur=currentUser.role==='superviseur';
  const isResp=currentUser.role==='responsable';

  // Compter les non lus par canal
  const unread={};
  if(isPdg){
    // Canaux normaux (boutique_id)
    const {data:u1}=await sb.from('messages').select('boutique_id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).not('boutique_id','is',null);
    (u1||[]).forEach(m=>{ unread[m.boutique_id]=(unread[m.boutique_id]||0)+1; });
    // Canaux spéciaux (canal_id)
    const {data:u2}=await sb.from('messages').select('canal_id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).not('canal_id','is',null);
    (u2||[]).forEach(m=>{ unread[m.canal_id]=(unread[m.canal_id]||0)+1; });
    // Canal superviseur privé (lu_responsable=false côté superviseur, lu_pdg=false côté PDG)
    const {data:u3}=await sb.from('messages').select('canal_id').eq('canal_id',CANAL_SUPERVISEUR).eq('lu_pdg',false).neq('expediteur_id',currentUser.id);
    (u3||[]).forEach(m=>{ unread[m.canal_id]=(unread[m.canal_id]||0)+1; });
  } else if(isSuperviseur){
    // Canal privé PDG→Superviseur (lu_responsable=false)
    const {data:u1}=await sb.from('messages').select('canal_id').eq('canal_id',CANAL_SUPERVISEUR).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
    (u1||[]).forEach(m=>{ unread[m.canal_id]=(unread[m.canal_id]||0)+1; });
    // Groupes boutiques (lu_pdg=false)
    const {data:u2}=await sb.from('messages').select('canal_id').eq('lu_pdg',false).neq('expediteur_id',currentUser.id).not('canal_id','is',null).neq('canal_id',CANAL_SUPERVISEUR);
    (u2||[]).forEach(m=>{ unread[m.canal_id]=(unread[m.canal_id]||0)+1; });
  } else {
    const bid=currentUser.boutique_id;
    const grp=getCanalGroupe(bid);
    // Canal privé (boutique_id)
    const {data:u1}=await sb.from('messages').select('boutique_id').eq('boutique_id',bid).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
    (u1||[]).forEach(m=>{ unread[m.boutique_id]=(unread[m.boutique_id]||0)+1; });
    // Canal groupe (canal_id)
    const {data:u2}=await sb.from('messages').select('canal_id').eq('canal_id',grp).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
    (u2||[]).forEach(m=>{ unread[m.canal_id]=(unread[m.canal_id]||0)+1; });
  }

  function badge(cnt){ return cnt>0?`<span style="background:var(--red);color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 6px;margin-left:5px">${cnt}</span>`:''; }
  function tab(id,label,icon=''){
    const cnt=unread[id]||0;
    return `<div class="chat-boutique-tab ${chatBoutiqueId===id?'active':''}" onclick="switchChatBoutique('${id}')">${icon}${label}${badge(cnt)}</div>`;
  }

  let chatTabs='';

  if(isPdg){
    // PDG : pour chaque boutique → onglet GROUPE + onglet PRIVÉ, puis onglet privé Superviseur
    let tabs='';
    boutiques.forEach(b=>{
      const grp=getCanalGroupe(b.id);
      tabs+=tab(grp, b.nom, '👥 ');
      tabs+=tab(b.id, b.nom, '🔒 ');
    });
    tabs+=tab(CANAL_SUPERVISEUR,'Superviseur','👁 ');
    chatTabs=`<div class="chat-boutique-tabs" style="flex-wrap:wrap">${tabs}</div>
      <div style="padding:6px 12px 0;font-size:11px;color:var(--text2)">👥 Groupe (3 personnes) &nbsp;|&nbsp; 🔒 Privé avec responsable &nbsp;|&nbsp; 👁 Privé Superviseur</div>`;

  } else if(isSuperviseur){
    // Superviseur : onglet privé PDG + pour chaque boutique → onglet groupe
    let tabs=tab(CANAL_SUPERVISEUR,'PDG','💬 ');
    boutiques.forEach(b=>{
      const grp=getCanalGroupe(b.id);
      tabs+=tab(grp, b.nom, '👥 ');
    });
    chatTabs=`<div class="chat-boutique-tabs" style="flex-wrap:wrap">${tabs}</div>
      <div style="padding:6px 12px 0;font-size:11px;color:var(--text2)">💬 Privé PDG &nbsp;|&nbsp; 👥 Groupe boutique (PDG + Superviseur + Responsable)</div>`;

  } else {
    // Responsable : onglet groupe SA boutique + onglet privé PDG
    const bid=currentUser.boutique_id;
    const grp=getCanalGroupe(bid);
    const tabs=tab(grp,'Groupe boutique','👥 ')+tab(bid,'PDG (privé)','🔒 ');
    chatTabs=`<div class="chat-boutique-tabs">${tabs}</div>
      <div style="padding:6px 12px 0;font-size:11px;color:var(--text2)">👥 Groupe (PDG + Superviseur + vous) &nbsp;|&nbsp; 🔒 Privé avec le PDG</div>`;
  }

  document.getElementById('content').innerHTML=`
    <div class="card" style="padding:0;overflow:hidden">
      ${chatTabs}
      <div class="chat-container">
        <div class="chat-messages" id="chat-msgs"></div>
        <!-- Réponses rapides -->
        <div id="quick-replies-bar" style="padding:8px 12px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px;background:var(--bg3)">
          ${getQuickReplies().map(r=>`<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;border-radius:20px" onclick="sendQuickReply(\`${r.replace(/`/g,'\\`')}\`)">
            ${r}
          </button>`).join('')}
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;border-radius:20px;color:var(--accent)" onclick="ouvrirGestionReplies()" title="Gérer les réponses rapides">⚙️</button>
        </div>
          <div id="typing-indicator" style="padding:4px 12px;display:none"></div>
        <div class="chat-input-row">
          <input class="inp" id="chat-inp" placeholder="Écrivez un message..." style="flex:1" oninput="onTyping()" onkeydown="if(event.key==='Enter')sendMsg()">
          <button class="btn btn-accent" onclick="sendMsg()">Envoyer</button>
        </div>
      </div>
    </div>`;
  await loadMessages();
}

function switchChatBoutique(bid) {
  chatBoutiqueId=bid; renderChat();
}

async function loadMessages() {
  if(!chatBoutiqueId) return;
  const estSpecial = isGroupeCanal(chatBoutiqueId) || chatBoutiqueId===CANAL_SUPERVISEUR;
  let query;
  if(estSpecial){
    query = sb.from('messages').select('*').eq('canal_id',chatBoutiqueId).order('created_at',{ascending:true}).limit(100);
  } else {
    query = sb.from('messages').select('*').eq('boutique_id',chatBoutiqueId).is('canal_id',null).order('created_at',{ascending:true}).limit(100);
  }
  const {data}=await query;
  const el=document.getElementById('chat-msgs');
  if(!el) return;
  el.innerHTML=(data||[]).map(m=>{
    const isMoi=m.expediteur_id===currentUser.id;
    const time=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    let check='';
    if(isMoi){
      const estLu = currentUser.role==='pdg' ? m.lu_responsable : m.lu_pdg;
      check = estLu
        ? `<span class="msg-check lu" title="Lu">✓✓</span>`
        : `<span class="msg-check envoye" title="Envoyé">✓</span>`;
    }
    const delBtn = isMoi ? `<button onclick="delMsg('${m.id}')" title="Supprimer" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);font-size:13px;padding:0 0 0 6px;line-height:1;transition:color 0.15s" onmouseover="this.style.color='#f04f5e'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">🗑</button>` : '';
    const pinBtn=currentUser.role==='pdg'?`<button onclick="epinglerMessage('${m.id}')" title="${m.epingle?'Désépingler':'Épingler'}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 0 0 4px;opacity:0.5">📌</button>`:'';
    const pinnedBadge=m.epingle?`<span style="font-size:10px;color:var(--amber);font-weight:700">📌 Épinglé</span>`:'';

    // Réactions
    const reactions=JSON.parse(m.reactions||'{}');
    const reactionsHtml=Object.entries(reactions).filter(([,users])=>users.length>0).map(([emoji,users])=>`
      <span onclick="toggleReaction('${m.id}','${emoji}')" style="cursor:pointer;background:${users.includes(currentUser.id)?'var(--accent)33':'var(--bg3)'};border:1px solid ${users.includes(currentUser.id)?'var(--accent)':'var(--border)'};border-radius:12px;padding:2px 7px;font-size:11px;display:inline-flex;align-items:center;gap:3px">
        ${emoji} <span style="font-size:10px;font-weight:700">${users.length}</span>
      </span>`).join('');

    return `<div class="chat-msg ${isMoi?'moi':'autre'}" style="position:relative${m.epingle?';border:1px solid var(--amber)33':''}" id="msg-${m.id}">
      ${!isMoi?`<div style="font-size:10px;font-weight:700;color:var(--accent2);margin-bottom:3px">${m.expediteur_nom}</div>`:''}
      ${pinnedBadge?`<div style="margin-bottom:3px">${pinnedBadge}</div>`:''}
      <div style="display:flex;align-items:flex-end;gap:4px">
        <span style="flex:1">${m.contenu}</span>
        ${pinBtn}
        ${delBtn}
        <button onclick="afficherPickerReaction('${m.id}')" style="background:none;border:none;cursor:pointer;font-size:13px;padding:0 0 0 4px;opacity:0.5" title="Réagir">😊</button>
      </div>
      ${reactionsHtml?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${reactionsHtml}</div>`:''}
      <div class="chat-msg-info" style="display:flex;align-items:center;justify-content:flex-end;gap:2px">${time}${check}</div>
    </div>`;
  }).join('');
  // Indicateur typing
  const typingEl=document.getElementById('typing-indicator');
  if(typingEl) el.appendChild(typingEl);
  el.scrollTop=el.scrollHeight;
  // Marquer comme lu
  const estGroupe=isGroupeCanal(chatBoutiqueId);
  const estCanalSup=chatBoutiqueId===CANAL_SUPERVISEUR;
  const col = estSpecial ? 'canal_id' : 'boutique_id';
  const val = chatBoutiqueId;
  if(currentUser.role==='pdg'){
    await sb.from('messages').update({lu_pdg:true}).eq(col,val).eq('lu_pdg',false).neq('expediteur_id',currentUser.id);
  } else if(currentUser.role==='superviseur'){
    if(estCanalSup){
      await sb.from('messages').update({lu_responsable:true}).eq('canal_id',CANAL_SUPERVISEUR).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
    } else {
      await sb.from('messages').update({lu_pdg:true}).eq(col,val).eq('lu_pdg',false).neq('expediteur_id',currentUser.id);
    }
  } else {
    await sb.from('messages').update({lu_responsable:true}).eq(col,val).eq('lu_responsable',false).neq('expediteur_id',currentUser.id);
  }
  const badge=document.getElementById('chat-badge');
  if(badge){badge.style.display='none';badge.textContent='0';}
}

const EMOJIS_REACTIONS=['👍','❤️','😂','😮','😢','🔥','👏','✅'];

function afficherPickerReaction(msgId) {
  // Fermer picker existant
  document.querySelector('.reaction-picker')?.remove();
  const msgEl=document.getElementById('msg-'+msgId);
  if(!msgEl) return;
  const picker=document.createElement('div');
  picker.className='reaction-picker';
  picker.style.cssText='position:absolute;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:8px;display:flex;gap:6px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.3);bottom:100%;right:0;margin-bottom:4px';
  picker.innerHTML=EMOJIS_REACTIONS.map(e=>`
    <span onclick="toggleReaction('${msgId}','${e}');this.closest('.reaction-picker').remove()" style="cursor:pointer;font-size:20px;padding:4px;border-radius:8px;transition:background 0.15s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">${e}</span>
  `).join('');
  msgEl.style.position='relative';
  msgEl.appendChild(picker);
  // Fermer en cliquant ailleurs
  setTimeout(()=>document.addEventListener('click',function close(e){
    if(!picker.contains(e.target)){picker.remove();document.removeEventListener('click',close);}
  }),100);
}

async function toggleReaction(msgId, emoji) {
  const {data:m}=await sb.from('messages').select('reactions').eq('id',msgId).single();
  const reactions=JSON.parse(m?.reactions||'{}');
  if(!reactions[emoji]) reactions[emoji]=[];
  const idx=reactions[emoji].indexOf(currentUser.id);
  if(idx>=0) reactions[emoji].splice(idx,1); // Retirer
  else reactions[emoji].push(currentUser.id); // Ajouter
  await sb.from('messages').update({reactions:JSON.stringify(reactions)}).eq('id',msgId);
  loadMessages();
}

async function sendMsg() {
  const inp=document.getElementById('chat-inp');
  const contenu=inp?.value.trim();
  if(!contenu||!chatBoutiqueId) return;
  inp.value='';
  clearTyping();
  const nom=currentUser.role==='pdg'?'PDG':currentUser.role==='superviseur'?'Superviseur':(currentUser.boutiques?.nom||'Responsable');
  const estGroupe=isGroupeCanal(chatBoutiqueId);
  const estCanalSup=chatBoutiqueId===CANAL_SUPERVISEUR;

  let lu_pdg, lu_responsable, insertData;

  if(estGroupe){
    lu_pdg = currentUser.role==='pdg' || currentUser.role==='superviseur';
    lu_responsable = currentUser.role==='responsable';
    insertData = {canal_id:chatBoutiqueId, boutique_id:null, expediteur_id:currentUser.id, expediteur_nom:nom, contenu, lu_pdg, lu_responsable};
  } else if(estCanalSup){
    lu_pdg = currentUser.role==='pdg';
    lu_responsable = currentUser.role==='superviseur';
    insertData = {canal_id:chatBoutiqueId, boutique_id:null, expediteur_id:currentUser.id, expediteur_nom:nom, contenu, lu_pdg, lu_responsable};
  } else {
    lu_pdg = currentUser.role==='pdg';
    lu_responsable = currentUser.role==='responsable';
    insertData = {boutique_id:chatBoutiqueId, canal_id:null, expediteur_id:currentUser.id, expediteur_nom:nom, contenu, lu_pdg, lu_responsable};
  }
  const {error}=await sb.from('messages').insert(insertData);
  if(error){ console.error('sendMsg error',error); notif('Erreur envoi message','error'); return; }
  await loadMessages();
}

async function delMsg(id) {
  if(!confirm('Supprimer ce message ?')) return;
  await sb.from('messages').delete().eq('id',id);
  await loadMessages();
}

let typingTimer=null;

async function clearTyping() {
  if(!chatBoutiqueId||!currentUser) return;
  await sb.from('typing_status').delete().eq('boutique_id',chatBoutiqueId).eq('user_id',currentUser.id);
}

async function checkTyping() {
  if(!chatBoutiqueId||currentView!=='chat') return;
  const since=new Date(Date.now()-4000).toISOString();
  const {data}=await sb.from('typing_status').select('*').eq('boutique_id',chatBoutiqueId).neq('user_id',currentUser.id).gte('updated_at',since);
  const el=document.getElementById('chat-msgs');
  if(!el) return;
  let tipEl=document.getElementById('typing-indicator');
  if(data&&data.length>0){
    const noms=data.map(x=>x.nom).join(', ');
    if(!tipEl){
      tipEl=document.createElement('div');
      tipEl.id='typing-indicator';
      tipEl.className='typing-indicator';
      el.appendChild(tipEl);
    }
    tipEl.innerHTML=`<div class="typing-dots"><span></span><span></span><span></span></div> ${noms} est en train d'écrire...`;
    el.scrollTop=el.scrollHeight;
  } else {
    if(tipEl) tipEl.remove();
  }
}

// ===================== RÉPONSES RAPIDES CHAT =====================
const DEFAULT_QUICK_REPLIES = [
  'Reçu ✓',
  'OK 👍',
  'Compris !',
  'En cours...',
  'Fait ✅',
  'Pas de stock',
  'Je reviens',
  'Problème résolu',
];

function getQuickReplies() {
  const saved=localStorage.getItem('nance_quick_replies');
  return saved ? JSON.parse(saved) : DEFAULT_QUICK_REPLIES;
}

function saveQuickReplies(replies) {
  localStorage.setItem('nance_quick_replies', JSON.stringify(replies));
}

function sendQuickReply(text) {
  const inp=document.getElementById('chat-inp');
  if(inp) { inp.value=text; inp.focus(); }
  sendMsg();
}

function ouvrirGestionReplies() {
  const replies=getQuickReplies();
  const o=document.createElement('div'); o.className='modal-overlay';
  o.innerHTML=`<div class="modal" style="max-width:500px">
    <div class="modal-title">⚙️ Gérer les réponses rapides</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Cliquez sur ✕ pour supprimer, ou ajoutez une nouvelle réponse</div>
    <div id="replies-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
      ${replies.map((r,i)=>`
      <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:8px 12px">
        <span style="flex:1;font-size:13px">${r}</span>
        <button class="btn btn-red btn-sm" onclick="supprimerQuickReply(${i})">✕</button>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <input class="inp" id="new-reply-inp" placeholder="Nouvelle réponse rapide..." style="flex:1" onkeydown="if(event.key==='Enter')ajouterQuickReply()">
      <button class="btn btn-accent" onclick="ajouterQuickReply()">+ Ajouter</button>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" onclick="resetQuickReplies()">↺ Réinitialiser</button>
      <button class="btn btn-ghost" style="flex:1" onclick="this.closest('.modal-overlay').remove();renderChat()">Fermer</button>
    </div>
  </div>`;
  document.body.appendChild(o);
}

function supprimerQuickReply(index) {
  const replies=getQuickReplies();
  replies.splice(index,1);
  saveQuickReplies(replies);
  // Mettre à jour la liste dans le modal
  const list=document.getElementById('replies-list');
  if(list) list.innerHTML=replies.map((r,i)=>`
    <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:8px 12px">
      <span style="flex:1;font-size:13px">${r}</span>
      <button class="btn btn-red btn-sm" onclick="supprimerQuickReply(${i})">✕</button>
    </div>`).join('');
}

function ajouterQuickReply() {
  const inp=document.getElementById('new-reply-inp');
  const text=inp?.value.trim();
  if(!text) return;
  const replies=getQuickReplies();
  replies.push(text);
  saveQuickReplies(replies);
  inp.value='';
  const list=document.getElementById('replies-list');
  if(list) list.innerHTML=replies.map((r,i)=>`
    <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:8px 12px">
      <span style="flex:1;font-size:13px">${r}</span>
      <button class="btn btn-red btn-sm" onclick="supprimerQuickReply(${i})">✕</button>
    </div>`).join('');
  notif('Réponse ajoutée ✓','success');
}

function resetQuickReplies() {
  saveQuickReplies(DEFAULT_QUICK_REPLIES);
  notif('Réponses réinitialisées','success');
  document.querySelector('.modal-overlay')?.remove();
  renderChat();
}

// ===================== STATUT EN LIGNE =====================
async function mettreAJourStatutEnLigne(enligne) {
  if(!currentUser) return;
  try {
    const nom=currentUser.nom_complet||currentUser.boutiques?.nom||currentUser.role;
    const role=currentUser.role;
    const boutique=currentUser.boutiques?.nom||'';
    if(enligne) {
      await sb.from('statuts_enligne').upsert({
        compte_id:currentUser.id,
        nom, role, boutique,
        derniere_activite:new Date().toISOString(),
        enligne:true
      },{onConflict:'compte_id'});
    } else {
      await sb.from('statuts_enligne').upsert({
        compte_id:currentUser.id,
        nom, role, boutique,
        derniere_activite:new Date().toISOString(),
        enligne:false
      },{onConflict:'compte_id'});
    }
  } catch(e){}
}

async function afficherUtilisateursEnLigne() {
  if(!currentUser) return;
  try {
    // Considérer en ligne si activité dans les 2 dernières minutes
    const seuil=new Date(Date.now()-2*60*1000).toISOString();
    const {data}=await sb.from('statuts_enligne').select('*').eq('enligne',true).gte('derniere_activite',seuil);
    const enligne=(data||[]).filter(u=>u.compte_id!==currentUser.id);

    const wrap=document.getElementById('online-users');
    const list=document.getElementById('online-list');
    if(!wrap||!list) return;

    if(enligne.length===0){
      wrap.style.display='none';
      return;
    }

    wrap.style.display='block';
    list.innerHTML=enligne.map(u=>{
      const roleIcon=u.role==='pdg'?'👑':u.role==='superviseur'?'👁':'👤';
      const roleColor=u.role==='pdg'?'var(--amber)':u.role==='superviseur'?'var(--accent)':'var(--green)';
      return `<div style="display:flex;align-items:center;gap:6px">
        <div style="width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0"></div>
        <span style="font-size:11px;font-weight:600;color:${roleColor}">${roleIcon} ${u.nom||u.role}</span>
        ${u.boutique?`<span style="font-size:10px;color:var(--text2)">(${u.boutique})</span>`:''}
      </div>`;
    }).join('');
  } catch(e){}
}

// ===================== MESSAGES ÉPINGLÉS =====================
async function epinglerMessage(msgId) {
  const {data:m}=await sb.from('messages').select('epingle').eq('id',msgId).single();
  await sb.from('messages').update({epingle:!m?.epingle}).eq('id',msgId);
  notif(m?.epingle?'Message désépinglé':'Message épinglé 📌','success');
  loadMessages();
}

// ===================== STATUT "EN TRAIN D'ÉCRIRE" =====================
let typingTimeout=null;
async function onTyping() {
  if(!currentUser||!chatCanalId) return;
  try {
    await sb.from('typing_status').upsert({
      canal_id:chatCanalId, user_id:currentUser.id,
      user_nom:currentUser.nom_complet||currentUser.boutiques?.nom||currentUser.role,
      is_typing:true, updated_at:new Date().toISOString()
    },{onConflict:'canal_id,user_id'});
  } catch(e){}
  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(async ()=>{
    try {
      await sb.from('typing_status').upsert({
        canal_id:chatCanalId, user_id:currentUser.id,
        user_nom:currentUser.nom_complet||currentUser.boutiques?.nom||currentUser.role,
        is_typing:false, updated_at:new Date().toISOString()
      },{onConflict:'canal_id,user_id'});
    } catch(e){}
  },2000);
}

async function afficherTypingStatus() {
  if(!currentUser||!chatCanalId) return;
  try {
    const seuil=new Date(Date.now()-3000).toISOString();
    const {data}=await sb.from('typing_status').select('*')
      .eq('canal_id',chatCanalId).eq('is_typing',true)
      .neq('user_id',currentUser.id).gte('updated_at',seuil);
    const zone=document.getElementById('typing-indicator');
    if(zone){
      if(data&&data.length>0){
        const noms=data.map(t=>t.user_nom).join(', ');
        zone.innerHTML=`<span style="color:var(--text2);font-size:11px;font-style:italic">✍️ ${noms} est en train d'écrire...</span>`;
        zone.style.display='block';
      } else {
        zone.style.display='none';
      }
    }
  } catch(e){}
}
