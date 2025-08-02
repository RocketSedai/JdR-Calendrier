const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = 'data.json';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://jdr-calendrier.onrender.com', 'https://*.onrender.com']
    : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('.', {
  maxAge: NODE_ENV === 'production' ? '1h' : 0
}));

// Fonction pour lire les données
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erreur lors de la lecture des données:', error);
  }
  return { users: [], availabilities: {} };
}

// Fonction pour écrire les données
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'écriture des données:', error);
    return false;
  }
}

// Routes API

// Health check pour Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// GET - Récupérer toutes les données
app.get('/api/data', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (error) {
    console.error('Erreur API /api/data:', error);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

// POST - Sauvegarder les utilisateurs
app.post('/api/users', (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Données utilisateurs invalides' });
    }
    
    const data = readData();
    data.users = users;
    
    if (writeData(data)) {
      res.json({ success: true, message: 'Utilisateurs sauvegardés' });
    } else {
      res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
    }
  } catch (error) {
    console.error('Erreur API /api/users:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});

// POST - Sauvegarder les disponibilités
app.post('/api/availabilities', (req, res) => {
  try {
    const { availabilities } = req.body;
    if (!availabilities || typeof availabilities !== 'object') {
      return res.status(400).json({ success: false, message: 'Données de disponibilités invalides' });
    }
    
    const data = readData();
    data.availabilities = availabilities;
    
    if (writeData(data)) {
      res.json({ success: true, message: 'Disponibilités sauvegardées' });
    } else {
      res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
    }
  } catch (error) {
    console.error('Erreur API /api/availabilities:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});

// POST - Sauvegarder toutes les données
app.post('/api/save', (req, res) => {
  try {
    const { users, availabilities } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Données utilisateurs invalides' });
    }
    if (!availabilities || typeof availabilities !== 'object') {
      return res.status(400).json({ success: false, message: 'Données de disponibilités invalides' });
    }
    
    const data = { users, availabilities };
    
    if (writeData(data)) {
      res.json({ success: true, message: 'Données sauvegardées' });
    } else {
      res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
    }
  } catch (error) {
    console.error('Erreur API /api/save:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});

// GET - Afficher les données dans le navigateur
app.get('/admin', (req, res) => {
  const data = readData();
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Admin - Données Calendrier JDR</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
        .user { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 3px; }
        .availability { margin: 5px 0; padding: 5px; background: #e8f4f8; border-radius: 3px; }
        .admin { color: #d63031; font-weight: bold; }
        .status-available { color: #00b894; }
        .status-maybe { color: #fdcb6e; }
        .status-unavailable { color: #e17055; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>📊 Données Calendrier JDR</h1>
      
      <div class="section">
        <h2>👥 Utilisateurs (${data.users.length})</h2>
        ${data.users.map(user => `
          <div class="user">
            <strong>${user.displayName}</strong> 
            <span class="admin">${user.isAdmin ? '👑 Admin' : ''}</span><br>
            <small>${user.email}</small>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>📅 Disponibilités</h2>
        ${Object.entries(data.availabilities).map(([key, avail]) => {
          const [email, year, month] = key.split('_');
          const user = data.users.find(u => u.email === email);
          const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
          return `
            <div class="availability">
              <strong>${user ? user.displayName : email}</strong> - ${monthNames[parseInt(month)]} ${year}<br>
              <small>${Object.entries(avail).map(([day, status]) => {
                const statusClass = status === 'available' ? 'status-available' : 
                                  status === 'maybe' ? 'status-maybe' : 'status-unavailable';
                const emoji = status === 'available' ? '✅' : status === 'maybe' ? '❓' : '❌';
                return `<span class="${statusClass}">${emoji} ${day}</span>`;
              }).join(' ')}</small>
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="section">
        <h2>📄 Données brutes (JSON)</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// Gestion d'erreur globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    message: NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Route 404 pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${NODE_ENV}`);
  console.log(`📊 Interface admin: http://localhost:${PORT}/admin`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
}); 
