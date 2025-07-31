# JdR-Calendrier
Site de calendrier pour organiser les JdR.
# 📅 Calendrier JDR avec Backend

Un système de calendrier pour organiser des sessions de jeu de rôle avec sauvegarde persistante des données.

## 🚀 Installation

### 1. Installer Node.js
Assurez-vous d'avoir Node.js installé sur votre machine.

### 2. Installer les dépendances
```bash
npm install
```

### 3. Démarrer le serveur
```bash
npm start
```

Le serveur sera accessible sur `http://localhost:3000`

## 📊 Fonctionnalités

### Pour les utilisateurs :
- ✅ Connexion avec email
- ✅ Création de pseudo
- ✅ Remplissage du calendrier de disponibilités
- ✅ Sauvegarde automatique des données

### Pour les administrateurs :
- ✅ Vue d'ensemble de tous les participants
- ✅ Gestion des droits d'administration
- ✅ Interface de consultation des données

### Interface d'administration :
- 📊 **Interface web** : `http://localhost:3000/admin`
- 📄 **Données JSON** : Sauvegardées dans `data.json`

## 🔧 Utilisation

### 1. Démarrer le système
```bash
npm start
```

### 2. Accéder au calendrier
- Ouvrez `http://localhost:3000` dans votre navigateur
- Créez un compte avec votre email
- Remplissez vos disponibilités

### 3. Consulter les données
- **Interface admin** : `http://localhost:3000/admin`
- **Fichier JSON** : `data.json` (créé automatiquement)

## 📁 Structure des fichiers

```
├── Script_calendrier_Cursor.html  # Interface utilisateur
├── server.js                      # Serveur backend
├── package.json                   # Dépendances
├── data.json                      # Données sauvegardées (créé automatiquement)
└── README.md                      # Ce fichier
```

## 🔒 Sécurité

- Les données sont sauvegardées localement
- Pas de base de données externe requise
- Les données persistent entre les redémarrages

## 🛠️ Développement

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

## 📝 API Endpoints

- `GET /api/data` - Récupérer toutes les données
- `POST /api/users` - Sauvegarder les utilisateurs
- `POST /api/availabilities` - Sauvegarder les disponibilités
- `POST /api/save` - Sauvegarder toutes les données
- `GET /admin` - Interface d'administration 
