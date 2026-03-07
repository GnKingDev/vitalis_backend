#!/usr/bin/env node
/**
 * Script de simulation - Génère des PDFs d'exemple pour prévisualiser les templates
 * Usage: node src/scripts/generate-sample-pdfs.js
 *
 * Les PDFs sont sauvegardés dans output/sample-pdfs/
 */

const path = require('path');
const fs = require('fs');
const pdfService = require('../services/pdfService');

// Données simulées
const samplePatient = {
  firstName: 'Mamadou',
  lastName: 'Diallo',
  dateOfBirth: '1990-05-15',
  vitalisId: 'VTL-2026-00001',
};

const sampleDoctor = {
  name: 'Dr. Souaré',
};

async function generateSampleLabPDF() {
  console.log('📄 Génération du PDF Lab (résultat hématologie + biochimie)...');

  const labRequest = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date(),
    notes: 'Contrôle de routine',
  };

  const labResult = {
    validator: { name: 'Dr. Ibrahima Sow - Biologiste' },
    results: {
      sections: [
        {
          title: 'HEMATOLOGIE',
          items: [
            { name: 'Numération Globules Blancs', value: '7,2', unit: 'G/L', reference: '(4-11)', status: 'normal' },
            { name: 'Numération Globules Rouges', value: '4,8', unit: 'T/L', reference: '(4,5-5,5)', status: 'normal' },
            { name: 'Hémoglobine', value: '14,2', unit: 'g/dl', reference: '(13-17)', status: 'normal' },
            { name: 'Hématocrite', value: '42', unit: '%', reference: '(40-50)', status: 'normal' },
            { name: 'Numération Plaquettes', value: '235', unit: 'G/L', reference: '(150-400)', status: 'normal' },
          ],
        },
        {
          title: 'BIOCHIMIE',
          items: [
            { name: 'Glycémie', value: '0,95', unit: 'g/l', reference: '(0,70-1,10)', status: 'normal' },
            { name: 'Créatinine', value: '12', unit: 'mg/l', reference: '(8-14)', status: 'normal' },
            { name: 'Urée', value: '0,35', unit: 'g/l', reference: '(0,15-0,45)', status: 'normal' },
          ],
        },
      ],
    },
    technicianNotes: 'Prélèvement effectué à jeun. Résultats conformes aux valeurs usuelles.',
  };

  const pdf = await pdfService.generateLabResultPDF(labResult, labRequest, samplePatient, sampleDoctor);
  return pdf;
}

async function generateSampleImagingPDF() {
  console.log('📄 Génération du PDF Imagerie...');

  const imagingRequest = {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    createdAt: new Date(),
    labTechnician: { name: 'M. Alpha Diallo - Technicien imagerie' },
    exams: [
      { id: '1', name: 'Radiographie thorax', category: 'Radiologie' },
      { id: '2', name: 'Échographie abdominale', category: 'Échographie' },
    ],
    results: `Radiographie thorax (face) :
Poumons clairs, pas d'opacité parenchymateuse.
Cœur de taille normale.
Pas d'épanchement pleural.

Échographie abdominale :
Foie homogène, pas de lésion focale.
Vésicule biliaire en place, sans lithiase.
Rate de taille normale.
Pancréas et reins sans particularité.`,
  };

  const pdf = await pdfService.generateImagingResultPDF(
    imagingRequest,
    samplePatient,
    sampleDoctor
  );
  return pdf;
}

async function generateSamplePrescriptionPDF() {
  console.log('📄 Génération du PDF Ordonnance...');

  const prescription = {
    createdAt: new Date(),
  };

  const items = [
    { medication: 'Paracétamol 1000mg', dosage: '1 cp', frequency: '3x/jour', duration: '5 jours', quantity: '15 cp', instructions: 'Prendre après les repas' },
    { medication: 'Amoxicilline 500mg', dosage: '1 cp', frequency: '3x/jour', duration: '7 jours', quantity: '21 cp', instructions: 'Espacer les prises de 8h' },
    { medication: 'Doliprane sirop', dosage: '10 ml', frequency: 'si douleur', duration: '3 jours', quantity: '1 flacon', instructions: '' },
  ];

  const pdf = await pdfService.generatePrescriptionPDF(
    prescription,
    samplePatient,
    sampleDoctor,
    items
  );
  return pdf;
}

async function main() {
  const outputDir = path.join(__dirname, '../../output/sample-pdfs');

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`\n📁 Dossier de sortie : ${outputDir}\n`);

    // Lab
    const labPdf = await generateSampleLabPDF();
    const labPath = path.join(outputDir, 'sample-resultat-lab.pdf');
    fs.writeFileSync(labPath, labPdf);
    console.log(`   ✅ ${labPath}`);

    // Imaging
    const imagingPdf = await generateSampleImagingPDF();
    const imagingPath = path.join(outputDir, 'sample-resultat-imagerie.pdf');
    fs.writeFileSync(imagingPath, imagingPdf);
    console.log(`   ✅ ${imagingPath}`);

    // Prescription
    const prescriptionPdf = await generateSamplePrescriptionPDF();
    const prescriptionPath = path.join(outputDir, 'sample-ordonnance.pdf');
    fs.writeFileSync(prescriptionPath, prescriptionPdf);
    console.log(`   ✅ ${prescriptionPath}`);

    await pdfService.closeBrowser();

    console.log('\n✨ Terminé ! Ouvrez les fichiers pour voir les PDFs.\n');
    console.log(`   open "${outputDir}"   # macOS`);
    console.log(`   xdg-open "${outputDir}"   # Linux`);
    console.log(`   start "" "${outputDir}"   # Windows\n`);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await pdfService.closeBrowser();
    process.exit(1);
  }
}

main();
