require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { getAllData, saveUsers, saveAvailabilities, saveAllData, testConnection, ensureFirstUserIsSuperAdmin, supabase } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;
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

// Fonction pour lire les données depuis Supabase
async function readData() {
  try {
    console.log('📖 Lecture des données depuis Supabase...');
    const data = await getAllData();
    console.log('📊 Données récupérées - Utilisateurs:', data.users.length);
    
    // S'assurer qu'il y a un superadmin (le premier utilisateur)
    if (data.users && data.users.length > 0) {
      console.log('🔍 Vérification du statut SuperAdmin...');
      const usersWithSuperAdmin = await ensureFirstUserIsSuperAdmin(data.users);
      
      // Comparer les objets pour voir s'il y a eu des changements
      const hasChanged = JSON.stringify(usersWithSuperAdmin) !== JSON.stringify(data.users);
      
      if (hasChanged) {
        // Si des modifications ont été apportées, sauvegarder
        console.log('🔄 Mise à jour du statut superadmin détectée...');
        const saveResult = await saveUsers(usersWithSuperAdmin);
        console.log('💾 Résultat sauvegarde SuperAdmin:', saveResult);
        data.users = usersWithSuperAdmin;
      } else {
        console.log('✅ Aucune modification SuperAdmin nécessaire');
      }
    } else {
      console.log('👤 Aucun utilisateur trouvé');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des données:', error);
    return { users: [], availabilities: {} };
  }
}

// Fonction pour écrire les données vers Supabase
async function writeData(data) {
  try {
    const result = await saveAllData(data.users, data.availabilities);
    return result;
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

// Test de connexion Supabase
app.get('/test-supabase', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ 
        status: 'OK', 
        message: 'Connexion Supabase réussie',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        status: 'ERROR', 
        message: 'Erreur de connexion Supabase',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Erreur lors du test Supabase',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route de débogage pour forcer l'attribution SuperAdmin
app.get('/debug-superadmin', async (req, res) => {
  try {
    console.log('🔍 Débogage SuperAdmin - Début');
    const data = await getAllData();
    console.log('📊 Utilisateurs actuels:', data.users);
    
    if (data.users.length === 0) {
      return res.json({
        status: 'INFO',
        message: 'Aucun utilisateur trouvé',
        users: data.users
      });
    }
    
    // Vérifier s'il y a déjà un superadmin
    const hasSuperAdmin = data.users.some(user => user.isSuperAdmin);
    console.log('👑 SuperAdmin existant:', hasSuperAdmin);
    
    if (!hasSuperAdmin) {
      console.log('🔧 Attribution du SuperAdmin au premier utilisateur...');
      const updatedUsers = await ensureFirstUserIsSuperAdmin(data.users);
      console.log('✨ Utilisateurs après modification:', updatedUsers);
      
      const saveResult = await saveUsers(updatedUsers);
      console.log('💾 Résultat sauvegarde:', saveResult);
      
      res.json({
        status: 'SUCCESS',
        message: 'SuperAdmin attribué',
        before: data.users,
        after: updatedUsers,
        saveResult: saveResult
      });
    } else {
      res.json({
        status: 'INFO',
        message: 'SuperAdmin déjà présent',
        users: data.users
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors du débogage SuperAdmin:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du débogage',
      error: error.message
    });
  }
});

// GET - Récupérer toutes les données
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    console.error('Erreur API /api/data:', error);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

// Route de diagnostic pour voir les données brutes
app.get('/debug-users', async (req, res) => {
  try {
    console.log('🔍 Récupération des données utilisateurs brutes...');
    
    // Récupérer directement depuis Supabase sans traitement
    const { data: rawUsers, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Récupérer aussi via getAllData pour comparaison
    const processedData = await getAllData();
    
    res.json({
      status: 'SUCCESS',
      rawUsers: rawUsers,
      processedUsers: processedData.users,
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: rawUsers.length,
        superAdmins: rawUsers.filter(u => u.is_superadmin).length,
        admins: rawUsers.filter(u => u.is_admin).length,
        processedSuperAdmins: processedData.users.filter(u => u.isSuperAdmin).length,
        processedAdmins: processedData.users.filter(u => u.isAdmin).length
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic utilisateurs:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur lors du diagnostic',
      error: error.message
    });
  }
});

// POST - Sauvegarder les utilisateurs
app.post('/api/users', async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Données utilisateurs invalides' });
    }
    
    const result = await saveUsers(users);
    if (result) {
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
app.post('/api/availabilities', async (req, res) => {
  try {
    const { availabilities } = req.body;
    if (!availabilities || typeof availabilities !== 'object') {
      return res.status(400).json({ success: false, message: 'Données de disponibilités invalides' });
    }
    
    const result = await saveAvailabilities(availabilities);
    if (result) {
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
app.post('/api/save', async (req, res) => {
  try {
    const { users, availabilities } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ success: false, message: 'Données utilisateurs invalides' });
    }
    if (!availabilities || typeof availabilities !== 'object') {
      return res.status(400).json({ success: false, message: 'Données de disponibilités invalides' });
    }
    
    const result = await saveAllData(users, availabilities);
    if (result) {
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
app.get('/admin', async (req, res) => {
  const data = await readData();
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
        .calendar-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
          gap: 8px; 
          margin-top: 10px; 
          max-width: 100%; 
        }
        .day-item { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 5px; 
          border-radius: 4px; 
          background: #f8f9fa; 
          border: 1px solid #e9ecef; 
          min-height: 50px;
          justify-content: center;
        }
        .day-letter { 
          font-size: 0.7rem; 
          font-weight: bold; 
          color: #6c757d; 
          margin-bottom: 2px; 
        }
        .day-number { 
          font-size: 0.9rem; 
          font-weight: bold; 
          margin-bottom: 2px; 
        }
        .day-status { 
          font-size: 0.8rem; 
        }
      </style>
    </head>
    <body>
      <h1>📊 Données Calendrier JDR</h1>
      
      <div class="section">
        <h2>👥 Utilisateurs (${data.users.length})</h2>
        ${data.users.map(user => `
          <div class="user">
            <strong>${user.displayName}</strong> 
            <span class="admin">${user.isSuperAdmin ? '🔱 Super Admin' : user.isAdmin ? '👑 Admin' : ''}</span><br>
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
          const dayNames = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"];
          
          // Fonction pour obtenir le jour de la semaine
          function getDayOfWeek(year, month, day) {
            const date = new Date(parseInt(year), parseInt(month), parseInt(day));
            return dayNames[date.getDay()];
          }
          
          return `
            <div class="availability">
              <strong>${user ? user.displayName : email}</strong> - ${monthNames[parseInt(month)]} ${year}
              <div class="calendar-grid">
                ${Object.entries(avail).map(([day, status]) => {
                  const statusClass = status === 'available' ? 'status-available' : 
                                    status === 'maybe' ? 'status-maybe' : 'status-unavailable';
                  const emoji = status === 'available' ? '✅' : status === 'maybe' ? '❓' : '❌';
                  const dayOfWeek = getDayOfWeek(year, month, day);
                  
                  return `
                    <div class="day-item">
                      <div class="day-letter">${dayOfWeek}</div>
                      <div class="day-number">${day}</div>
                      <div class="day-status ${statusClass}">${emoji}</div>
                    </div>
                  `;
                }).join('')}
              </div>
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
const server = app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${NODE_ENV}`);
  console.log(`📊 Interface admin: http://localhost:${PORT}/admin`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  
  // Test de connexion Supabase
  await testConnection();
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