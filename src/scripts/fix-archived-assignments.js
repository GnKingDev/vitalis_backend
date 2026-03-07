#!/usr/bin/env node

/**
 * Corrige les assignations dont le dossier est archivé : met status à 'completed'.
 *
 * Usage (depuis vitalis_backend/backend/) :
 *   node src/scripts/fix-archived-assignments.js
 *
 * Optionnel : node src/scripts/fix-archived-assignments.js VTL-2026-00001
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { Patient, DoctorAssignment, ConsultationDossier } = models;
const { sequelize } = models;
const { Op } = require('sequelize');

const vitalisId = process.argv[2];

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('\n🔧 Correction des assignations liées à des dossiers archivés\n');

    const where = {};
    if (vitalisId) {
      const patient = await Patient.findOne({ where: { vitalisId } });
      if (!patient) {
        console.log(`❌ Patient non trouvé: ${vitalisId}`);
        await sequelize.close();
        process.exit(1);
      }
      where.patientId = patient.id;
      console.log(`Patient ciblé: ${patient.firstName} ${patient.lastName} (${vitalisId})\n`);
    }

    const assignments = await DoctorAssignment.findAll({
      where: { ...where, status: { [Op.in]: ['assigned', 'in_consultation'] } },
      include: [{ model: ConsultationDossier, as: 'dossier', required: false }],
    });

    let updated = 0;
    for (const a of assignments) {
      const dossier = a.dossier;
      if (dossier && dossier.status === 'archived') {
        await a.update({ status: 'completed' });
        console.log(`   ✅ Assignment ${a.id.substring(0, 8)}... → completed (dossier archivé)`);
        updated++;
      }
    }

    if (updated === 0) {
      console.log('   Aucune assignation à corriger.');
    } else {
      console.log(`\n   ${updated} assignation(s) corrigée(s).`);
    }
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

fix();
