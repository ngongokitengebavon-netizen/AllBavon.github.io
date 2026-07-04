# AllBavon Web — Guide complet

## ✅ Fonctionnalités ajoutées

Votre site contient maintenant :

1. **Deux interfaces sécurisées**
   - Admin : code `ba167144`
   - Utilisateur : code `2661960`

2. **Forum de discussion** 💬
   - Créer des sujets par catégorie
   - Répondre aux sujets
   - Filtrer par catégorie

3. **Espace cours** 📚
   - Télécharger des cours (PDF, Word, PowerPoint, etc.)
   - Rechercher des cours
   - Télécharger les fichiers partagés

4. **Formspree** pour les emails automatiques 📧
   - Envoi automatique des demandes d'accès

5. **Firebase** pour les comptes en ligne 🔥
   - Authentification par email/mot de passe
   - Base de données Firestore (forum, cours, utilisateurs)

6. **Supabase** pour le stockage des fichiers de cours 📦
   - Upload et téléchargement des PDF, Word, PowerPoint, etc.
   - Gratuit et sans carte bancaire

## ✅ Configuration déjà faite

Le fichier `firebase-config.js` a été rempli avec vos clés :

- **Firebase** : projet `allbavon-web` configuré
- **Formspree** : formulaire `https://formspree.io/f/mqevwwbv` configuré
- **Supabase** : projet `matdayziakeclbajmsme` configuré pour le stockage de fichiers

Vous devez maintenant **activer les services** dans la console Firebase (Authentication + Firestore) et mettre le site en ligne.

> Le site fonctionne aussi en **mode démo local** sans Firebase/Supabase, mais les données restent dans le navigateur de chaque utilisateur (pas de synchronisation en ligne).

---

## 📝 Étape 1 : Configurer Formspree (envoi automatique d'emails)

1. Allez sur [https://formspree.io](https://formspree.io)
2. Créez un compte gratuit
3. Créez un nouveau formulaire
4. Copiez l'URL de votre formulaire (exemple : `https://formspree.io/f/xnqkvnpe`)
5. Ouvrez le fichier `firebase-config.js`
6. Remplacez :
   ```javascript
   const FORMSPREE_ENDPOINT = "https://formspree.io/f/VOTRE_FORM_ID_ICI";
   ```
   par votre vraie URL.

---

## 🔥 Étape 2 : Configurer Firebase (comptes en ligne + base de données)

### 2.1 Créer un projet Firebase

1. Allez sur [https://console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez sur **Ajouter un projet**
3. Nommez-le : `allbavon-web`
4. Désactivez Google Analytics si vous ne voulez pas l'utiliser
5. Cliquez sur **Créer un projet**

### 2.2 Créer une application Web

1. Dans le projet, cliquez sur l'icône Web `</>`
2. Donnez un nom à l'application (ex: `allbavon-site-web`)
3. Cliquez sur **Enregistrer l'application**
4. Copiez la configuration Firebase qui s'affiche

Elle ressemble à ça :
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "allbavon-web.firebaseapp.com",
  projectId: "allbavon-web",
  storageBucket: "allbavon-web.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

5. Ouvrez `firebase-config.js` et remplacez les valeurs par les vôtres.

### 2.3 Activer Authentication

1. Dans le menu de gauche, cliquez sur **Authentication**
2. Cliquez sur **Commencer**
3. Activez **Email/Mot de passe**
4. Cliquez sur **Enregistrer**

### 2.4 Activer Cloud Firestore

1. Dans le menu de gauche, cliquez sur **Firestore Database**
2. Cliquez sur **Créer une base de données**
3. Choisissez **Mode production** (ou test pour commencer)
4. Sélectionnez une région proche de vous (ex: `europe-west`)
5. Cliquez sur **Activer**

### 2.5 Vérifier les règles de sécurité Firestore

Pour commencer, vous pouvez utiliser cette règle simple (à renforcer plus tard) :

**Firestore Database > Règles :**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Attention :** Cette règle permet à tout utilisateur connecté de lire et écrire. À modifier quand le site sera prêt pour la production.

> **Note :** Le stockage de fichiers ne se fait pas sur Firebase mais sur **Supabase** (configuration déjà intégrée).

---

## 🌐 Étape 3 : Mettre le site en ligne

### Option recommandée : Netlify

1. Créez un compte sur [https://www.netlify.com](https://www.netlify.com)
2. Glissez-déposez le dossier de votre site sur la page principale de Netlify
3. Votre site est en ligne en quelques secondes
4. Vous obtiendrez une adresse comme `https://allbavon-123.netlify.app`

### GitHub Pages

1. Créez un compte sur [https://github.com](https://github.com)
2. Créez un repository `allbavon-website`
3. Téléversez tous les fichiers
4. Activez GitHub Pages dans les paramètres

### Vercel

1. Créez un compte sur [https://vercel.com](https://vercel.com)
2. Importez votre projet GitHub ou téléchargez-le
3. Le déploiement est automatique

---

## 🔐 Codes d'accès

| Rôle | Code |
|------|------|
| Administrateur | `ba167144` |
| Utilisateur | `2661960` |

---

## 📊 Données visibles / cachées

| Donnée | Admin | Utilisateur |
|--------|-------|-------------|
| Email admin | ✅ Oui | ❌ Non |
| Nombre d'utilisateurs | ✅ Oui | ❌ Non |
| Nombre de sujets | ✅ Oui | ❌ Non |
| Nombre de cours | ✅ Oui | ❌ Non |
| Nombre de facultés | ✅ Oui | ❌ Non |
| Forum | ✅ Oui | ✅ Oui |
| Espace cours | ✅ Oui | ✅ Oui |
| Création de compte | ✅ Oui | ✅ Oui |

---

## ⚠️ Limites à connaître

1. **Sans Firebase configuré**, les comptes, forum et cours fonctionnent en **mode local** : chaque personne voit seulement ses propres données sur son navigateur.
2. **L'email admin est dans le code JavaScript** : un utilisateur technique pourrait le trouver. Pour une vraie sécurité, il faut un backend serveur.
3. **Les fichiers de cours** sont stockés sur **Supabase** (configuration déjà intégrée).
4. **Avec Firebase + Supabase**, les données et les fichiers sont synchronisés en ligne pour tous les utilisateurs.

---

## 📁 Structure du dossier

```
/home/user/
├── index.html              # Structure du site (2 interfaces + forum + cours)
├── styles.css              # Design premium + styles forum + cours + admin
├── script.js               # Logique Firebase, Formspree, forum, cours, admin
├── firebase-config.js      # Configuration Firebase et Formspree (À MODIFIER)
├── README.md               # Ce guide
└── assets/                 # Images du site
    ├── globe.png
    ├── ask-question.png
    ├── learn.png
    ├── online-courses.png
    ├── exam-prep.png
    ├── innovation-news.png
    ├── help.png
    └── hero-students.png
```

---

## 🚀 Prochaines étapes possibles

- Connecter un nom de domaine personnalisé
- Ajouter des notifications email pour les nouveaux sujets/cours
- Ajouter un système de likes/votes sur les cours et réponses
- Ajouter un chat en direct
- Créer une application mobile

Vous pouvez maintenant configurer Firebase et Formspree, puis mettre le site en ligne ! 🎉
