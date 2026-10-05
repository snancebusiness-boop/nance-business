// Nance Group — module tableau-de-bord
// ===================== DASHBOARD =====================
async function renderDashboard() {
  try {
  const today = new Date().toISOString().split('T')[0];
  const bid = currentBoutique.id;

  // Mois courant et mois précédent
  const moisCourant=today.substring(0,7);
  const d=new Date(); d.setMonth(d.getMonth()-1);
  const moisPrecedent=d.toISOString().substring(0,7);

  // Générer les 30 derniers jours
  const days30=[], days7=[];
  for(let i=29;i>=0;i--){
    const d2=new Date(); d2.setDate(d2.getDate()-i);
    days30.push(d2.toISOString().split('T')[0]);
    if(i<7) days7.push(d2.toISOString().split('T')[0]);
  }
  const dateMin30=days30[0];

  const [{data:rec},{data:dep},{data:emp},{data:stk},{data:bes},{data:pres},{data:recHist},{data:depHist},
         {data:recMoisCourant},{data:depMoisCourant},{data:recMoisPrec},{data:depMoisPrec}] = await Promise.all([
    sb.from('recettes').select('montant').eq('boutique_id',bid).eq('date',today),
    sb.from('depenses').select('montant').eq('boutique_id',bid).eq('date',today),
    sb.from('employes').select('id').eq('boutique_id',bid).eq('actif',true),
    sb.from('stocks').select('produit,quantite,prix_achat,prix_vente').eq('boutique_id',bid),
    sb.from('besoins').select('id,urgence').eq('boutique_id',bid).eq('recu',false),
    sb.from('presences').select('statut').eq('boutique_id',bid).eq('date',today),
    sb.from('recettes').select('montant,date').eq('boutique_id',bid).gte('date',dateMin30),
    sb.from('depenses').select('montant,date').eq('boutique_id',bid).gte('date',dateMin30),
    sb.from('recettes').select('montant').eq('boutique_id',bid).gte('date',moisCourant+'-01').lte('date',moisCourant+'-31'),
    sb.from('depenses').select('montant').eq('boutique_id',bid).gte('date',moisCourant+'-01').lte('date',moisCourant+'-31'),
    sb.from('recettes').select('montant').eq('boutique_id',bid).gte('date',moisPrecedent+'-01').lte('date',moisPrecedent+'-31'),
    sb.from('depenses').select('montant').eq('boutique_id',bid).gte('date',moisPrecedent+'-01').lte('date',moisPrecedent+'-31'),
  ]);

  const totalRec=(rec||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const totalDep=(dep||[]).reduce((s,d)=>s+parseFloat(d.montant),0);
  const valStock=(stk||[]).reduce((s,p)=>s+p.quantite*parseFloat(p.prix_achat||0),0);
  const solde=totalRec-totalDep;
  const besUrgent=(bes||[]).filter(b=>b.urgence==='haute').length;
  const presAujourdhui={present:0,retard:0,absent:0,conge:0};

  // Comparaison mensuelle
  const recMC=(recMoisCourant||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const depMC=(depMoisCourant||[]).reduce((s,d)=>s+parseFloat(d.montant),0);
  const recMP=(recMoisPrec||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const depMP=(depMoisPrec||[]).reduce((s,d)=>s+parseFloat(d.montant),0);
  const moisCourantLabel=new Date(moisCourant+'-15').toLocaleDateString('fr-FR',{month:'long'});
  const moisPrecedentLabel=new Date(moisPrecedent+'-15').toLocaleDateString('fr-FR',{month:'long'});

  function evolution(current,previous){
    if(previous===0) return current>0?{pct:100,label:'+100%',color:'var(--green)'}:{pct:0,label:'—',color:'var(--text2)'};
    const pct=Math.round(((current-previous)/previous)*100);
    return {pct,label:(pct>=0?'+':'')+pct+'%',color:pct>=0?'var(--green)':'var(--red)'};
  }
  const evoRec=evolution(recMC,recMP);
  const evoDep=evolution(depMC,depMP);
  const evoSolde=evolution(recMC-depMC,recMP-depMP);
  (pres||[]).forEach(p=>{ if(presAujourdhui[p.statut]!==undefined) presAujourdhui[p.statut]++; });

  // Données graphiques par jour
  const recParJour={}, depParJour={};
  days30.forEach(d=>{ recParJour[d]=0; depParJour[d]=0; });
  (recHist||[]).forEach(r=>{ if(recParJour[r.date]!==undefined) recParJour[r.date]+=parseFloat(r.montant); });
  (depHist||[]).forEach(d=>{ if(depParJour[d.date]!==undefined) depParJour[d.date]+=parseFloat(d.montant); });

  // Période sélectionnée (par défaut 7j)
  const labels7=days7.map(d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}));
  const labels30=days30.map(d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}));

  document.getElementById('content').innerHTML = `
    <!-- STATS RAPIDES -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💰 Recette du jour</div><div class="stat-value green">${fmt(totalRec)}</div><div class="stat-sub">FCFA encaissés</div></div>
      <div class="stat-card"><div class="stat-label">💸 Dépenses du jour</div><div class="stat-value red">${fmt(totalDep)}</div><div class="stat-sub">FCFA dépensés</div></div>
      <div class="stat-card"><div class="stat-label">📊 Solde du jour</div><div class="stat-value ${solde>=0?'green':'red'}">${fmt(solde)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">👥 Présences</div><div class="stat-value accent">${presAujourdhui.present+presAujourdhui.retard}</div><div class="stat-sub">${presAujourdhui.absent} absent(s) · ${presAujourdhui.conge} congé(s)</div></div>
      <div class="stat-card"><div class="stat-label">📦 Valeur stock</div><div class="stat-value amber">${fmt(valStock)}</div><div class="stat-sub">FCFA (prix achat)</div></div>
      <div class="stat-card"><div class="stat-label">🛒 Besoins urgents</div><div class="stat-value ${besUrgent>0?'red':'green'}">${besUrgent}</div><div class="stat-sub">${(bes||[]).length} total en attente</div></div>
    </div>

    <!-- GRAPHIQUE RECETTES VS DÉPENSES -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin-bottom:0">📈 Recettes vs Dépenses</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm active-period" id="btn7j" onclick="switchPeriod(7)" style="background:var(--accent);color:#fff">7 jours</button>
          <button class="btn btn-ghost btn-sm" id="btn30j" onclick="switchPeriod(30)">30 jours</button>
        </div>
      </div>
      <canvas id="chart-recettes" height="80"></canvas>
    </div>

    <!-- COMPARAISON MOIS PAR MOIS -->
    <div class="card">
      <div class="card-title">📅 Comparaison — ${moisPrecedentLabel} vs ${moisCourantLabel}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        ${[
          {label:'Recettes',prec:recMP,cour:recMC,evo:evoRec,icon:'💰'},
          {label:'Dépenses',prec:depMP,cour:depMC,evo:evoDep,icon:'💸'},
          {label:'Solde net',prec:recMP-depMP,cour:recMC-depMC,evo:evoSolde,icon:'📊'},
        ].map(({label,prec,cour,evo,icon})=>`
        <div style="background:var(--bg3);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--text2);font-weight:600;margin-bottom:8px">${icon} ${label}</div>
          <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:8px">
            <div>
              <div style="font-size:10px;color:var(--text2)">${moisPrecedentLabel}</div>
              <div style="font-size:13px;font-weight:700">${fmt(prec)} FCFA</div>
            </div>
            <div style="color:${evo.color};font-size:18px;font-weight:800;padding-bottom:2px">→</div>
            <div>
              <div style="font-size:10px;color:var(--text2)">${moisCourantLabel}</div>
              <div style="font-size:13px;font-weight:700">${fmt(cour)} FCFA</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="background:${evo.color}22;color:${evo.color};font-size:12px;font-weight:800;padding:3px 10px;border-radius:8px">${evo.label}</span>
            <span style="font-size:11px;color:var(--text2)">${evo.pct>=0?'↑ En hausse':'↓ En baisse'}</span>
          </div>
        </div>`).join('')}
      </div>
      <!-- Mini graphique barres comparatif -->
      <canvas id="chart-comparaison" height="60"></canvas>
    </div>

    <!-- GRAPHIQUE STOCKS + PRÉSENCES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-title">📦 Top stocks (quantité)</div>
        <canvas id="chart-stocks" height="160"></canvas>
      </div>
      <div class="card">
        <div class="card-title">🕐 Présences — 7 derniers jours</div>
        <canvas id="chart-presences" height="160"></canvas>
      </div>
    </div>`;

  // Charger Chart.js et dessiner
  if(!window.Chart){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload=()=>drawCharts(days7,days30,labels7,labels30,recParJour,depParJour,stk||[],bid,recMP,depMP,recMC,depMC,moisPrecedentLabel,moisCourantLabel);
    document.head.appendChild(s);
  } else {
    drawCharts(days7,days30,labels7,labels30,recParJour,depParJour,stk||[],bid,recMP,depMP,recMC,depMC,moisPrecedentLabel,moisCourantLabel);
  }
  } catch(err) {
    console.error('Dashboard error:', err);
    document.getElementById('content').innerHTML=`
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">💰 Recette du jour</div><div class="stat-value green">--</div></div>
        <div class="stat-card"><div class="stat-label">💸 Dépenses du jour</div><div class="stat-value red">--</div></div>
        <div class="stat-card"><div class="stat-label">📊 Solde</div><div class="stat-value">--</div></div>
      </div>
      <div class="card"><div style="color:var(--text2);text-align:center;padding:20px">
        ⚠️ Erreur de chargement — <button class="btn btn-accent btn-sm" onclick="renderDashboard()">🔄 Réessayer</button>
      </div></div>`;
  }
}

