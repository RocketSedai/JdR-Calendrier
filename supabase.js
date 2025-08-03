const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies');
  process.exit(1);
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction de test de connexion
async function testConnection() {
  try {
    console.log('🔍 Test de connexion Supabase...');
    console.log('URL:', supabaseUrl);
    console.log('Clé (premiers caractères):', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Non définie');
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    return false;
  }
}

// Fonctions pour gérer les utilisateurs
async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
    
    // Transformer les données de Supabase vers le format de l'application
    const users = (data || []).map(user => {
      console.log('🔍 Données utilisateur brutes:', user);
      
      // Migration automatique : gérer l'ancien et le nouveau système
      let role = 'user';
      
      if (user.role) {
        // Nouveau système avec colonne role
        role = user.role;
      } else if (user.is_admin !== undefined) {
        // Ancien système avec is_admin
        role = user.is_admin ? 'admin' : 'user';
      }
      
      const userConverted = {
        email: user.email,
        displayName: user.display_name,
        role: role
      };
      
      console.log('👤 Utilisateur converti:', userConverted);
      return userConverted;
    });
    
    console.log('👥 Utilisateurs récupérés:', users);
    
    // Si aucun Super Admin n'existe, promouvoir le premier admin
    const superAdmins = users.filter(u => u.role === 'superadmin');
    const admins = users.filter(u => u.role === 'admin');
    
    if (superAdmins.length === 0 && admins.length > 0) {
      users[users.findIndex(u => u.role === 'admin')].role = 'superadmin';
      console.log('🌟 Promotion automatique du premier admin en Super Admin');
    }
    
    return users;
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    console.log('Sauvegarde des utilisateurs:', users);
    
    // Supprimer tous les utilisateurs existants
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', 0); // Supprime tous les enregistrements
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des utilisateurs:', deleteError);
      return false;
    }
    
    // Insérer les nouveaux utilisateurs
    if (users.length > 0) {
      // Transformer les données pour correspondre au schéma Supabase
      const usersToInsert = users.map(user => {
        const userToInsert = {
          email: user.email,
          display_name: user.displayName
        };
        
        // Essayer d'abord avec la colonne role (nouveau système)
        // Si ça échoue, utiliser is_admin (ancien système)
        userToInsert.role = user.role || 'user';
        userToInsert.is_admin = user.role === 'admin' || user.role === 'superadmin';
        
        console.log('💾 Données à sauvegarder:', userToInsert);
        return userToInsert;
      });
      
      console.log('Données à insérer:', usersToInsert);
      
      const { data, error: insertError } = await supabase
        .from('users')
        .insert(usersToInsert)
        .select();
      
      if (insertError) {
        console.error('Erreur lors de l\'insertion des utilisateurs:', insertError);
        return false;
      }
      
      console.log('Utilisateurs insérés avec succès:', data);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des utilisateurs:', error);
    return false;
  }
}

// Fonctions pour gérer les disponibilités
async function getAvailabilities() {
  try {
    const { data, error } = await supabase
      .from('availabilities')
      .select('*');
    
    if (error) {
      console.error('Erreur lors de la récupération des disponibilités:', error);
      return {};
    }
    
    // Convertir les données en format attendu par l'application
    const availabilities = {};
    data.forEach(item => {
      const key = `${item.user_email}_${item.year}_${item.month}`;
      availabilities[key] = item.availability_data;
    });
    
    return availabilities;
  } catch (error) {
    console.error('Erreur lors de la récupération des disponibilités:', error);
    return {};
  }
}

async function saveAvailabilities(availabilities) {
  try {
    // Supprimer toutes les disponibilités existantes
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des disponibilités:', deleteError);
      return false;
    }
    
    // Préparer les données pour l'insertion
    const availabilityRecords = [];
    Object.entries(availabilities).forEach(([key, availabilityData]) => {
      const [userEmail, year, month] = key.split('_');
      availabilityRecords.push({
        user_email: userEmail,
        year: parseInt(year),
        month: parseInt(month),
        availability_data: availabilityData
      });
    });
    
    // Insérer les nouvelles disponibilités
    if (availabilityRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('availabilities')
        .insert(availabilityRecords);
      
      if (insertError) {
        console.error('Erreur lors de l\'insertion des disponibilités:', insertError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des disponibilités:', error);
    return false;
  }
}

// Fonction pour récupérer toutes les données
async function getAllData() {
  try {
    const [users, availabilities] = await Promise.all([
      getUsers(),
      getAvailabilities()
    ]);
    
    return {
      users,
      availabilities
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    return {
      users: [],
      availabilities: {}
    };
  }
}

// Fonction pour sauvegarder toutes les données
async function saveAllData(users, availabilities) {
  try {
    const [usersResult, availabilitiesResult] = await Promise.all([
      saveUsers(users),
      saveAvailabilities(availabilities)
    ]);
    
    return usersResult && availabilitiesResult;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données:', error);
    return false;
  }
}

module.exports = {
  supabase,
  testConnection,
  getUsers,
  saveUsers,
  getAvailabilities,
  saveAvailabilities,
  getAllData,
  saveAllData
}; 