#!/usr/bin/env node

/**
 * Script pour créer un utilisateur administrateur
 * 
 * Usage:
 *   node src/scripts/create-admin.js
 *   node src/scripts/create-admin.js --name "Admin User" --email "admin@vitalis.com" --password "password123"
 */

require('dotenv').config();
const models = require('../models');
const { User, sequelize } = models;
const readline = require('readline');

// Configuration de readline pour les entrées interactives
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour masquer le mot de passe
function questionPassword(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    stdin.on('data', function(char) {
      char = char + '';
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function createAdmin() {
  try {
    console.log('🔐 Création d\'un utilisateur administrateur\n');

    // Tester la connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // Récupérer les arguments de la ligne de commande
    const args = process.argv.slice(2);
    let name, email, password;

    // Parser les arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--name' && args[i + 1]) {
        name = args[i + 1];
        i++;
      } else if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      } else if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
      }
    }

    // Demander les informations si non fournies
    if (!name) {
      name = await question('Nom complet: ');
      if (!name.trim()) {
        console.error('❌ Le nom est requis');
        rl.close();
        process.exit(1);
      }
    }

    if (!email) {
      email = await question('Email: ');
      if (!email.trim()) {
        console.error('❌ L\'email est requis');
        rl.close();
        process.exit(1);
      }
    }

    if (!password) {
      password = await questionPassword('Mot de passe (min 8 caractères): ');
      if (password.length < 8) {
        console.error('❌ Le mot de passe doit contenir au moins 8 caractères');
        rl.close();
        process.exit(1);
      }
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email: email.trim() } });
    if (existingUser) {
      console.error(`❌ Un utilisateur avec l'email "${email}" existe déjà`);
      rl.close();
      process.exit(1);
    }

    // Créer l'utilisateur admin
    const admin = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: 'admin',
      isActive: true,
      isSuspended: false
    });

    console.log('\n✅ Utilisateur administrateur créé avec succès!');
    console.log('\n📋 Détails:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nom: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Actif: ${admin.isActive ? 'Oui' : 'Non'}`);
    console.log('\n💡 Vous pouvez maintenant vous connecter avec ces identifiants.\n');

    rl.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la création de l\'utilisateur:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    rl.close();
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

// Exécuter le script
createAdmin();