let chartRec=null, chartStk=null, chartPres=null, chartComp=null;
let _days7,_days30,_labels7,_labels30,_recParJour,_depParJour,_stk,_bid;

function drawCharts(days7,days30,labels7,labels30,recParJour,depParJour,stk,bid,recMP=0,depMP=0,recMC=0,depMC=0,moisPrecLabel='Mois préc.',moisCourLabel='Ce mois'){
  _days7=days7;_days30=days30;_labels7=labels7;_labels30=labels30;
  _recParJour=recParJour;_depParJour=depParJour;_stk=stk;_bid=bid;

  // Graphique recettes vs dépenses (7j par défaut)
  drawRecChart(7);

  // Graphique comparaison mois
  const ctxComp=document.getElementById('chart-comparaison');
  if(ctxComp){
    if(chartComp) chartComp.destroy();
    chartComp=new Chart(ctxComp,{
      type:'bar',
      data:{
        labels:[moisPrecLabel,moisCourLabel],
        datasets:[
          {label:'Recettes',data:[recMP,recMC],backgroundColor:['rgba(34,201,122,0.5)','rgba(34,201,122,0.9)'],borderRadius:6},
          {label:'Dépenses',data:[depMP,depMC],backgroundColor:['rgba(240,79,94,0.5)','rgba(240,79,94,0.9)'],borderRadius:6},
          {label:'Solde',data:[recMP-depMP,recMC-depMC],backgroundColor:[recMP-depMP>=0?'rgba(184,115,51,0.5)':'rgba(240,79,94,0.4)',recMC-depMC>=0?'rgba(184,115,51,0.9)':'rgba(240,79,94,0.7)'],borderRadius:6},
        ]
      },
      options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0'}}},scales:{y:{beginAtZero:false,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
    });
  }

  // Graphique stocks top 8
  const top8=stk.sort((a,b)=>b.quantite-a.quantite).slice(0,8);
  const ctxS=document.getElementById('chart-stocks');
  if(ctxS){
    if(chartStk) chartStk.destroy();
    chartStk=new Chart(ctxS,{
      type:'bar',
      data:{
        labels:top8.map(p=>p.produit.length>12?p.produit.substring(0,12)+'…':p.produit),
        datasets:[{
          label:'Quantité',
          data:top8.map(p=>p.quantite),
          backgroundColor:'rgba(83,74,183,0.7)',
          borderRadius:6,
        }]
      },
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8'}},x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
    });
  }

  // Graphique présences 7 derniers jours
  drawPresChart(bid,days7,labels7);
}

