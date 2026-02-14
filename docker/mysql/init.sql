-- Script d'initialisation de la base de données
-- Ce script s'exécute automatiquement lors de la première création du conteneur

-- S'assurer que la base de données utilise utf8mb4
ALTER DATABASE vitalis_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Optionnel: Créer des utilisateurs supplémentaires si nécessaire
-- CREATE USER IF NOT EXISTS 'vitalis_app'@'%' IDENTIFIED BY 'app_password';
-- GRANT ALL PRIVILEGES ON vitalis_clinic.* TO 'vitalis_app'@'%';
-- FLUSH PRIVILEGES;
