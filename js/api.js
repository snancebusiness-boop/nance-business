// Nance Group — appels serveur (dossier /api sur Vercel)
// Les secrets (token Telegram, clé admin Supabase) restent côté serveur,
// dans les variables d'environnement Vercel. Jamais dans ce fichier.

async function appelApi(chemin, corps) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Session expirée, reconnectez-vous');
  const r = await fetch(chemin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(corps || {})
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erreur || ('Erreur serveur (' + r.status + ')'));
  return j;
}

async function envoyerTelegram(message) {
  try { await appelApi('/api/telegram', { message }); }
  catch (e) { console.log('Telegram :', e.message); }
}

async function logNotifPdg(type, icone, message, details=null) {
  if(currentUser.role==='pdg') return;
  const boutique = currentBoutique?.nom||'Global';
  const auteur = currentUser.role==='superviseur'?'Superviseur':(currentUser.nom_complet||currentUser.boutiques?.nom||'Responsable');
  await sb.from('notifs_pdg').insert({
    type,
    boutique_id: currentBoutique?.id||null,
    boutique_nom: boutique,
    auteur,
    message: `${icone} ${message}`,
    details: details ? JSON.stringify(details) : null,
    lu: false
  });
  // Envoyer notification Telegram
  const texte = `🔔 <b>Nance Group</b>\n\n${icone} <b>${message}</b>\n\n📍 Boutique : ${boutique}\n👤 Par : ${auteur}\n🕐 ${new Date().toLocaleString('fr-FR')}`;
  await envoyerTelegram(texte);
}

// ===================== RÉSUMÉ QUOTIDIEN TELEGRAM =====================
async function envoyerResumeTelegram() {
  if(!currentUser||currentUser.role!=='pdg') return;
  const today=new Date().toISOString().split('T')[0];
  const stored=localStorage.getItem('last_resume_telegram');
  if(stored===today) return; // Déjà envoyé aujourd'hui

  const rows=await Promise.all(boutiques.map(async b=>{
    const [{data:rec},{data:dep}]=await Promise.all([
      sb.from('recettes').select('montant').eq('boutique_id',b.id).eq('date',today),
      sb.from('depenses').select('montant').eq('boutique_id',b.id).eq('date',today),
    ]);
    const totalRec=(rec||[]).reduce((s,r)=>s+parseFloat(r.montant),0);
    const totalDep=(dep||[]).reduce((s,d)=>s+parseFloat(d.montant),0);
    return {nom:b.nom,rec:totalRec,dep:totalDep,solde:totalRec-totalDep};
  }));

  const grandRec=rows.reduce((s,r)=>s+r.rec,0);
  const grandDep=rows.reduce((s,r)=>s+r.dep,0);
  const grandSolde=grandRec-grandDep;

  const lignes=rows.filter(r=>r.rec>0||r.dep>0).map(r=>
    `• ${r.nom}: +${fmt(r.rec)} / -${fmt(r.dep)} = ${fmt(r.solde)} FCFA`
  ).join('\n');

  const msg=`📊 <b>Résumé du jour — ${today}</b>\n\n${lignes||'Aucune transaction'}\n\n💰 Total recettes: <b>${fmt(grandRec)} FCFA</b>\n💸 Total dépenses: <b>${fmt(grandDep)} FCFA</b>\n📈 Solde net: <b>${fmt(grandSolde)} FCFA</b>\n\n🕐 Généré à ${new Date().toLocaleTimeString('fr-FR')}`;
  await envoyerTelegram(msg);
  localStorage.setItem('last_resume_telegram', today);
}
