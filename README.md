# Nance Group

Application de gestion multi-boutiques (République du Congo).

| Dossier / fichier | Rôle |
|---|---|
| `index.html` | Aiguillage : connexion ou espace de gestion |
| `connexion.html` | Page de connexion sécurisée (Supabase Auth) |
| `app.html` | Espace de gestion (PDG, superviseur, responsable) |
| `offline.html` | Page affichée sans internet |
| `style.css` | Design commun (Anthracite & Cuivre) |
| `js/config.js` | Connexion Supabase (clé publique uniquement) |
| `js/auth.js` | Session, PIN, verrouillage, déconnexion |
| `js/core.js`, `js/navigation.js` | Socle, menus, onglets |
| `js/api.js` | Appels aux fonctions serveur (Telegram, comptes) |
| `js/modules/*.js` | Un fichier par fonctionnalité |
| `api/telegram.js` | Envoi Telegram (token caché sur Vercel) |
| `api/comptes.js` | Création / modification / suppression des comptes (PDG) |
| `sql/01_securite.sql` | Script de sécurisation (une seule fois) |
| `manifest.json`, `service-worker.js`, `pwa.js`, `icons/` | Application installable |

Mise en ligne : voir `DEPLOIEMENT.md`.
Aucun mot de passe, token ou clé secrète ne doit être écrit dans ces fichiers.
