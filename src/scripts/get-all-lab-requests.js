require('dotenv').config();
const { LabRequest, LabRequestExam, LabExam, Patient, User, LabResult, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Script pour récupérer toutes les demandes de laboratoire avec leurs détails
 */
async function getAllLabRequests() {
  try {
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.\n');
    
    console.log('🔍 Récupération de toutes les demandes de laboratoire...\n');
    
    // Récupérer toutes les demandes
    const requests = await LabRequest.findAll({
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'phone', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: LabRequestExam,
          as: 'exams',
          include: [{
            model: LabExam,
            as: 'labExam',
            attributes: ['id', 'name', 'category', 'price']
          }]
        },
        {
          model: LabResult,
          as: 'results',
          attributes: ['id', 'status', 'completedAt', 'sentAt'],
          required: false
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'status', 'method'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Total de demandes trouvées: ${requests.length}\n`);
    
    // Statistiques par statut
    const statsByStatus = {};
    const statsByPayment = {
      withPayment: 0,
      withoutPayment: 0,
      paid: 0,
      pending: 0
    };
    
    requests.forEach(request => {
      // Stats par statut
      statsByStatus[request.status] = (statsByStatus[request.status] || 0) + 1;
      
      // Stats par paiement
      if (request.payment) {
        statsByPayment.withPayment++;
        if (request.payment.status === 'paid') {
          statsByPayment.paid++;
        } else if (request.payment.status === 'pending') {
          statsByPayment.pending++;
        }
      } else {
        statsByPayment.withoutPayment++;
      }
    });
    
    console.log('📈 Statistiques par statut:');
    console.log(JSON.stringify(statsByStatus, null, 2));
    console.log('\n💰 Statistiques par paiement:');
    console.log(JSON.stringify(statsByPayment, null, 2));
    console.log('\n');
    
    // Afficher les détails de chaque demande
    console.log('📋 Détails des demandes:\n');
    console.log('='.repeat(100));
    
    requests.forEach((request, index) => {
      console.log(`\n${index + 1}. Demande ID: ${request.id}`);
      console.log(`   Statut: ${request.status}`);
      console.log(`   Patient: ${request.patient ? `${request.patient.firstName} ${request.patient.lastName} (${request.patient.vitalisId})` : 'N/A'}`);
      console.log(`   Médecin: ${request.doctor ? request.doctor.name : 'N/A'}`);
      console.log(`   Montant total: ${request.totalAmount} GNF`);
      console.log(`   Paiement: ${request.payment ? `${request.payment.status} (${request.payment.method}) - ${request.payment.amount} GNF` : 'Non payé'}`);
      console.log(`   Examens (${request.exams.length}):`);
      request.exams.forEach((exam, idx) => {
        console.log(`     ${idx + 1}. ${exam.labExam.name} (${exam.labExam.category}) - ${exam.price || exam.labExam.price} GNF`);
      });
      console.log(`   Résultats: ${request.results && request.results.length > 0 ? `${request.results.length} résultat(s) - Statut: ${request.results[0].status}` : 'Aucun résultat'}`);
      console.log(`   Créé le: ${request.createdAt}`);
      console.log(`   Mis à jour le: ${request.updatedAt}`);
      console.log('-'.repeat(100));
    });
    
    // Filtrer les demandes en attente (pending)
    const pendingRequests = requests.filter(req => req.status === 'pending');
    console.log(`\n⏳ Demandes en attente (pending): ${pendingRequests.length}`);
    if (pendingRequests.length > 0) {
      console.log('\nDétails des demandes en attente:');
      pendingRequests.forEach((request, index) => {
        console.log(`\n${index + 1}. ${request.patient ? `${request.patient.firstName} ${request.patient.lastName}` : 'N/A'} - ${request.exams.length} examen(s) - ${request.totalAmount} GNF`);
        console.log(`   Paiement: ${request.payment ? `${request.payment.status}` : 'Non payé'}`);
      });
    }
    
    // Filtrer les demandes envoyées au médecin
    const sentToDoctorRequests = requests.filter(req => req.status === 'sent_to_doctor');
    console.log(`\n📤 Demandes envoyées au médecin (sent_to_doctor): ${sentToDoctorRequests.length}`);
    if (sentToDoctorRequests.length > 0) {
      console.log('\nDétails des demandes envoyées au médecin:');
      sentToDoctorRequests.forEach((request, index) => {
        console.log(`\n${index + 1}. ${request.patient ? `${request.patient.firstName} ${request.patient.lastName}` : 'N/A'} - ${request.exams.length} examen(s)`);
        console.log(`   Résultats: ${request.results && request.results.length > 0 ? `Oui (${request.results[0].status})` : 'Non'}`);
      });
    }
    
    // Export JSON optionnel
    const exportData = requests.map(request => ({
      id: request.id,
      status: request.status,
      patient: request.patient ? {
        id: request.patient.id,
        vitalisId: request.patient.vitalisId,
        firstName: request.patient.firstName,
        lastName: request.patient.lastName,
        phone: request.patient.phone
      } : null,
      doctor: request.doctor ? {
        id: request.doctor.id,
        name: request.doctor.name,
        email: request.doctor.email
      } : null,
      exams: request.exams.map(exam => ({
        id: exam.labExam.id,
        name: exam.labExam.name,
        category: exam.labExam.category,
        price: exam.price || exam.labExam.price
      })),
      totalAmount: request.totalAmount,
      payment: request.payment ? {
        id: request.payment.id,
        amount: request.payment.amount,
        status: request.payment.status,
        method: request.payment.method
      } : null,
      results: request.results && request.results.length > 0 ? request.results.map(r => ({
        id: r.id,
        status: r.status,
        completedAt: r.completedAt,
        sentAt: r.sentAt
      })) : [],
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));
    
    console.log('\n✅ Script terminé avec succès!');
    console.log(`\n💾 Pour exporter en JSON, utilisez: JSON.stringify(exportData, null, 2)`);
    
    // Fermer la connexion
    await sequelize.close();
    
    return exportData;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des demandes:', error);
    await sequelize.close();
    throw error;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  getAllLabRequests()
    .then(() => {
      console.log('\n👋 Fin du script');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { getAllLabRequests };
