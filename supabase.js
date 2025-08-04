const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies');
  console.error('📋 Guide de configuration :');
  console.error('1. Allez sur https://supabase.com → votre projet');
  console.error('2. Settings → API');
  console.error('3. Copiez "Project URL" dans SUPABASE_URL');
  console.error('4. Copiez "anon public" dans SUPABASE_ANON_KEY');
  console.error('5. Configurez ces variables dans Render Dashboard → Environment');
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
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables d\'environnement manquantes');
      return false;
    }
    
    // Test avec une requête simple
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie');
    console.log('📊 Test de lecture des tables réussi');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    console.error('Stack trace:', error.stack);
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
    const users = (data || []).map(user => ({
      email: user.email,
      displayName: user.display_name, // Conversion du snake_case vers camelCase
      isAdmin: user.is_admin, // Conversion du snake_case vers camelCase
      isSuperAdmin: user.is_superadmin // Conversion du snake_case vers camelCase
    }));
    
    console.log('Utilisateurs récupérés:', users);
    return users;
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    console.log('💾 Sauvegarde sécurisée des utilisateurs:', users);
    
    if (users.length === 0) {
      console.log('Aucun utilisateur à sauvegarder');
      return true;
    }
    
    // Transformer les données pour correspondre au schéma Supabase
    const usersToSave = users.map(user => ({
      email: user.email,
      display_name: user.displayName,
      is_admin: user.isAdmin,
      is_superadmin: user.isSuperAdmin || false
    }));
    
    console.log('📤 Données à sauvegarder:', usersToSave);
    
    // Utiliser UPSERT sécurisé avec ON CONFLICT
    const { data, error } = await supabase
      .from('users')
      .upsert(usersToSave, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de la sauvegarde des utilisateurs:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('✅ Utilisateurs sauvegardés avec succès:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur critique lors de la sauvegarde des utilisateurs:', error);
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
    console.log('💾 Sauvegarde sécurisée des disponibilités:', Object.keys(availabilities));
    
    // Préparer les données pour l'upsert
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
    
    if (availabilityRecords.length === 0) {
      console.log('Aucune disponibilité à sauvegarder');
      return true;
    }
    
    console.log('📤 Données de disponibilités à sauvegarder:', availabilityRecords);
    
    // Utiliser UPSERT sécurisé avec ON CONFLICT
    const { data, error } = await supabase
      .from('availabilities')
      .upsert(availabilityRecords, { 
        onConflict: 'user_email,year,month',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de la sauvegarde des disponibilités:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('✅ Disponibilités sauvegardées avec succès:', data);
    return true;
  } catch (error) {
    console.error('❌ Erreur critique lors de la sauvegarde des disponibilités:', error);
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

// Fonction pour vérifier et attribuer le statut superadmin au premier utilisateur
async function ensureFirstUserIsSuperAdmin(users) {
  try {
    // Vérifier s'il y a déjà un superadmin
    const hasSuperAdmin = users.some(user => user.isSuperAdmin);
    
    if (!hasSuperAdmin && users.length > 0) {
      console.log('🔑 Aucun superadmin trouvé, attribution au premier utilisateur...');
      
      // Trouver le premier utilisateur (par date de création ou premier dans la liste)
      const firstUser = users[0];
      const updatedUsers = users.map(user => 
        user.email === firstUser.email 
          ? { ...user, isSuperAdmin: true, isAdmin: true }
          : user
      );
      
      console.log(`👑 Attribution du statut superadmin à ${firstUser.email}`);
      return updatedUsers;
    }
    
    return users;
  } catch (error) {
    console.error('Erreur lors de la vérification du superadmin:', error);
    return users;
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
  saveAllData,
  ensureFirstUserIsSuperAdmin
}; 