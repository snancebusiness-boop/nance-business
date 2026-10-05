# Nance Group — Mise en ligne de la version sécurisée

Durée : environ 30 minutes. Fais les étapes **dans l'ordre**, d'une traite.
Entre l'étape 4 et l'étape 5, le site est coupé quelques minutes, c'est normal.

---

## Étape 1 — Récupérer la clé secrète Supabase

1. Va sur **supabase.com** → ton projet Nance (`vfgmaevqcbqzstqnjqjt`).
2. Menu de gauche, en bas : **Project Settings** → **API Keys**.
3. Dans la partie **Secret keys** : copie la clé qui commence par `sb_secret_...`.
   S'il n'y en a pas, clique sur **Create new secret key**.
   > Si tu ne vois que l'ancien onglet « Legacy », prends la clé **service_role**.
4. Garde-la de côté (bloc-notes). **Ne l'envoie à personne, ni dans un chat.**

## Étape 2 — Bloquer les inscriptions libres

Supabase → **Authentication** → **Sign In / Providers** (ou « Sign In / Up »)
→ désactive **Allow new users to sign up** → **Save**.
Seul le PDG crée les comptes, depuis l'application.

## Étape 3 — Variables secrètes dans Vercel

Vercel → projet **nance-business** → **Settings** → **Environment Variables**.
Ajoute ces 4 variables (coche Production, Preview et Development à chaque fois) :

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://vfgmaevqcbqzstqnjqjt.supabase.co` |
| `SUPABASE_SECRET_KEY` | la clé copiée à l'étape 1 |
| `TELEGRAM_CHAT_ID` | `7974240053` |
| `TELEGRAM_TOKEN` | le **nouveau** token (voir ci-dessous) |

**Nouveau token Telegram :** ouvre **@BotFather** dans Telegram → `/mybots` → ton bot
→ **API Token** → **Revoke current token**. Copie le nouveau token et colle-le dans
`TELEGRAM_TOKEN`. C'est le même bot, la même conversation : seule la « clé » change.

## Étape 4 — Envoyer les fichiers sur GitHub

1. Décompresse le ZIP **Nance-Group** sur ton ordinateur.
2. GitHub → dépôt **nance-business** → **Add file** → **Upload files**.
3. Ouvre le dossier décompressé, sélectionne **tout son contenu** (fichiers ET dossiers
   `api`, `assets`, `icons`, `js`, `sql`) et glisse-le dans la page GitHub.
4. En bas : **Commit changes**.

Vercel met le site à jour tout seul (1 à 2 minutes). Le nouvel `index.html` remplace l'ancien.

## Étape 5 — Lancer le script de sécurité (une seule fois)

1. Supabase → **SQL Editor** → **New query**.
2. Ouvre le fichier `sql/01_securite.sql` (bloc-notes), copie **tout**, colle, puis **Run**.
3. En bas, un tableau liste tes comptes : la colonne **connexion_securisee** doit être
   `true` partout.
   > S'il affiche « Migration ANNULÉE », rien n'a été modifié : envoie-moi le message.

## Étape 6 — Tester

1. Ouvre **https://nance-business.vercel.app** (fais Ctrl+F5 sur ordinateur).
2. Connecte-toi avec ton identifiant **pdg** et **ton mot de passe habituel**.
   Tous les comptes gardent leur mot de passe actuel.
3. Vérifie : Telegram (crée une petite dépense de test depuis un compte responsable),
   Administration → **Comptes**, une boutique, le chat.

## Étape 7 — Changer les mots de passe faibles

Dans **Administration → Comptes**, donne un nouveau mot de passe (8 caractères minimum)
à chaque compte qui avait un mot de passe simple (`pass1`, `nance2025`…), puis
transmets-le à la personne concernée. Elle sera déconnectée automatiquement.

---

### Ce qui a changé

- Connexion par **Supabase Auth** : mots de passe chiffrés, plus jamais lisibles.
- Codes PIN chiffrés.
- Base fermée à toute personne non connectée.
- Token Telegram et clé admin cachés sur le serveur (dossier `api`).
- Un responsable ne peut plus modifier son rôle ni sa boutique.
- Nouveau nom **Nance Group**, palette Anthracite & Cuivre, logo, application installable.
- « Mon profil » permet de changer son propre mot de passe.

### Reste à faire (prochaines livraisons)

- Restreindre chaque responsable aux données de **sa** boutique uniquement.
- Rôles **comptable** et **caissier général**.
- Domaine IONOS, puis pages mentions légales / confidentialité.
