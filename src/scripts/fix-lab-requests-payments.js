require('dotenv').config();
const { LabRequest, Payment, sequelize } = require('../models');

/**
 * Script pour ajouter des paiements aux demandes de laboratoire qui n'en ont pas
 */
async function fixLabRequestsPayments() {
  try {
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.\n');
    
    console.log('🔍 Recherche des demandes de laboratoire sans paiement...\n');
    
    // Trouver toutes les demandes sans paiement
    const requestsWithoutPayment = await LabRequest.findAll({
      where: {
        paymentId: null
      },
      include: []
    });
    
    console.log(`📊 Demandes trouvées sans paiement: ${requestsWithoutPayment.length}\n`);
    
    if (requestsWithoutPayment.length === 0) {
      console.log('✅ Toutes les demandes ont déjà un paiement associé!');
      await sequelize.close();
      return;
    }
    
    let created = 0;
    let errors = 0;
    
    for (const request of requestsWithoutPayment) {
      try {
        console.log(`\n📝 Traitement de la demande ${request.id}...`);
        console.log(`   Patient: ${request.patientId}`);
        console.log(`   Montant: ${request.totalAmount} GNF`);
        console.log(`   Statut: ${request.status}`);
        
        // Créer un paiement en attente pour cette demande
        const payment = await Payment.create({
          patientId: request.patientId,
          amount: request.totalAmount,
          method: 'cash', // Par défaut
          status: 'pending', // En attente de paiement
          type: 'lab',
          reference: `LAB-${Date.now()}-${request.id.substring(0, 8)}`,
          relatedId: request.id,
          createdBy: request.doctorId // Le médecin qui a créé la demande
        });
        
        // Lier le paiement à la demande
        await request.update({ paymentId: payment.id });
        
        console.log(`   ✅ Paiement créé: ${payment.id} (${payment.status})`);
        created++;
      } catch (error) {
        console.error(`   ❌ Erreur pour la demande ${request.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Résumé:');
    console.log(`   ✅ Paiements créés: ${created}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Script terminé avec succès!');
    
    // Fermer la connexion
    await sequelize.close();
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    await sequelize.close();
    throw error;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  fixLabRequestsPayments()
    .then(() => {
      console.log('\n👋 Fin du script');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { fixLabRequestsPayments };
