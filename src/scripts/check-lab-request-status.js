#!/usr/bin/env node

/**
 * Script pour vérifier le statut réel des demandes de laboratoire
 * 
 * Usage:
 *   node src/scripts/check-lab-request-status.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { LabRequest, Payment } = models;

async function checkLabRequestStatus() {
  try {
    console.log('🔍 Vérification du statut des demandes de laboratoire\n');

    // Tester la connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await models.sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // Récupérer toutes les demandes avec leurs paiements
    const requests = await LabRequest.findAll({
      include: [{
        model: Payment,
        as: 'payment',
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Total de demandes trouvées: ${requests.length}\n`);

    if (requests.length === 0) {
      console.log('⚠️ Aucune demande trouvée dans la base de données');
      await models.sequelize.close();
      process.exit(0);
    }

    // Afficher le détail de chaque demande
    requests.forEach((request, index) => {
      console.log(`\n📋 Demande #${index + 1}:`);
      console.log(`   ID: ${request.id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   PaymentId: ${request.paymentId || 'NULL'}`);
      console.log(`   CreatedAt: ${request.createdAt}`);
      console.log(`   UpdatedAt: ${request.updatedAt}`);
      
      if (request.payment) {
        console.log(`   Payment Status: ${request.payment.status}`);
        console.log(`   Payment Amount: ${request.payment.amount}`);
        console.log(`   Payment Method: ${request.payment.method}`);
      } else {
        console.log(`   Payment: Aucun paiement associé`);
      }

      // Vérifier si la demande devrait être visible pour le lab
      const shouldBeVisible = 
        request.status === 'pending' && 
        request.paymentId !== null && 
        request.payment && 
        request.payment.status === 'paid';
      
      console.log(`   ✅ Visible pour lab: ${shouldBeVisible ? 'OUI' : 'NON'}`);
      
      if (!shouldBeVisible) {
        console.log(`   ⚠️  Raison:`);
        if (request.status !== 'pending') {
          console.log(`      - Statut n'est pas "pending" (actuel: ${request.status})`);
        }
        if (request.paymentId === null) {
          console.log(`      - Pas de paymentId`);
        }
        if (!request.payment) {
          console.log(`      - Paiement n'existe pas dans la base`);
        }
        if (request.payment && request.payment.status !== 'paid') {
          console.log(`      - Paiement n'est pas "paid" (actuel: ${request.payment.status})`);
        }
      }
    });

    // Statistiques
    console.log('\n\n📊 STATISTIQUES:');
    const total = requests.length;
    const withPayment = requests.filter(r => r.paymentId !== null).length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const paid = requests.filter(r => r.payment && r.payment.status === 'paid').length;
    const pendingAndPaid = requests.filter(r => 
      r.status === 'pending' && 
      r.paymentId !== null && 
      r.payment && 
      r.payment.status === 'paid'
    ).length;

    console.log(`   Total: ${total}`);
    console.log(`   Avec paymentId: ${withPayment}`);
    console.log(`   Status "pending": ${pending}`);
    console.log(`   Paiement "paid": ${paid}`);
    console.log(`   Pending + Paid (visible pour lab): ${pendingAndPaid}`);

    await models.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\nStack trace:', error.stack);
    await models.sequelize.close().catch(() => {});
    process.exit(1);
  }
}

// Exécuter le script
checkLabRequestStatus();
