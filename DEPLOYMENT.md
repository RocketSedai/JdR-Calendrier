# Guide de déploiement sur Render

## Étapes pour déployer sur Render

### 1. Préparer le projet
- Assurez-vous que tous les fichiers sont commités dans Git
- Vérifiez que le fichier `package.json` contient les bonnes dépendances
- Vérifiez que `server.js` utilise `process.env.PORT`

### 2. Créer un compte Render
1. Allez sur [render.com](https://render.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New +" puis "Web Service"

### 3. Connecter votre repository
1. Connectez votre compte GitHub/GitLab
2. Sélectionnez votre repository `site_calendrier`
3. Render détectera automatiquement que c'est une application Node.js

### 4. Configurer le déploiement
- **Name**: `calendrier-jdr` (ou le nom de votre choix)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 5. Variables d'environnement (optionnel)
Si nécessaire, ajoutez des variables d'environnement dans l'onglet "Environment" :
- `NODE_ENV`: `production`

### 6. Déployer
1. Cliquez sur "Create Web Service"
2. Render va automatiquement construire et déployer votre application
3. Vous recevrez une URL du type : `https://votre-app.onrender.com`

### 7. Vérifier le déploiement
- Votre site sera accessible à l'URL fournie par Render
- L'interface admin sera disponible à `/admin`
- Les données seront sauvegardées dans le système de fichiers de Render

## Notes importantes
- Le plan gratuit de Render peut mettre l'application en veille après 15 minutes d'inactivité
- Les données sont sauvegardées localement sur le serveur Render
- Pour un usage en production, considérez utiliser une base de données externe 