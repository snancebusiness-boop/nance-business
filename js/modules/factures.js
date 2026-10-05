// Nance Group — module factures
// ===================== FACTURES CLIENTS =====================
async function renderFactures() {
  const today=new Date().toISOString().split('T')[0];
  const mois=today.substring(0,7);
  const [{data:factures},{data:stocks},{data:boutique}]=await Promise.all([
    sb.from('factures').select('*').eq('boutique_id',currentBoutique.id).order('created_at',{ascending:false}),
    sb.from('stocks').select('id,produit,prix_vente').eq('boutique_id',currentBoutique.id).order('produit'),
    sb.from('boutiques').select('*').eq('id',currentBoutique.id).single(),
  ]);

  const numAuto='FAC-'+Date.now().toString().slice(-6);
  const totalJour=(factures||[]).filter(f=>f.date===today).reduce((s,f)=>s+(f.total||0),0);
  const totalMois=(factures||[]).filter(f=>f.date?.startsWith(mois)).reduce((s,f)=>s+(f.total||0),0);
  const nbJour=(factures||[]).filter(f=>f.date===today).length;
  const logo=localStorage.getItem('nance_logo');
  const telBoutique=boutique?.telephone||localStorage.getItem('nance_tel_boutique_'+currentBoutique.id)||'';

  document.getElementById('content').innerHTML=`
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">🧾 Factures aujourd'hui</div><div class="stat-value accent">${nbJour}</div><div class="stat-sub">facture(s)</div></div>
      <div class="stat-card"><div class="stat-label">💰 Total du jour</div><div class="stat-value green">${fmt(totalJour)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">📅 Total du mois</div><div class="stat-value amber">${fmt(totalMois)}</div><div class="stat-sub">FCFA</div></div>
      <div class="stat-card"><div class="stat-label">📋 Total factures</div><div class="stat-value">${(factures||[]).length}</div><div class="stat-sub">au total</div></div>
    </div>

    <!-- Paramètres ticket -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:pointer" onclick="toggleTicketSettings()">
        <div class="card-title" style="margin-bottom:0">⚙️ Paramètres du ticket</div>
        <span id="ticket-settings-arrow">▾</span>
      </div>
      <div id="ticket-settings-body">
        <div class="form-row">
          <div><label class="inp-label">📞 Téléphone boutique (sur ticket)</label>
            <input class="inp" id="fac-tel-boutique" value="${telBoutique}" placeholder="+242 06 ...">
          </div>
          <div><label class="inp-label">🏷 TVA (%)</label>
            <input class="inp" id="fac-tva" type="number" placeholder="0" value="${localStorage.getItem('nance_tva')||0}" style="width:80px">
          </div>
          <div style="display:flex;align-items:flex-end">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="fac-show-logo" ${localStorage.getItem('nance_ticket_logo')==='true'?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)">
              <span style="font-size:13px">Afficher logo sur ticket</span>
            </label>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn btn-accent btn-sm" onclick="sauvegarderParamsTicket()">💾 Sauver</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Nouvelle facture -->
    <div class="card">
      <div class="card-title">🧾 Nouvelle facture</div>
      <div class="form-row">
        <div><label class="inp-label">N° Facture</label><input class="inp" id="fac-num" value="${numAuto}" style="width:140px"></div>
        <div style="flex:2"><label class="inp-label">Client</label><input class="inp" id="fac-client" placeholder="Nom du client (optionnel)"></div>
        <div><label class="inp-label">📞 Téléphone client</label><input class="inp" id="fac-tel" placeholder="+242..."></div>
        <div><label class="inp-label">Date</label><input class="inp" id="fac-date" type="date" value="${today}"></div>
        <div><label class="inp-label">Mode de paiement</label>
          <select class="inp" id="fac-mode">
            <option value="espèces">💵 Espèces</option>
            <option value="mobile">📱 Mobile Money</option>
            <option value="virement">🏦 Virement</option>
            <option value="carte">💳 Carte</option>
            <option value="credit">📋 Crédit</option>
          </select>
        </div>
      </div>
      <div style="margin-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="font-weight:700;font-size:13px">Articles</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${currentBoutique?.nom?.toLowerCase().includes('play')?`
            <button class="btn btn-ghost btn-sm" onclick="ajouterLigneJeu('match')" style="color:var(--accent)">🎮 + Match</button>
            <button class="btn btn-ghost btn-sm" onclick="ajouterLigneJeu('heure')" style="color:var(--amber)">⏱ + Heure</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="ajouterLigneFacture('produit')">📦 + Produit</button>
          </div>
        </div>
        <div id="fac-articles">
          ${currentBoutique?.nom?.toLowerCase().includes('play')?`
          <div class="fac-article-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap;background:var(--bg3);border-radius:8px;padding:8px">
            <span class="jeu-icon" style="font-size:16px">🎮</span>
            <select class="inp" style="flex:2;min-width:140px" onchange="handleJeuSelect(this);updateJeuIcon(this);calculerTotalFacture()">
              ${getJeuxOptions()}
            </select>
            <input class="inp" type="number" placeholder="Nb matchs" value="1" style="width:90px" oninput="calculerTotalFacture()">
            <input class="inp" type="number" placeholder="Prix/match" style="width:100px" oninput="calculerTotalFacture()">
            <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
            <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>
          </div>`:`
          <div class="fac-article-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap;background:var(--bg3);border-radius:8px;padding:8px">
            <span style="font-size:16px">📦</span>
            <select class="inp" style="flex:2;min-width:140px" onchange="remplirPrixArticle(this)">
              <option value="">Choisir produit...</option>
              ${(stocks||[]).map(s=>`<option value="${s.prix_vente}" data-nom="${s.produit}">${s.produit}</option>`).join('')}
              <option value="0" data-nom="">Autre</option>
            </select>
            <input class="inp" placeholder="Description" style="flex:2;min-width:120px" oninput="calculerTotalFacture()">
            <input class="inp" type="number" placeholder="Qté" value="1" style="width:60px" oninput="calculerTotalFacture()">
            <input class="inp" type="number" placeholder="Prix unit." style="width:100px" oninput="calculerTotalFacture()">
            <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
            <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>
          </div>`}
        </div>
      </div>
      <div style="margin-top:10px">
        <label class="inp-label">📝 Note / Commentaire</label>
        <input class="inp" id="fac-note" placeholder="Ex: Livraison incluse, merci...">
      </div>
      <div style="margin-top:12px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div><label class="inp-label">Remise (%)</label><input class="inp" id="fac-remise" type="number" placeholder="0" value="0" style="width:80px" oninput="calculerTotalFacture()"></div>
        <div style="font-size:20px;font-weight:800" id="fac-total-display">Total: 0 FCFA</div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="enregistrerFacture()">💾 Enregistrer</button>
        <button class="btn btn-ghost" onclick="imprimerTicket()">🖨️ Imprimer ticket</button>
      </div>
    </div>

    <!-- Historique avec recherche -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin-bottom:0">📋 Historique des factures (${(factures||[]).length})</div>
        <input class="inp" id="fac-search" placeholder="🔍 Rechercher par client ou N°..." style="width:250px" oninput="filtrerFactures()">
      </div>
      <div id="fac-table">
        ${renderTableFactures(factures||[])}
      </div>
    </div>`;

  window._facStocks=stocks||[];
  window._factures=factures||[];
  calculerTotalFacture();
}

function renderTableFactures(data) {
  if(data.length===0) return '<div class="empty-state"><p>Aucune facture</p></div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>N°</th><th>Client</th><th>Tél</th><th>Date</th><th>Mode</th><th>Articles</th><th>Total</th><th>Actions</th></tr></thead>
    <tbody>${data.map(f=>{
      const articles=JSON.parse(f.articles||'[]');
      const modeIcon=f.mode_paiement==='mobile'?'📱':f.mode_paiement==='virement'?'🏦':f.mode_paiement==='carte'?'💳':f.mode_paiement==='credit'?'📋':'💵';
      return `<tr>
        <td style="font-weight:700;color:var(--accent)">${f.numero}</td>
        <td>${f.client_nom||'Anonyme'}</td>
        <td style="color:var(--text2);font-size:11px">${f.client_tel||'—'}</td>
        <td style="color:var(--text2)">${f.date}</td>
        <td>${modeIcon} <span style="font-size:11px">${f.mode_paiement||'espèces'}</span></td>
        <td style="font-size:11px;color:var(--text2)">${articles.length} article(s)</td>
        <td style="font-weight:700;color:var(--green)">${fmt(f.total)} FCFA</td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-accent btn-sm" onclick="reimprimer('${f.id}')">🖨️</button>
          <button class="btn btn-red btn-sm" onclick="supprimerFacture('${f.id}')">✕</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function filtrerFactures() {
  const q=document.getElementById('fac-search')?.value.toLowerCase()||'';
  const filtered=(window._factures||[]).filter(f=>
    !q||
    (f.client_nom||'').toLowerCase().includes(q)||
    (f.numero||'').toLowerCase().includes(q)||
    (f.client_tel||'').includes(q)
  );
  const el=document.getElementById('fac-table');
  if(el) el.innerHTML=renderTableFactures(filtered);
}

function toggleTicketSettings() {
  const body=document.getElementById('ticket-settings-body');
  const arrow=document.getElementById('ticket-settings-arrow');
  if(!body) return;
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'block';
  if(arrow) arrow.textContent=isOpen?'▸':'▾';
}

function sauvegarderParamsTicket() {
  const tel=document.getElementById('fac-tel-boutique')?.value.trim()||'';
  const tva=parseFloat(document.getElementById('fac-tva')?.value)||0;
  const logo=document.getElementById('fac-show-logo')?.checked;
  localStorage.setItem('nance_tel_boutique_'+currentBoutique.id, tel);
  localStorage.setItem('nance_tva', tva);
  localStorage.setItem('nance_ticket_logo', logo);
  notif('Paramètres ticket sauvegardés ✓','success');
}

function getJeuIcon(jeu) {
  const j=jeu.toLowerCase();
  if(j.includes('ps3')||j.includes('ps4')||j.includes('ps5')||j.includes('playstation')) return '🎮';
  if(j.includes('course')||j.includes('racing')||j.includes('voiture')) return '🏎️';
  if(j.includes('billard')||j.includes('billiard')||j.includes('pool')) return '🎱';
  if(j.includes('ping')||j.includes('tennis de table')) return '🏓';
  if(j.includes('foot')||j.includes('football')||j.includes('soccer')) return '⚽';
  if(j.includes('basket')||j.includes('basketball')) return '🏀';
  if(j.includes('boxe')||j.includes('combat')||j.includes('fight')) return '🥊';
  if(j.includes('heure')||j.includes('time')) return '⏱';
  return '🕹️';
}

function getJeuxOptions() {
  const jeuxSauves=JSON.parse(localStorage.getItem('nance_jeux_list')||'null');
  const jeuxDefaut=['PS3','PS4','PS5','Course','Billard','Ping Pong'];
  const jeux=jeuxSauves||jeuxDefaut;
  return jeux.map(j=>`<option value="${j}">${getJeuIcon(j)} ${j}</option>`).join('')+
    `<option value="__autre__">+ Ajouter un jeu...</option>`;
}

function ajouterLigneJeu(type) {
  const div=document.createElement('div');
  div.className='fac-article-row';
  div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap;background:var(--bg3);border-radius:8px;padding:8px';
  const firstJeu=JSON.parse(localStorage.getItem('nance_jeux_list')||'["PS3"]')[0]||'PS4';
  const placeholder=type==='match'?'Nb matchs':'Heures';
  const pricePlaceholder=type==='match'?'Prix/match':'Prix/heure';
  div.innerHTML=`
    <span class="jeu-icon" style="font-size:18px;min-width:22px">${type==='heure'?'⏱':getJeuIcon(firstJeu)}</span>
    <select class="inp" style="flex:2;min-width:140px" onchange="handleJeuSelect(this);updateJeuIcon(this);calculerTotalFacture()">
      ${getJeuxOptions()}
    </select>
    <input class="inp" type="number" placeholder="${placeholder}" value="1" style="width:90px" oninput="calculerTotalFacture()">
    <input class="inp" type="number" placeholder="${pricePlaceholder}" style="width:100px" oninput="calculerTotalFacture()">
    <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
    <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>`;
  document.getElementById('fac-articles').appendChild(div);
  calculerTotalFacture();
}

function updateJeuIcon(sel) {
  const row=sel.closest('.fac-article-row');
  const icon=row?.querySelector('.jeu-icon');
  if(icon&&sel.value&&sel.value!=='__autre__') {
    // Garder ⏱ pour les lignes heure
    const isHeure=row.querySelectorAll('input[type="number"]')[0]?.placeholder==='Heures';
    icon.textContent=isHeure?'⏱':getJeuIcon(sel.value);
  }
}

function handleJeuSelect(sel) {
  if(sel.value==='__autre__') {
    const nouveau=prompt('Nom du nouveau jeu/console :');
    if(nouveau&&nouveau.trim()) {
      const jeux=JSON.parse(localStorage.getItem('nance_jeux_list')||'["PS3","PS4","PS5","Course","Billard","Ping Pong"]');
      jeux.push(nouveau.trim());
      localStorage.setItem('nance_jeux_list',JSON.stringify(jeux));
      // Mettre à jour tous les selects de jeux
      document.querySelectorAll('.fac-article-row select').forEach(s=>{
        if(s.querySelector('option[value="__autre__"]')){
          const val=s.value;
          s.innerHTML=getJeuxOptions();
          // Sélectionner le nouveau jeu
          s.value=nouveau.trim();
        }
      });
      notif(`Jeu "${nouveau.trim()}" ajouté ✓`,'success');
    } else {
      sel.value=sel.options[0].value;
    }
  }
}

function remplirPrixArticle(sel) {
  const row=sel.closest('.fac-article-row');
  const prix=parseFloat(sel.value)||0;
  const nom=sel.selectedOptions[0]?.dataset.nom||'';
  const descInp=row.querySelectorAll('input')[0];
  const prixInp=row.querySelectorAll('input')[2];
  if(nom&&descInp) descInp.value=nom;
  if(prixInp) prixInp.value=prix;
  calculerTotalFacture();
}

function ajouterLigneFacture(type='produit') {
  const div=document.createElement('div');
  div.className='fac-article-row';
  div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap;background:var(--bg3);border-radius:8px;padding:8px';

  if(type==='match'){
    div.innerHTML=`
      <span style="font-size:16px">🎮</span>
      <input class="inp" placeholder="Console / Jeu" style="flex:2;min-width:120px" oninput="calculerTotalFacture()" value="Match PS4">
      <input class="inp" type="number" placeholder="Nb matchs" value="1" style="width:90px" oninput="calculerTotalFacture()">
      <input class="inp" type="number" placeholder="Prix/match" style="width:100px" oninput="calculerTotalFacture()">
      <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
      <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>`;
  } else if(type==='heure'){
    div.innerHTML=`
      <span style="font-size:16px">⏱</span>
      <input class="inp" placeholder="Console / Jeu" style="flex:2;min-width:120px" oninput="calculerTotalFacture()" value="Heure PS4">
      <input class="inp" type="number" placeholder="Heures" value="1" step="0.5" style="width:80px" oninput="calculerTotalFacture()">
      <input class="inp" type="number" placeholder="Prix/heure" style="width:100px" oninput="calculerTotalFacture()">
      <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
      <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>`;
  } else {
    div.innerHTML=`
      <span style="font-size:16px">📦</span>
      <select class="inp" style="flex:2;min-width:140px" onchange="remplirPrixArticle(this)">
        <option value="">Choisir produit...</option>
        ${(window._facStocks||[]).map(s=>`<option value="${s.prix_vente}" data-nom="${s.produit}">${s.produit}</option>`).join('')}
        <option value="0" data-nom="">Autre</option>
      </select>
      <input class="inp" placeholder="Description" style="flex:2;min-width:120px" oninput="calculerTotalFacture()">
      <input class="inp" type="number" placeholder="Qté" value="1" style="width:60px" oninput="calculerTotalFacture()">
      <input class="inp" type="number" placeholder="Prix unit." style="width:100px" oninput="calculerTotalFacture()">
      <div style="width:110px;font-weight:700;color:var(--green);font-size:13px;text-align:right" class="fac-ligne-total">0 FCFA</div>
      <button class="btn btn-red btn-sm" onclick="this.closest('.fac-article-row').remove();calculerTotalFacture()">✕</button>`;
  }
  document.getElementById('fac-articles').appendChild(div);
  calculerTotalFacture();
}

function calculerTotalFacture() {
  let total=0;
  document.querySelectorAll('.fac-article-row').forEach(row=>{
    const icon=row.querySelector('span')?.textContent.trim();
    const inputs=row.querySelectorAll('input[type="number"]');
    let qte=0, prix=0;
    if(icon==='🎮'||icon==='⏱') {
      qte=parseFloat(inputs[0]?.value)||0;
      prix=parseFloat(inputs[1]?.value)||0;
    } else {
      const hasSel=!!row.querySelector('select');
      qte=parseFloat(inputs[hasSel?0:1]?.value)||0;
      prix=parseFloat(inputs[hasSel?1:2]?.value)||0;
    }
    const ligneTotal=qte*prix;
    const totalEl=row.querySelector('.fac-ligne-total');
    if(totalEl) totalEl.textContent=fmt(ligneTotal)+' FCFA';
    total+=ligneTotal;
  });
  const remise=parseFloat(document.getElementById('fac-remise')?.value)||0;
  const tva=parseFloat(localStorage.getItem('nance_tva'))||0;
  const totalApresRemise=total*(1-remise/100);
  const montantTVA=tva>0?Math.round(totalApresRemise*(tva/100)):0;
  const totalFinal=totalApresRemise+montantTVA;
  const el=document.getElementById('fac-total-display');
  if(el) el.innerHTML=`Total: <span style="color:var(--green)">${fmt(totalFinal)} FCFA</span>
    ${remise>0?`<span style="font-size:11px;color:var(--text2)"> (remise ${remise}%: -${fmt(total-totalApresRemise)} FCFA)</span>`:''}
    ${tva>0?`<span style="font-size:11px;color:var(--amber)"> + TVA ${tva}%: ${fmt(montantTVA)} FCFA</span>`:''}`;
  window._facTotal=totalFinal;
  window._facTotalBrut=total;
  window._facTotalHT=totalApresRemise;
}

function getArticlesFacture() {
  const articles=[];
  document.querySelectorAll('.fac-article-row').forEach(row=>{
    const icon=row.querySelector('span')?.textContent.trim();
    const inputs=row.querySelectorAll('input');
    const sel=row.querySelector('select');
    if(icon==='🎮') {
      const jeu=sel?sel.value:(inputs[0]?.value.trim());
      const nb=parseFloat(inputs[0]?.value)||0;
      const prix=parseFloat(inputs[1]?.value)||0;
      if(jeu&&nb&&prix) articles.push({type:'match',desc:jeu,qte:nb,prix,total:nb*prix,unite:'match'});
    } else if(icon==='⏱') {
      const jeu=sel?sel.value:(inputs[0]?.value.trim());
      const heures=parseFloat(inputs[0]?.value)||0;
      const prix=parseFloat(inputs[1]?.value)||0;
      if(jeu&&heures&&prix) articles.push({type:'heure',desc:jeu,qte:heures,prix,total:heures*prix,unite:'h'});
    } else {
      const desc=inputs[0]?.value.trim()||sel?.selectedOptions[0]?.dataset.nom||'';
      const qte=parseFloat(inputs[sel?0:1]?.value)||0;
      const prix=parseFloat(inputs[sel?1:2]?.value)||0;
      if(prix) articles.push({type:'produit',desc,qte:qte||1,prix,total:(qte||1)*prix,unite:''});
    }
  });
  return articles;
}

async function enregistrerFacture() {
  const articles=getArticlesFacture();
  if(articles.length===0) return notif('Ajoutez au moins un article','error');
  const num=document.getElementById('fac-num').value.trim();
  const client=document.getElementById('fac-client').value.trim();
  const tel=document.getElementById('fac-tel').value.trim();
  const date=document.getElementById('fac-date').value;
  const mode=document.getElementById('fac-mode').value;
  const remise=parseFloat(document.getElementById('fac-remise').value)||0;
  const note=document.getElementById('fac-note').value.trim();
  const total=window._facTotal||0;

  await sb.from('factures').insert({
    boutique_id:currentBoutique.id, numero:num,
    client_nom:client||null, client_tel:tel||null,
    date, articles:JSON.stringify(articles),
    remise, total, mode_paiement:mode, note:note||null
  });

  // ✅ Ajouter automatiquement dans les recettes
  await sb.from('recettes').insert({
    boutique_id:currentBoutique.id,
    date, montant:total,
    description:`Facture ${num}${client?' — '+client:''}`,
    mode_paiement:mode
  });

  await logNotifPdg('facture','🧾',`Facture ${num} — ${fmt(total)} FCFA${client?' — '+client:''}`);
  notif('Facture enregistrée + recette ajoutée ✓','success');
  imprimerTicket();
  renderFactures();
}

function imprimerTicket() {
  const articles=getArticlesFacture();
  const num=document.getElementById('fac-num')?.value||'FAC-?';
  const client=document.getElementById('fac-client')?.value||'';
  const tel=document.getElementById('fac-tel')?.value||'';
  const date=document.getElementById('fac-date')?.value||new Date().toISOString().split('T')[0];
  const mode=document.getElementById('fac-mode')?.value||'espèces';
  const remise=parseFloat(document.getElementById('fac-remise')?.value)||0;
  const note=document.getElementById('fac-note')?.value||'';
  const total=window._facTotal||0;
  const totalBrut=window._facTotalBrut||total;
  const nom=localStorage.getItem('nance_app_nom')||'Nance Group';
  const boutique=currentBoutique?.nom||'';
  const now=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const modeIcon=mode==='mobile'?'📱':mode==='virement'?'🏦':mode==='carte'?'💳':mode==='credit'?'📋':'💵';
  const tva=parseFloat(localStorage.getItem('nance_tva'))||0;
  const montantTVA=tva>0?Math.round(total*(tva/100)):0;
  const totalTTC=total+montantTVA;
  const showLogo=localStorage.getItem('nance_ticket_logo')==='true';
  const logo=localStorage.getItem('nance_logo');
  const telBoutique=localStorage.getItem('nance_tel_boutique_'+currentBoutique?.id)||'';

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${num}</title>
  <style>
    @page{margin:0;size:58mm auto}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:11px;width:58mm;padding:4mm;color:#000;background:#fff}
    .center{text-align:center}.bold{font-weight:bold}
    .line{border-top:1px dashed #000;margin:3px 0}
    .row{display:flex;justify-content:space-between}
    .big{font-size:14px;font-weight:bold}.small{font-size:9px}
  </style></head><body>
  <div class="center bold" style="font-size:15px">${nom}</div>
  ${showLogo&&logo?`<div class="center" style="margin:3px 0"><img src="${logo}" style="width:40px;height:40px;object-fit:cover;border-radius:6px"></div>`:''}
  <div class="center small">${boutique}</div>
  ${telBoutique?`<div class="center small">Tél: ${telBoutique}</div>`:''}
  <div class="center small">${date} à ${now}</div>
  <div class="line"></div>
  <div class="row small"><span>N° Ticket:</span><span class="bold">${num}</span></div>
  ${client?`<div class="row small"><span>Client:</span><span class="bold">${client}</span></div>`:''}
  ${tel?`<div class="row small"><span>Tél:</span><span>${tel}</span></div>`:''}
  <div class="line"></div>
  <div class="bold small">ARTICLES :</div>
  <div style="margin:2px 0"></div>
  ${articles.map(a=>{
    const icon=a.type==='match'?getJeuIcon(a.desc):a.type==='heure'?'⏱':'📦';
    return `
  <div style="margin:3px 0">
    <div>${icon} ${a.desc}</div>
    <div class="row">
      <span style="font-size:10px">${a.qte}${a.unite==='h'?'h':a.unite==='match'?' match(s)':' x'} × ${fmt(a.prix)} FCFA${a.unite==='h'?'/h':a.unite==='match'?'/match':''}</span>
      <span class="bold">${fmt(a.total)} FCFA</span>
    </div>
  </div>`}).join('')}
  <div class="line"></div>
  ${remise>0?`
  <div class="row small"><span>Sous-total:</span><span>${fmt(totalBrut)} FCFA</span></div>
  <div class="row small"><span>Remise ${remise}%:</span><span>-${fmt(totalBrut-total)} FCFA</span></div>
  <div class="line"></div>`:''}
  ${tva>0?`
  <div class="row small"><span>HT:</span><span>${fmt(total)} FCFA</span></div>
  <div class="row small"><span>TVA ${tva}%:</span><span>${fmt(montantTVA)} FCFA</span></div>
  <div class="line"></div>
  <div class="row big"><span>TOTAL TTC:</span><span>${fmt(totalTTC)} FCFA</span></div>`:`
  <div class="row big"><span>TOTAL:</span><span>${fmt(total)} FCFA</span></div>`}
  <div class="row small" style="margin-top:2px"><span>Paiement:</span><span>${modeIcon} ${mode}</span></div>
  ${note?`<div class="line"></div><div class="small" style="text-align:center;font-style:italic">${note}</div>`:''}
  <div class="line"></div>
  <div class="center small" style="margin-top:3px">Merci de votre visite ! 🙏</div>
  <div class="center small">${nom}</div>
  <div style="margin-top:10px"></div>
  </body></html>`;

  const win=window.open('','_blank','width=300,height=700');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function reimprimer(factureId) {
  const {data:f}=await sb.from('factures').select('*').eq('id',factureId).single();
  if(!f) return;
  const articles=JSON.parse(f.articles||'[]');
  const nom=localStorage.getItem('nance_app_nom')||'Nance Group';
  const boutique=currentBoutique?.nom||'';
  const now=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const totalBrut=articles.reduce((s,a)=>s+a.total,0);

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${f.numero}</title>
  <style>
    @page{margin:0;size:58mm auto}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:11px;width:58mm;padding:4mm;color:#000;background:#fff}
    .center{text-align:center}.bold{font-weight:bold}
    .line{border-top:1px dashed #000;margin:3px 0}
    .row{display:flex;justify-content:space-between}
    .big{font-size:14px;font-weight:bold}.small{font-size:9px}
  </style></head><body>
  <div class="center bold" style="font-size:14px">${nom}</div>
  <div class="center small">${boutique}</div>
  <div class="center small">${f.date} ${now}</div>
  <div class="line"></div>
  <div class="row small"><span>Ticket N°:</span><span class="bold">${f.numero}</span></div>
  <div class="row small"><span>Client:</span><span>${f.client_nom||'Anonyme'}</span></div>
  <div class="line"></div>
  <div class="bold small">ARTICLES</div>
  ${articles.map(a=>`<div style="margin:2px 0">
    <div class="small">${a.desc}</div>
    <div class="row small"><span>${a.qte} x ${fmt(a.prix)}</span><span class="bold">${fmt(a.total)} FCFA</span></div>
  </div>`).join('')}
  <div class="line"></div>
  ${f.remise>0?`<div class="row small"><span>Sous-total:</span><span>${fmt(totalBrut)} FCFA</span></div>
  <div class="row small"><span>Remise (${f.remise}%):</span><span>-${fmt(totalBrut-f.total)} FCFA</span></div>`:''}
  <div class="line"></div>
  <div class="row big"><span>TOTAL:</span><span>${fmt(f.total)} FCFA</span></div>
  <div class="line"></div>
  <div class="center small" style="margin-top:4px">Merci de votre visite !</div>
  <div style="margin-top:8px"></div>
  </body></html>`;
  const win=window.open('','_blank','width=300,height=600');
  win.document.write(html); win.document.close();
  win.onload=()=>win.print();
}

async function supprimerFacture(id) {
  if(!confirm('Supprimer cette facture ?')) return;
  await sb.from('factures').delete().eq('id',id);
  notif('Facture supprimée','success'); renderFactures();
}
