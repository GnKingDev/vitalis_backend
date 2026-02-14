#!/usr/bin/env node

/**
 * Script de migration utilisant sequelize.sync({ alter: true })
 * 
 * Ce script synchronise tous les modèles avec la base de données
 * en créant/modifiant les tables selon les définitions des modèles.
 * 
 * Usage:
 *   node src/scripts/migrate-sync.js
 *   npm run migrate:sync
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { sequelize } = models;

async function migrateSync() {
  try {
    console.log('🔄 Migration avec sequelize.sync({ alter: true })\n');

    // Tester la connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // Synchroniser tous les modèles avec la base de données
    console.log('📦 Synchronisation des modèles avec la base de données...');
    console.log('   Cette opération va créer/modifier les tables selon les modèles définis...\n');
    
    await sequelize.sync({ alter: true });
    
    console.log('✅ Migration terminée avec succès!');
    console.log('   Toutes les tables ont été créées/modifiées selon les modèles.\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    console.error('\nStack trace:', error.stack);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

// Exécuter la migration
migrateSync();