function drawRecChart(period){
  const days=period===7?_days7:_days30;
  const labels=period===7?_labels7:_labels30;
  const ctxR=document.getElementById('chart-recettes');
  if(!ctxR) return;
  if(chartRec) chartRec.destroy();
  chartRec=new Chart(ctxR,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Recettes',data:days.map(d=>_recParJour[d]||0),borderColor:'#22c97a',backgroundColor:'rgba(34,201,122,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#22c97a',pointRadius:4},
        {label:'Dépenses',data:days.map(d=>_depParJour[d]||0),borderColor:'#f04f5e',backgroundColor:'rgba(240,79,94,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#f04f5e',pointRadius:4},
      ]
    },
    options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#e8eaf0'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
  });
  // Mettre à jour les boutons
  const btn7=document.getElementById('btn7j');
  const btn30=document.getElementById('btn30j');
  if(btn7&&btn30){
    if(period===7){ btn7.style.background='var(--accent)'; btn7.style.color='#fff'; btn30.style.background=''; btn30.style.color=''; }
    else { btn30.style.background='var(--accent)'; btn30.style.color='#fff'; btn7.style.background=''; btn7.style.color=''; }
  }
}

function switchPeriod(p){ drawRecChart(p); }

async function drawPresChart(bid,days7,labels7){
  const {data}=await sb.from('presences').select('date,statut').eq('boutique_id',bid).gte('date',days7[0]);
  const parJour={};
  days7.forEach(d=>{ parJour[d]={present:0,retard:0,absent:0,conge:0}; });
  (data||[]).forEach(p=>{ if(parJour[p.date]&&parJour[p.date][p.statut]!==undefined) parJour[p.date][p.statut]++; });
  const ctxP=document.getElementById('chart-presences');
  if(!ctxP) return;
  if(chartPres) chartPres.destroy();
  chartPres=new Chart(ctxP,{
    type:'bar',
    data:{
      labels:labels7,
      datasets:[
        {label:'Présent',data:days7.map(d=>parJour[d].present),backgroundColor:'rgba(34,201,122,0.8)',borderRadius:4},
        {label:'Retard',data:days7.map(d=>parJour[d].retard),backgroundColor:'rgba(245,158,11,0.8)',borderRadius:4},
        {label:'Absent',data:days7.map(d=>parJour[d].absent),backgroundColor:'rgba(240,79,94,0.8)',borderRadius:4},
        {label:'Congé',data:days7.map(d=>parJour[d].conge),backgroundColor:'rgba(74,158,255,0.8)',borderRadius:4},
      ]
    },
    options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0',boxWidth:12}}},scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#8b8fa8'}},y:{stacked:true,beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8'}}}}
  });
}

