// Nance Group — navigation
function toggleNavGroup(id) {
  const body=document.getElementById('grp-'+id+'-body');
  const arrow=document.getElementById('grp-'+id+'-arrow');
  if(!body) return;
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'flex';
  if(arrow) arrow.textContent=isOpen?'▸':'▾';
  // Sauvegarder l'état
  localStorage.setItem('nav_grp_'+id, isOpen?'closed':'open');
}

function initNavGroups() {
  ['global','finance','comm','outils','admin'].forEach(id=>{
    const saved=localStorage.getItem('nav_grp_'+id);
    const body=document.getElementById('grp-'+id+'-body');
    const arrow=document.getElementById('grp-'+id+'-arrow');
    if(body&&saved==='closed'){ body.style.display='none'; if(arrow) arrow.textContent='▸'; }
  });
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.getElementById('theme-btn').textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('nance_theme', isLight ? 'light' : 'dark');
}

function applyTheme() {
  const saved = localStorage.getItem('nance_theme');
  if(saved === 'light') {
    document.body.classList.add('light');
    const btn = document.getElementById('theme-btn');
    if(btn) btn.textContent = '☀️';
  }
}

// ===================== BOUTIQUES =====================
async function loadBoutiques() {
  const { data } = await sb.from('boutiques').select('*').order('created_at');
  boutiques = data || [];
  renderSidebar();
  if (currentUser.role === 'responsable') {
    const b = boutiques.find(b => b.id === currentUser.boutique_id);
    if (b) selectBoutique(b);
  } else if (currentUser.role === 'superviseur') {
    // Superviseur : vue globale par défaut
    if (boutiques.length > 0) showGlobal();
  } else if (boutiques.length > 0) {
    selectBoutique(boutiques[0]);
  }
}

