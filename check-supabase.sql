-- Script de vérification de l'état de la base de données Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier que les tables existent
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'availabilities')
ORDER BY table_name;

-- 2. Vérifier la structure de la table users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier la structure de la table availabilities
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'availabilities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier les contraintes
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('users', 'availabilities')
ORDER BY tc.table_name, tc.constraint_type;

-- 5. Vérifier les triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('users', 'availabilities')
ORDER BY event_object_table, trigger_name;

-- 6. Vérifier les index
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'availabilities')
ORDER BY tablename, indexname;

-- 7. Vérifier les données existantes
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'availabilities' as table_name, COUNT(*) as row_count FROM availabilities;

-- 8. Afficher quelques exemples de données
SELECT 'users' as table_name, * FROM users LIMIT 5;
SELECT 'availabilities' as table_name, * FROM availabilities LIMIT 5;

-- 9. Vérifier les fonctions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_updated_at_column';

-- 10. Test d'insertion d'un utilisateur (optionnel - à décommenter si nécessaire)
-- INSERT INTO users (email, display_name, role) 
-- VALUES ('test@example.com', 'Test User', 'user')
-- ON CONFLICT (email) DO NOTHING;

-- 11. Vérifier les politiques RLS (si activées)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'availabilities'); 