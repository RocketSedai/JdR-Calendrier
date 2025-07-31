const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = 'data.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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

// GET - Récupérer toutes les données
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// POST - Sauvegarder les utilisateurs
app.post('/api/users', (req, res) => {
  const { users } = req.body;
  const data = readData();
  data.users = users;
  
  if (writeData(data)) {
    res.json({ success: true, message: 'Utilisateurs sauvegardés' });
  } else {
    res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
  }
});

// POST - Sauvegarder les disponibilités
app.post('/api/availabilities', (req, res) => {
  const { availabilities } = req.body;
  const data = readData();
  data.availabilities = availabilities;
  
  if (writeData(data)) {
    res.json({ success: true, message: 'Disponibilités sauvegardées' });
  } else {
    res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
  }
});

// POST - Sauvegarder toutes les données
app.post('/api/save', (req, res) => {
  const { users, availabilities } = req.body;
  const data = { users, availabilities };
  
  if (writeData(data)) {
    res.json({ success: true, message: 'Données sauvegardées' });
  } else {
    res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
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

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 Interface admin: http://localhost:${PORT}/admin`);
}); 