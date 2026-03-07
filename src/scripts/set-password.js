#!/usr/bin/env node

/**
 * Script pour définir le mot de passe d'un utilisateur par email
 * 
 * Usage:
 *   node src/scripts/set-password.js --email "rsagno@gmail.com" --password "1234"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function setPassword() {
  const args = process.argv.slice(2);
  let email, password;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    }
  }

  if (!email || !password) {
    console.error('Usage: node src/scripts/set-password.js --email "rsagno@gmail.com" --password "1234"');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const hashedPassword = await bcrypt.hash(password, 10);

    const [rowsAffected] = await sequelize.query(
      'UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)',
      { replacements: [hashedPassword, email.trim()] }
    );

    if (rowsAffected > 0) {
      console.log(`Mot de passe mis à jour pour ${email}`);
    } else {
      console.error(`Aucun utilisateur trouvé avec l'email: ${email}`);
      process.exit(1);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

setPassword();
