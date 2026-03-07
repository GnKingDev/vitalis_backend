#!/usr/bin/env node

/**
 * Script pour inspecter un patient (payments, assignments, dossiers)
 *
 * Usage (depuis vitalis_backend/backend/) :
 *   node src/scripts/inspect-patient.js [VTL-2026-00001]
 *
 * Par défaut : VTL-2026-00001
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { Patient, Payment, DoctorAssignment, ConsultationDossier, User } = models;
const { sequelize } = models;
const { Op } = require('sequelize');

const vitalisId = process.argv[2] || 'VTL-2026-00001';

async function inspect() {
  try {
    await sequelize.authenticate();
    console.log(`\n🔍 Inspection du patient ${vitalisId}\n`);

    const patient = await Patient.findOne({
      where: { vitalisId },
      include: [
        {
          model: Payment,
          as: 'payments',
          where: { type: 'consultation' },
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
        },
        {
          model: DoctorAssignment,
          as: 'doctorAssignments',
          include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!patient) {
      console.log(`❌ Patient non trouvé: ${vitalisId}\n`);
      await sequelize.close();
      process.exit(1);
    }

    console.log('--- Patient ---');
    console.log(`   ID:         ${patient.id}`);
    console.log(`   Vitalis ID: ${patient.vitalisId}`);
    console.log(`   Nom:        ${patient.firstName} ${patient.lastName}`);
    console.log(`   Téléphone:  ${patient.phone}`);
    console.log(`   Créé le:    ${patient.createdAt}`);
    console.log('');

    const payments = patient.payments || [];
    console.log(`--- Paiements consultation (${payments.length}) ---`);
    if (payments.length === 0) {
      console.log('   Aucun paiement consultation.');
    } else {
      payments.forEach((p, i) => {
        console.log(`   [${i + 1}] ${p.id?.substring(0, 8)}...`);
        console.log(`       Montant: ${p.amount} GNF | Statut: ${p.status} | Méthode: ${p.method}`);
        console.log(`       Base: ${p.amountBase ?? '-'} | Assur: ${p.insuranceDeduction ?? '-'} | Remise: ${p.discountDeduction ?? '-'}`);
        console.log(`       Créé le: ${p.createdAt}`);
      });
    }
    console.log('');

    const assignments = patient.doctorAssignments || [];
    console.log(`--- Assignations médecin (${assignments.length}) ---`);
    if (assignments.length === 0) {
      console.log('   Aucune assignation.');
    } else {
      assignments.forEach((a, i) => {
        const doctor = a.doctor?.name || a.doctorId || '-';
        console.log(`   [${i + 1}] ${a.id?.substring(0, 8)}...`);
        console.log(`       Médecin: ${doctor} | Statut: ${a.status}`);
        console.log(`       PaymentId: ${a.paymentId?.substring(0, 8) || '-'}...`);
        console.log(`       Créé le: ${a.createdAt}`);
      });
    }
    console.log('');

    const dossiers = await ConsultationDossier.findAll({
      where: { patientId: patient.id },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    console.log(`--- Dossiers de consultation (${dossiers.length}) ---`);
    if (dossiers.length === 0) {
      console.log('   Aucun dossier.');
    } else {
      dossiers.forEach((d, i) => {
        const doctor = d.doctor?.name || '-';
        console.log(`   [${i + 1}] ${d.id?.substring(0, 8)}...`);
        console.log(`       Statut: ${d.status} | Médecin: ${doctor}`);
        console.log(`       AssignmentId: ${d.assignmentId?.substring(0, 8) || '-'}...`);
        console.log(`       Créé le: ${d.createdAt}`);
      });
    }
    console.log('');

    // Assignations actives
    const activeAssignments = assignments.filter((a) =>
      ['assigned', 'in_consultation'].includes(a.status)
    );
    console.log('--- Résumé ---');
    console.log(`   Paiements consultation payés: ${payments.filter((p) => p.status === 'paid').length}`);
    console.log(`   Assignations actives (assigned/in_consultation): ${activeAssignments.length}`);
    console.log(`   Dossiers actifs (non archivés): ${dossiers.filter((d) => d.status !== 'archived').length}`);
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

inspect();
