#!/usr/bin/env node

/**
 * Script pour mettre à jour le N° identifiant assureur d'un patient
 *
 * Usage (depuis le dossier backend/) :
 *   node src/scripts/update-patient-insurance-member.js <patientId> <insuranceMemberNumber>
 *
 * Exemple :
 *   node src/scripts/update-patient-insurance-member.js b6116f17-10b1-499e-b80c-1a1274426e60 "VISTA-123456"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const models = require('../models');
const { Patient, sequelize } = models;

async function updateInsuranceMemberNumber(patientId, insuranceMemberNumber) {
  try {
    await sequelize.authenticate();

    const patient = await Patient.findByPk(patientId, {
      attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'insuranceMemberNumber', 'isInsured']
    });

    if (!patient) {
      console.error('❌ Patient non trouvé pour l\'ID:', patientId);
      process.exit(1);
    }

    console.log('Patient trouvé:');
    console.log('  ID Vitalis:', patient.vitalisId);
    console.log('  Nom:', patient.firstName, patient.lastName);
    console.log('  Assuré:', patient.isInsured ? 'Oui' : 'Non');
    console.log('  N° identifiant assureur (avant):', patient.insuranceMemberNumber || '(vide)');
    console.log('  N° identifiant assureur (nouveau):', insuranceMemberNumber || '(vide)');

    await patient.update({ insuranceMemberNumber: insuranceMemberNumber || null });
    await patient.reload();

    console.log('\n✅ Mise à jour effectuée.');
    console.log('  N° identifiant assureur (actuel):', patient.insuranceMemberNumber || '(vide)');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

const patientId = process.argv[2];
const insuranceMemberNumber = process.argv[3];

if (!patientId) {
  console.error('Usage: node src/scripts/update-patient-insurance-member.js <patientId> <insuranceMemberNumber>');
  process.exit(1);
}

updateInsuranceMemberNumber(patientId, insuranceMemberNumber);
