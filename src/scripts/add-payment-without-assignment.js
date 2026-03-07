#!/usr/bin/env node

/**
 * Script pour ajouter un paiement consultation SANS assignation (test)
 * Crée un paiement payé pour un patient existant, sans créer DoctorAssignment ni ConsultationDossier.
 *
 * Usage (depuis vitalis_backend/backend/) :
 *   node src/scripts/add-payment-without-assignment.js [VTL-2026-00001]
 *
 * Par défaut : VTL-2026-00001
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { Patient, Payment, ConsultationPrice, User } = models;
const { sequelize } = models;

const vitalisId = process.argv[2] || 'VTL-2026-00001';

async function addPayment() {
  try {
    await sequelize.authenticate();
    console.log(`\n📝 Ajout paiement consultation SANS assignation pour ${vitalisId}\n`);

    const patient = await Patient.findOne({ where: { vitalisId } });
    if (!patient) {
      console.log(`❌ Patient non trouvé: ${vitalisId}`);
      await sequelize.close();
      process.exit(1);
    }
    console.log(`   Patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);

    const priceRow = await ConsultationPrice.findOne({ where: { isActive: true } });
    const amount = priceRow ? Number(priceRow.price) : 50000;
    console.log(`   Montant consultation: ${amount} GNF`);

    const adminOrReception = await User.findOne({
      where: { role: { [require('sequelize').Op.in]: ['admin', 'reception'] }, isActive: true },
      attributes: ['id', 'name'],
    });
    const createdBy = adminOrReception?.id || patient.id;
    console.log(`   Créé par: ${adminOrReception?.name || createdBy}`);

    const payment = await Payment.create({
      patientId: patient.id,
      amount,
      method: 'cash',
      status: 'paid',
      type: 'consultation',
      createdBy,
      amountBase: amount,
      insuranceDeduction: 0,
      discountDeduction: 0,
    });

    console.log(`\n✅ Paiement créé: ${payment.id}`);
    console.log(`   Montant: ${payment.amount} GNF | Statut: ${payment.status}`);
    console.log(`   Le patient doit apparaître dans "Assignation médecin" comme "Non assigné".\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

addPayment();
