// Nance Group — module vue-globale
// ===================== VUE GLOBALE =====================
async function showGlobal() {
  currentView='global'; currentBoutique=null;
  document.getElementById('topbar-title').textContent='Vue globale';
  document.getElementById('topbar-boutique').textContent='Toutes les boutiques';
  document.getElementById('tabs').innerHTML='';
  renderSidebar();
  const today=new Date().toISOString().split('T')[0];
  const now=new Date();
  const monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-title">Filtrer la vue globale</div>
      <div class="form-row">
        <div><label class="inp-label">Date spécifique</label><input class="inp" id="global-date" type="date" value="${today}"></div>
        <div><label class="inp-label">Mois</label><input class="inp" id="global-mois" type="month" value="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}"></div>
        <div style="display:flex;align-items:flex-end;gap:8px">
          <button class="btn btn-accent" onclick="loadGlobalData()">🔍 Afficher</button>
        </div>
      </div>
    </div>
    <div id="global-result"></div>`;

  await loadGlobalData();
}

async function loadGlobalData() {
  const dateVal=document.getElementById('global-date')?.value;
  const moisVal=document.getElementById('global-mois')?.value;
  const el=document.getElementById('global-result');
  if(!el) return;
  el.innerHTML='<div class="empty-state"><p>Chargement...</p></div>';

  // Vue par jour
  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:rec},{data:dep}]=await Promise.all([
      sb.from('recettes').select('montant').eq('boutique_id',b.id).eq('date',dateVal),
      sb.from('depenses').select('montant').eq('boutique_id',b.id).eq('date',dateVal),
    ]);
    const r=(rec||[]).reduce((s,x)=>s+parseFloat(x.montant),0);
    const d=(dep||[]).reduce((s,x)=>s+parseFloat(x.montant),0);
    return {b,r,d};
  }));

  // Vue par mois
  const moisRows=await Promise.all(boutiques.map(async b=>{
    const moisStart=moisVal+'-01';
    const moisEnd=moisVal+'-31';
    const [{data:rec},{data:dep}]=await Promise.all([
      sb.from('recettes').select('montant').eq('boutique_id',b.id).gte('date',moisStart).lte('date',moisEnd),
      sb.from('depenses').select('montant').eq('boutique_id',b.id).gte('date',moisStart).lte('date',moisEnd),
    ]);
    const r=(rec||[]).reduce((s,x)=>s+parseFloat(x.montant),0);
    const d=(dep||[]).reduce((s,x)=>s+parseFloat(x.montant),0);
    return {b,r,d};
  }));

  const totalR=rows.reduce((s,x)=>s+x.r,0);
  const totalD=rows.reduce((s,x)=>s+x.d,0);
  const totalRM=moisRows.reduce((s,x)=>s+x.r,0);
  const totalDM=moisRows.reduce((s,x)=>s+x.d,0);

  el.innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Recettes (${dateVal})</div><div class="stat-value green">${fmt(totalR)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">Dépenses (${dateVal})</div><div class="stat-value red">${fmt(totalD)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">Solde du jour</div><div class="stat-value ${totalR-totalD>=0?'green':'red'}">${fmt(totalR-totalD)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">Recettes mois (${moisVal})</div><div class="stat-value green">${fmt(totalRM)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">Dépenses mois</div><div class="stat-value red">${fmt(totalDM)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">Solde mensuel</div><div class="stat-value ${totalRM-totalDM>=0?'green':'red'}">${fmt(totalRM-totalDM)}</div><div class="stat-sub">FCFA</div></div>
    </div>
    <div class="card">
      <div class="card-title">Résumé par boutique — ${dateVal}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Boutique</th><th>Recettes</th><th>Dépenses</th><th>Solde jour</th><th>Recettes mois</th><th>Solde mois</th></tr></thead>
        <tbody>${rows.map(({b,r,d},i)=>{
          const rm=moisRows[i].r, dm=moisRows[i].d;
          return `<tr class="global-row">
            <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.couleur};margin-right:8px"></span>${b.nom}</td>
            <td class="green">${fmt(r)} FCFA</td>
            <td class="red">${fmt(d)} FCFA</td>
            <td class="${r-d>=0?'green':'red'}" style="font-weight:700">${fmt(r-d)} FCFA</td>
            <td class="green">${fmt(rm)} FCFA</td>
            <td class="${rm-dm>=0?'green':'red'}" style="font-weight:700">${fmt(rm-dm)} FCFA</td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:800;border-top:2px solid var(--border)">
          <td>TOTAL</td>
          <td class="green">${fmt(totalR)} FCFA</td>
          <td class="red">${fmt(totalD)} FCFA</td>
          <td class="${totalR-totalD>=0?'green':'red'}">${fmt(totalR-totalD)} FCFA</td>
          <td class="green">${fmt(totalRM)} FCFA</td>
          <td class="${totalRM-totalDM>=0?'green':'red'}">${fmt(totalRM-totalDM)} FCFA</td>
        </tr>
        </tbody>
      </table></div>
    </div>
    <!-- GRAPHIQUE COMPARATIF 30J -->
    <div class="card">
      <div class="card-title">📈 Évolution recettes — 30 derniers jours (toutes boutiques)</div>
      <canvas id="chart-global-comp" height="70"></canvas>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-title">🏆 Recettes du jour par boutique</div>
        <canvas id="chart-global-bar" height="160"></canvas>
      </div>
      <div class="card">
        <div class="card-title">📊 Solde mensuel par boutique</div>
        <canvas id="chart-global-solde" height="160"></canvas>
      </div>
    </div>`;

  // Données 30j pour graphique comparatif
  const days30g=[];
  for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days30g.push(d.toISOString().split('T')[0]); }
  const labels30g=days30g.map(d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}));

  const recParBoutiqueJour=await Promise.all(boutiques.map(async b=>{
    const {data}=await sb.from('recettes').select('montant,date').eq('boutique_id',b.id).gte('date',days30g[0]);
    const parJour={};
    days30g.forEach(d=>parJour[d]=0);
    (data||[]).forEach(r=>{ if(parJour[r.date]!==undefined) parJour[r.date]+=parseFloat(r.montant); });
    return {b,parJour};
  }));

  const drawG=()=>{
    // Graphique ligne comparatif
    const ctx1=document.getElementById('chart-global-comp');
    if(ctx1) new Chart(ctx1,{
      type:'line',
      data:{labels:labels30g,datasets:recParBoutiqueJour.map(({b,parJour})=>({
        label:b.nom, data:days30g.map(d=>parJour[d]||0),
        borderColor:b.couleur, backgroundColor:b.couleur+'22',
        tension:0.4, fill:false, pointRadius:2,
      }))},
      options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0',boxWidth:10,font:{size:10}}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},x:{grid:{display:false},ticks:{color:'#8b8fa8',maxTicksLimit:8}}}}
    });
    // Bar chart recettes du jour
    const ctx2=document.getElementById('chart-global-bar');
    if(ctx2) new Chart(ctx2,{
      type:'bar',
      data:{labels:rows.map(r=>r.b.nom.length>10?r.b.nom.substring(0,10)+'…':r.b.nom),
        datasets:[
          {label:'Recettes',data:rows.map(r=>r.r),backgroundColor:rows.map(r=>r.b.couleur+'bb'),borderRadius:6},
          {label:'Dépenses',data:rows.map(r=>r.d),backgroundColor:'rgba(240,79,94,0.6)',borderRadius:6},
        ]},
      options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
    });
    // Bar chart solde mensuel
    const ctx3=document.getElementById('chart-global-solde');
    if(ctx3) new Chart(ctx3,{
      type:'bar',
      data:{labels:moisRows.map(r=>r.b.nom.length>10?r.b.nom.substring(0,10)+'…':r.b.nom),
        datasets:[{label:'Solde mensuel',data:moisRows.map(r=>r.r-r.d),backgroundColor:moisRows.map(r=>r.r-r.d>=0?r.b.couleur+'bb':'rgba(240,79,94,0.7)'),borderRadius:6}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa8',callback:v=>fmt(v)}},x:{grid:{display:false},ticks:{color:'#8b8fa8'}}}}
    });
  };
  if(!window.Chart){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload=drawG; document.head.appendChild(s);
  } else { drawG(); }
}