function renderSidebar() {
  const list = document.getElementById('boutiques-list');
  const isSuperviseur = currentUser.role === 'superviseur';
  const filtered = currentUser.role === 'pdg' || isSuperviseur ? boutiques : boutiques.filter(b => b.id === currentUser.boutique_id);
  list.innerHTML = filtered.map(b => `
    <div class="boutique-item ${currentBoutique?.id === b.id ? 'active' : ''}" onclick="${isSuperviseur ? '' : `selectBoutique(${JSON.stringify(b).replace(/"/g,'&quot;')})`}" style="${isSuperviseur?'cursor:default;opacity:0.7':''}">
      ${b.image_url
        ? `<img src="${b.image_url}" style="width:22px;height:22px;border-radius:4px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">`
        : `<div class="boutique-dot" style="background:${b.couleur}"></div>`}
      <div style="flex:1"><div class="boutique-name">${b.nom}</div><div class="boutique-sub">${b.lieu||''}</div></div>
      ${currentUser.role==='pdg'?`<button style="background:none;border:none;cursor:pointer;color:var(--text2);font-size:13px;padding:2px 4px" onclick="event.stopPropagation();editBoutique('${b.id}')">✏️</button>`:''}
    </div>`).join('');
  const addWrap = document.getElementById('add-boutique-wrap');
  addWrap.innerHTML = currentUser.role === 'pdg' ? `<div class="add-boutique-btn" onclick="openAddBoutique()"><span>+</span> Ajouter boutique</div>` : '';
}

function selectBoutique(b) {
  currentBoutique = b; currentView = 'boutique';
  document.getElementById('topbar-title').textContent = b.nom;
  document.getElementById('topbar-boutique').innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:${b.couleur}"></div> ${b.lieu||'Congo'}`;
  currentGroup='finance'; renderSidebar(); setTab('dashboard');
}

// ===================== TABS =====================
// ===================== TABS =====================
const TAB_GROUPS = [
  {
    id: 'finance', label: '💰 Finance',
    tabs: [
      {id:'dashboard',label:'📊 Tableau de bord'},
      {id:'recettes',label:'💰 Recettes'},
      {id:'historique',label:'📅 Historique'},
      {id:'depenses',label:'💸 Dépenses'},
      {id:'factures',label:'🧾 Factures'},
      {id:'objectifs',label:'🎯 Objectifs'},
    ]
  },
  {
    id: 'inventaire', label: '📦 Inventaire',
    tabs: [
      {id:'stocks',label:'📦 Stocks'},
      {id:'immobilisations',label:'🏗 Immobilisations'},
      {id:'fournisseurs',label:'🏭 Fournisseurs'},
    ]
  },
  {
    id: 'rh', label: '👥 RH',
    tabs: [
      {id:'employes',label:'👥 Employés'},
      {id:'presences',label:'🕐 Présences'},
      {id:'avances',label:'💳 Avances'},
      {id:'versements',label:'💵 Versements'},
    ]
  },
  {
    id: 'operations', label: '🛒 Opérations',
    tabs: [
      {id:'besoins',label:'🛒 État de besoin'},
      {id:'vehicules',label:'🚗 Véhicules'},
      {id:'affectations',label:'🔑 Affectations'},
      {id:'calendrier',label:'📆 Calendrier'},
    ]
  },
];

// Compatibilité avec l'ancien TABS
const TABS = TAB_GROUPS.flatMap(g=>g.tabs);

let currentGroup = 'finance';

function setTab(id) {
  currentTab = id;
  // Trouver le groupe de cet onglet
  const groupe = TAB_GROUPS.find(g=>g.tabs.some(t=>t.id===id));
  if(groupe) currentGroup = groupe.id;
  renderTabs();
  renderContent();
}

function setGroup(groupId) {
  currentGroup = groupId;
  const groupe = TAB_GROUPS.find(g=>g.id===groupId);
  if(groupe && groupe.tabs.length > 0) {
    currentTab = groupe.tabs[0].id;
  }
  renderTabs();
  renderContent();
}

function renderTabs() {
  const modules=currentBoutique?JSON.parse(currentBoutique.modules_actifs||'{}'):{};
  // Filtrer les onglets selon les modules actifs
  const filteredGroups=TAB_GROUPS.map(g=>({
    ...g,
    tabs:g.tabs.filter(t=>{
      if(t.id==='vehicules'||t.id==='affectations') return modules.vehicules!==false;
      if(t.id==='versements') return modules.versements!==false;
      if(t.id==='immobilisations') return modules.immobilisations!==false;
      if(t.id==='fournisseurs') return modules.fournisseurs!==false;
      if(t.id==='avances') return modules.avances!==false;
      if(t.id==='objectifs') return modules.objectifs!==false;
      return true;
    })
  })).filter(g=>g.tabs.length>0);

  const groupe=filteredGroups.find(g=>g.id===currentGroup)||filteredGroups[0];
  // Si l'onglet actuel n'existe plus dans le groupe filtré, aller au premier
  if(groupe&&!groupe.tabs.find(t=>t.id===currentTab)){
    currentTab=groupe.tabs[0]?.id||'dashboard';
  }
  const tabs=groupe?groupe.tabs:[];
  document.getElementById('tabs').innerHTML=`
    <div class="tab-groups">
      ${filteredGroups.map(g=>`
        <div class="tab-group-btn ${g.id===currentGroup?'active':''}" onclick="setGroup('${g.id}')">
          ${g.label}
        </div>`).join('')}
    </div>
    <div class="tabs-inner">
      ${tabs.map(t=>`
        <div class="tab ${t.id===currentTab?'active':''}" onclick="setTab('${t.id}')">${t.label}</div>
      `).join('')}
    </div>`;
}

function renderContent() {
  if (!currentBoutique) return;
  const map = {dashboard:renderDashboard,recettes:renderRecettes,historique:renderHistorique,depenses:renderDepenses,factures:renderFactures,stocks:renderStocks,immobilisations:renderImmobilisations,employes:renderEmployes,presences:renderPresences,avances:renderAvances,versements:renderVersements,objectifs:renderObjectifs,fournisseurs:renderFournisseurs,besoins:renderBesoins,vehicules:renderVehicules,affectations:renderAffectations,calendrier:renderCalendrier};
  if (map[currentTab]) map[currentTab]();
}