// ===================== OBJECTIFS DE VENTE =====================
async function renderObjectifs() {
  const isPdg=currentUser.role==='pdg';
  const today=new Date().toISOString().split('T')[0];
  const mois=today.substring(0,7);

  // Début de la semaine (lundi)
  const d=new Date(); d.setDate(d.getDate()-d.getDay()+1);
  const debutSemaine=d.toISOString().split('T')[0];
  const finSemaine=new Date(d.getTime()+6*86400000).toISOString().split('T')[0];

  const [{data:obj},{data:recJour},{data:recSemaine},{data:recMois}]=await Promise.all([
    sb.from('objectifs').select('*').eq('boutique_id',currentBoutique.id).single(),
    sb.from('recettes').select('montant').eq('boutique_id',currentBoutique.id).eq('date',today),
    sb.from('recettes').select('montant').eq('boutique_id',currentBoutique.id).gte('date',debutSemaine).lte('date',finSemaine),
    sb.from('recettes').select('montant').eq('boutique_id',currentBoutique.id).gte('date',mois+'-01').lte('date',mois+'-31'),
  ]);

  const realJour=(recJour||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const realSemaine=(recSemaine||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const realMois=(recMois||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
  const objJour=obj?.objectif_jour||0;
  const objSemaine=obj?.objectif_semaine||0;
  const objMois=obj?.objectif_mois||0;

  function pct(real,target){ return target>0?Math.min(100,Math.round((real/target)*100)):0; }
  function couleur(p){ return p>=100?'var(--green)':p>=60?'var(--amber)':'var(--red)'; }
  function barre(p){ return `<div style="background:var(--bg3);border-radius:6px;height:10px;margin-top:6px">
    <div style="background:${couleur(p)};height:10px;border-radius:6px;width:${p}%;transition:width 0.5s"></div></div>`; }

  document.getElementById('content').innerHTML=`
    ${isPdg?`<div class="card">
      <div class="card-title">🎯 Définir les objectifs — ${currentBoutique.nom}</div>
      <div class="form-row">
        <div><label class="inp-label">Objectif journalier (FCFA)</label><input class="inp" id="obj-jour" type="number" value="${objJour}" placeholder="0"></div>
        <div><label class="inp-label">Objectif hebdomadaire (FCFA)</label><input class="inp" id="obj-sem" type="number" value="${objSemaine}" placeholder="0"></div>
        <div><label class="inp-label">Objectif mensuel (FCFA)</label><input class="inp" id="obj-mois" type="number" value="${objMois}" placeholder="0"></div>
      </div>
      <button class="btn btn-accent" onclick="sauverObjectifs()">💾 Enregistrer les objectifs</button>
    </div>`:''}

    <!-- Progression -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">📅 Aujourd'hui</div>
        <div class="stat-value" style="color:${couleur(pct(realJour,objJour))}">${fmt(realJour)}</div>
        <div class="stat-sub">sur ${fmt(objJour)} FCFA objectif</div>
        ${barre(pct(realJour,objJour))}
        <div style="font-size:11px;font-weight:700;color:${couleur(pct(realJour,objJour))};margin-top:4px">${pct(realJour,objJour)}% ${pct(realJour,objJour)>=100?'✅ Atteint !':''}</div>
        ${objJour>0&&realJour<objJour?`<div style="font-size:11px;color:var(--text2);margin-top:2px">Manque: ${fmt(objJour-realJour)} FCFA</div>`:''}
      </div>
      <div class="stat-card">
        <div class="stat-label">📆 Cette semaine</div>
        <div class="stat-value" style="color:${couleur(pct(realSemaine,objSemaine))}">${fmt(realSemaine)}</div>
        <div class="stat-sub">sur ${fmt(objSemaine)} FCFA objectif</div>
        ${barre(pct(realSemaine,objSemaine))}
        <div style="font-size:11px;font-weight:700;color:${couleur(pct(realSemaine,objSemaine))};margin-top:4px">${pct(realSemaine,objSemaine)}% ${pct(realSemaine,objSemaine)>=100?'✅ Atteint !':''}</div>
        ${objSemaine>0&&realSemaine<objSemaine?`<div style="font-size:11px;color:var(--text2);margin-top:2px">Manque: ${fmt(objSemaine-realSemaine)} FCFA</div>`:''}
      </div>
      <div class="stat-card">
        <div class="stat-label">🗓 Ce mois</div>
        <div class="stat-value" style="color:${couleur(pct(realMois,objMois))}">${fmt(realMois)}</div>
        <div class="stat-sub">sur ${fmt(objMois)} FCFA objectif</div>
        ${barre(pct(realMois,objMois))}
        <div style="font-size:11px;font-weight:700;color:${couleur(pct(realMois,objMois))};margin-top:4px">${pct(realMois,objMois)}% ${pct(realMois,objMois)>=100?'✅ Atteint !':''}</div>
        ${objMois>0&&realMois<objMois?`<div style="font-size:11px;color:var(--text2);margin-top:2px">Manque: ${fmt(objMois-realMois)} FCFA</div>`:''}
      </div>
    </div>

    <!-- Analyse -->
    <div class="card">
      <div class="card-title">📊 Analyse de la performance</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          {label:'Journalier',real:realJour,obj:objJour,emoji:'📅'},
          {label:'Hebdomadaire',real:realSemaine,obj:objSemaine,emoji:'📆'},
          {label:'Mensuel',real:realMois,obj:objMois,emoji:'🗓'},
        ].map(({label,real,obj:o,emoji})=>{
          const p=pct(real,o);
          const diff=real-o;
          const msg=o===0?'Aucun objectif défini':p>=100?`🎉 Objectif dépassé de ${fmt(diff)} FCFA !`:p>=80?`💪 Très proche ! Plus que ${fmt(o-real)} FCFA`:p>=50?`⚡ En bonne voie — ${fmt(o-real)} FCFA restants`:`⚠️ Effort nécessaire — ${fmt(o-real)} FCFA restants`;
          return `<div style="background:var(--bg3);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
            <div style="font-size:24px">${emoji}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">${label} — ${p}%</div>
              <div style="font-size:12px;color:var(--text2);margin-top:2px">${msg}</div>
              ${barre(p)}
            </div>
            <div style="text-align:right;min-width:120px">
              <div style="font-weight:800;color:${couleur(p)}">${fmt(real)} FCFA</div>
              <div style="font-size:11px;color:var(--text2)">/ ${fmt(o)} FCFA</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

async function sauverObjectifs() {
  const objJour=parseFloat(document.getElementById('obj-jour').value)||0;
  const objSemaine=parseFloat(document.getElementById('obj-sem').value)||0;
  const objMois=parseFloat(document.getElementById('obj-mois').value)||0;
  // Upsert (créer ou mettre à jour)
  const {data:existing}=await sb.from('objectifs').select('id').eq('boutique_id',currentBoutique.id).single();
  if(existing){
    await sb.from('objectifs').update({objectif_jour:objJour,objectif_semaine:objSemaine,objectif_mois:objMois}).eq('boutique_id',currentBoutique.id);
  } else {
    await sb.from('objectifs').insert({boutique_id:currentBoutique.id,objectif_jour:objJour,objectif_semaine:objSemaine,objectif_mois:objMois});
  }
  notif('Objectifs enregistrés ✓','success');
  renderObjectifs();
}

// Vue globale objectifs (PDG)
async function showObjectifs() {
  currentView='objectifs_global'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Objectifs de vente';
  document.getElementById('topbar-boutique').textContent='Vue globale';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const today=new Date().toISOString().split('T')[0];
  const mois=today.substring(0,7);
  const d=new Date(); d.setDate(d.getDate()-d.getDay()+1);
  const debutSemaine=d.toISOString().split('T')[0];
  const finSemaine=new Date(d.getTime()+6*86400000).toISOString().split('T')[0];

  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:obj},{data:rj},{data:rs},{data:rm}]=await Promise.all([
      sb.from('objectifs').select('*').eq('boutique_id',b.id).single(),
      sb.from('recettes').select('montant').eq('boutique_id',b.id).eq('date',today),
      sb.from('recettes').select('montant').eq('boutique_id',b.id).gte('date',debutSemaine).lte('date',finSemaine),
      sb.from('recettes').select('montant').eq('boutique_id',b.id).gte('date',mois+'-01').lte('date',mois+'-31'),
    ]);
    const realJ=(rj||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
    const realS=(rs||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
    const realM=(rm||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
    return {b,realJ,realS,realM,objJ:obj?.objectif_jour||0,objS:obj?.objectif_semaine||0,objM:obj?.objectif_mois||0};
  }));

  function pct(r,t){return t>0?Math.min(100,Math.round((r/t)*100)):0;}
  function badge(p){return `<span style="background:${p>=100?'var(--green)':p>=60?'var(--amber)':'var(--red)'}22;color:${p>=100?'var(--green)':p>=60?'var(--amber)':'var(--red)'};font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px">${p}%</span>`;}

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">🎯 Progression des objectifs — Toutes les boutiques</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Boutique</th><th colspan="2">📅 Jour</th><th colspan="2">📆 Semaine</th><th colspan="2">🗓 Mois</th></tr>
        <tr style="font-size:11px;color:var(--text2)"><th></th><th>Réalisé</th><th>%</th><th>Réalisé</th><th>%</th><th>Réalisé</th><th>%</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td style="font-weight:700;display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${r.b.couleur}"></div>${r.b.nom}
          </td>
          <td>${fmt(r.realJ)} FCFA<div style="font-size:10px;color:var(--text2)">/ ${fmt(r.objJ)}</div></td>
          <td>${badge(pct(r.realJ,r.objJ))}</td>
          <td>${fmt(r.realS)} FCFA<div style="font-size:10px;color:var(--text2)">/ ${fmt(r.objS)}</div></td>
          <td>${badge(pct(r.realS,r.objS))}</td>
          <td>${fmt(r.realM)} FCFA<div style="font-size:10px;color:var(--text2)">/ ${fmt(r.objM)}</div></td>
          <td>${badge(pct(r.realM,r.objM))}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

// ===================== TABLEAU DE BORD ANNUEL =====================
async function showTableauBordAnnuel() {
  currentView='annuel'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='📅 Bilan annuel';
  document.getElementById('topbar-boutique').textContent='Récapitulatif complet de l\'année';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();

  const annee=new Date().getFullYear();

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">📅 Bilan annuel</div>
      <div class="form-row">
        <div><label class="inp-label">Année</label>
          <select class="inp" id="an-annee" style="width:150px">
            ${[annee,annee-1,annee-2].map(a=>`<option value="${a}" ${a===annee?'selected':''}>${a}</option>`).join('')}
          </select>
        </div>
        <div><label class="inp-label">Boutique</label>
          <select class="inp" id="an-boutique">
            <option value="toutes">🌍 Toutes</option>
            ${boutiques.map(b=>`<option value="${b.id}">${b.nom}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-accent" onclick="genererBilanAnnuel()">📊 Générer le bilan</button>
    </div>
    <div id="an-results"></div>`;
}

async function genererBilanAnnuel() {
  const annee=parseInt(document.getElementById('an-annee').value);
  const boutiqueVal=document.getElementById('an-boutique').value;
  const el=document.getElementById('an-results');
  el.innerHTML='<div class="empty-state"><p>⏳ Calcul en cours...</p></div>';

  const bList=boutiqueVal==='toutes'?boutiques:boutiques.filter(b=>b.id===boutiqueVal);
  const mois=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  // Charger données annuelles
  const rows=await Promise.all(bList.map(async b=>{
    const [{data:recettes},{data:depenses},{data:employes}]=await Promise.all([
      sb.from('recettes').select('montant,date').eq('boutique_id',b.id).gte('date',`${annee}-01-01`).lte('date',`${annee}-12-31`),
      sb.from('depenses').select('montant,date,categorie').eq('boutique_id',b.id).gte('date',`${annee}-01-01`).lte('date',`${annee}-12-31`),
      sb.from('employes').select('id,nom').eq('boutique_id',b.id).eq('actif',true),
    ]);

    // Agréger par mois
    const recParMois=Array(12).fill(0);
    const depParMois=Array(12).fill(0);
    (recettes||[]).forEach(r=>{ const m=parseInt(r.date.split('-')[1])-1; recParMois[m]+=parseFloat(r.montant); });
    (depenses||[]).forEach(d=>{ const m=parseInt(d.date.split('-')[1])-1; depParMois[m]+=parseFloat(d.montant); });

    const totalRec=recParMois.reduce((s,v)=>s+v,0);
    const totalDep=depParMois.reduce((s,v)=>s+v,0);
    const meilleurMois=recParMois.indexOf(Math.max(...recParMois));
    const piresMois=recParMois.indexOf(Math.min(...recParMois.filter(v=>v>0)));

    // Dépenses par catégorie
    const depParCat={};
    (depenses||[]).forEach(d=>{ depParCat[d.categorie]=(depParCat[d.categorie]||0)+parseFloat(d.montant); });

    return {b,recParMois,depParMois,totalRec,totalDep,meilleurMois,depParCat,nbEmployes:employes?.length||0};
  }));

  const grandTotalRec=rows.reduce((s,r)=>s+r.totalRec,0);
  const grandTotalDep=rows.reduce((s,r)=>s+r.totalDep,0);
  const grandBenefice=grandTotalRec-grandTotalDep;

  // Données pour graphique annuel global
  const recGlobal=Array(12).fill(0);
  const depGlobal=Array(12).fill(0);
  rows.forEach(r=>{ r.recParMois.forEach((v,i)=>recGlobal[i]+=v); r.depParMois.forEach((v,i)=>depGlobal[i]+=v); });

  el.innerHTML=`
    <!-- Stats globales -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">💰 Total recettes ${annee}</div><div class="stat-value green">${fmt(grandTotalRec)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">💸 Total dépenses ${annee}</div><div class="stat-value red">${fmt(grandTotalDep)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">📊 Bénéfice net</div><div class="stat-value ${grandBenefice>=0?'green':'red'}">${fmt(grandBenefice)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">📈 Moyenne mensuelle</div><div class="stat-value accent">${fmt(Math.round(grandTotalRec/12))}</div><div class="stat-sub">FCFA/mois</div></div>
    </div>

    <!-- Graphique annuel -->
    <div class="card">
      <div class="card-title">📈 Évolution mensuelle ${annee}</div>
      <canvas id="chart-annuel" height="80"></canvas>
    </div>

    <!-- Tableau mois par mois -->
    <div class="card">
      <div class="card-title">📋 Détail mois par mois</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Mois</th><th>Recettes</th><th>Dépenses</th><th>Solde</th><th>Tendance</th></tr></thead>
        <tbody>${mois.map((m,i)=>{
          const rec=recGlobal[i], dep=depGlobal[i], solde=rec-dep;
          const prev=i>0?recGlobal[i-1]:null;
          const tendance=prev===null?'—':rec>prev?'↑ Hausse':'↓ Baisse';
          const tendColor=prev===null?'var(--text2)':rec>prev?'var(--green)':'var(--red)';
          return `<tr style="${i===new Date().getMonth()&&annee===new Date().getFullYear()?'background:var(--accent)08':''}">
            <td style="font-weight:${i===new Date().getMonth()&&annee===new Date().getFullYear()?'800':'400'}">${m} ${annee}</td>
            <td style="color:var(--green);font-weight:600">${rec>0?fmt(rec)+' FCFA':'—'}</td>
            <td style="color:var(--red)">${dep>0?fmt(dep)+' FCFA':'—'}</td>
            <td style="color:${solde>=0?'var(--green)':'var(--red)'};font-weight:700">${rec>0||dep>0?fmt(solde)+' FCFA':'—'}</td>
            <td style="color:${tendColor};font-weight:600">${tendance}</td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:800;background:var(--bg3)">
          <td>TOTAL ${annee}</td>
          <td style="color:var(--green)">${fmt(grandTotalRec)} FCFA</td>
          <td style="color:var(--red)">${fmt(grandTotalDep)} FCFA</td>
          <td style="color:${grandBenefice>=0?'var(--green)':'var(--red)'}">${fmt(grandBenefice)} FCFA</td>
          <td></td>
        </tr></tbody>
      </table></div>
    </div>

    <!-- Par boutique -->
    ${rows.map(({b,recParMois,depParMois,totalRec,totalDep,meilleurMois,depParCat,nbEmployes})=>`
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <div style="width:10px;height:10px;border-radius:50%;background:${b.couleur}"></div>
        <div style="font-size:15px;font-weight:800">${b.nom}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text2)">Recettes annuelles</div>
          <div style="font-weight:800;color:var(--green)">${fmt(totalRec)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text2)">Dépenses annuelles</div>
          <div style="font-weight:800;color:var(--red)">${fmt(totalDep)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text2)">Bénéfice net</div>
          <div style="font-weight:800;color:${totalRec-totalDep>=0?'var(--green)':'var(--red)'}">${fmt(totalRec-totalDep)} FCFA</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text2)">Meilleur mois</div>
          <div style="font-weight:800;color:var(--accent)">${recParMois[meilleurMois]>0?mois[meilleurMois]:'—'}</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text2)">Employés actifs</div>
          <div style="font-weight:800">${nbEmployes}</div>
        </div>
      </div>
      ${Object.keys(depParCat).length>0?`
      <div style="font-size:12px;font-weight:700;margin-bottom:8px">Dépenses par catégorie</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${Object.entries(depParCat).sort((a,b)=>b[1]-a[1]).map(([cat,montant])=>{
          const pct=Math.round((montant/totalDep)*100);
          return `<div style="display:flex;align-items:center;gap:8px">
            <div style="width:100px;font-size:11px;color:var(--text2)">${cat}</div>
            <div style="flex:1;background:var(--bg3);border-radius:4px;height:6px">
              <div style="background:var(--accent);height:6px;border-radius:4px;width:${pct}%"></div>
            </div>
            <div style="font-size:11px;font-weight:600;width:100px;text-align:right">${fmt(montant)} FCFA</div>
            <div style="font-size:11px;color:var(--text2);width:35px">${pct}%</div>
          </div>`;
        }).join('')}
      </div>`:''}
    </div>`).join('')}`;

  // Dessiner le graphique annuel
  if(window.Chart){
    drawAnnuelChart(mois,recGlobal,depGlobal);
  } else {
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload=()=>drawAnnuelChart(mois,recGlobal,depGlobal);
    document.head.appendChild(s);
  }
}

let chartAnnuel=null;
function drawAnnuelChart(mois,recGlobal,depGlobal) {
  const ctx=document.getElementById('chart-annuel');
  if(!ctx) return;
  if(chartAnnuel) chartAnnuel.destroy();
  chartAnnuel=new Chart(ctx,{
    type:'bar',
    data:{
      labels:mois,
      datasets:[
        {label:'Recettes',data:recGlobal,backgroundColor:'rgba(34,201,122,0.7)',borderRadius:4},
        {label:'Dépenses',data:depGlobal,backgroundColor:'rgba(240,79,94,0.7)',borderRadius:4},
        {label:'Solde',data:recGlobal.map((r,i)=>r-depGlobal[i]),type:'line',borderColor:'#B87333',backgroundColor:'rgba(184,115,51,0.1)',borderWidth:2,pointRadius:4,fill:true},
      ]
    },
    options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0'}}},
      scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},
              x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
  });
}
