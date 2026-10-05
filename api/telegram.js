// POST /api/telegram  { message }
// Envoie un message au bot Telegram. Seul un utilisateur connecté à Nance Group peut l'utiliser,
// et le token du bot reste caché sur le serveur.
const { compteAppelant, repondre, lireCorps } = require('./_outils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'Méthode non autorisée' });
  try {
    const compte = await compteAppelant(req);
    if (!compte) return repondre(res, 401, { erreur: 'Non connecté' });

    const { message } = await lireCorps(req);
    if (!message || typeof message !== 'string') return repondre(res, 400, { erreur: 'Message vide' });

    const token = process.env.TELEGRAM_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return repondre(res, 500, { erreur: 'Telegram non configuré sur le serveur' });

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message.slice(0, 4000), parse_mode: 'HTML' })
    });
    if (!r.ok) return repondre(res, 502, { erreur: 'Telegram a refusé le message' });
    return repondre(res, 200, { ok: true });
  } catch (e) {
    return repondre(res, 500, { erreur: e.message });
  }
};
