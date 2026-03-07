#!/usr/bin/env node

/**
 * Ajoute la colonne doctorIsAvailable à la table users (si elle n'existe pas)
 * Alternative si la migration échoue.
 *
 * Usage: node src/scripts/add-doctor-availability-column.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sequelize } = require('../models');

async function addColumn() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'doctorIsAvailable'"
    );
    if (results.length > 0) {
      console.log('Colonne doctorIsAvailable existe déjà.');
    } else {
      await sequelize.query('ALTER TABLE users ADD COLUMN doctorIsAvailable TINYINT(1) DEFAULT 1');
      console.log('Colonne doctorIsAvailable ajoutée.');
    }
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

addColumn();
