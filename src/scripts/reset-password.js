#!/usr/bin/env node

/**
 * Script pour réinitialiser le mot de passe d'un utilisateur à "12345678"
 * et forcer le changement de mot de passe à la prochaine connexion.
 *
 * Usage:
 *   node src/scripts/reset-password.js --email "user@example.com"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function resetPassword() {
  const args = process.argv.slice(2);
  let email;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    }
  }

  if (!email) {
    console.error('Usage: node src/scripts/reset-password.js --email "user@example.com"');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const hashedPassword = await bcrypt.hash('12345678', 10);

    const [result] = await sequelize.query(
      'UPDATE users SET password = ?, lastLogin = NULL WHERE LOWER(email) = LOWER(?)',
      { replacements: [hashedPassword, email.trim()] }
    );

    const affected = result?.affectedRows ?? result;
    if (affected > 0) {
      console.log(`✓ Mot de passe réinitialisé pour : ${email}`);
      console.log(`✓ Nouveau mot de passe : 12345678`);
      console.log(`✓ L'utilisateur devra changer son mot de passe à la prochaine connexion.`);
    } else {
      console.error(`✗ Aucun utilisateur trouvé avec l'email : ${email}`);
      process.exit(1);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

resetPassword();
