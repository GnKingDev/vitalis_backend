#!/usr/bin/env node

/**
 * Script pour afficher le(s) compte(s) administrateur
 *
 * Usage (depuis le dossier backend/) :
 *   node src/scripts/show-admin.js
 *
 * Ou depuis la racine du projet :
 *   node backend/src/scripts/show-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { User, sequelize } = models;

async function showAdmin() {
  try {
    console.log('🔐 Comptes administrateur\n');

    await sequelize.authenticate();

    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'isSuspended', 'lastLogin', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    if (admins.length === 0) {
      console.log('Aucun compte admin trouvé.');
      console.log('Créez-en un avec: node src/scripts/create-admin.js\n');
      await sequelize.close();
      process.exit(0);
      return;
    }

    console.log(`Nombre de compte(s) admin: ${admins.length}\n`);

    admins.forEach((admin, index) => {
      console.log(`--- Admin #${index + 1} ---`);
      console.log(`   ID:          ${admin.id}`);
      console.log(`   Nom:         ${admin.name}`);
      console.log(`   Email:       ${admin.email}`);
      console.log(`   Rôle:        ${admin.role}`);
      console.log(`   Actif:       ${admin.isActive ? 'Oui' : 'Non'}`);
      console.log(`   Suspendu:    ${admin.isSuspended ? 'Oui' : 'Non'}`);
      console.log(`   Dernière connexion: ${admin.lastLogin ? admin.lastLogin.toISOString() : '-'}`);
      console.log(`   Créé le:     ${admin.createdAt.toISOString()}`);
      console.log('');
    });

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

showAdmin();
