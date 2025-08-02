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
    
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
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
      const { error: insertError } = await supabase
        .from('users')
        .insert(users);
      
      if (insertError) {
        console.error('Erreur lors de l\'insertion des utilisateurs:', insertError);
        return false;
      }
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
  getUsers,
  saveUsers,
  getAvailabilities,
  saveAvailabilities,
  getAllData,
  saveAllData
}; 