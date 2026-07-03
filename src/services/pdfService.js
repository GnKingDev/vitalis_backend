const puppeteer = require('puppeteer');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const handlebars = require('handlebars');

class PDFService {
  constructor() {
    this.browser = null;
  }

  /**
   * Initialise le navigateur Puppeteer
   */
  async initBrowser() {
    if (!this.browser) {
      const options = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };

      if (config.puppeteer.executablePath) {
        options.executablePath = config.puppeteer.executablePath;
      }

      this.browser = await puppeteer.launch(options);
    }
    return this.browser;
  }

  /**
   * Ferme le navigateur
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Charge un template Handlebars
   */
  loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '../templates/pdf', `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found`);
    }
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(templateContent);
  }

  /**
   * Génère un PDF à partir d'un HTML
   */
  async generatePDF(html, options = {}) {
    const browser = await this.initBrowser();
    const templatesDir = path.join(__dirname, '../templates/pdf');
    const baseURL = pathToFileURL(templatesDir).href + '/';

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', baseURL });
      
      const pdf = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        landscape: options.landscape || false
      });
      
      return pdf;
    } catch (error) {
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  }

  /**
   * Charge le logo en base64 pour l'embedding dans le HTML
   */
  getLogoDataUri() {
    const logoPath = path.join(__dirname, '../templates/pdf', 'logo-vitalis.png');
    if (!fs.existsSync(logoPath)) return null;
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Génère un PDF à partir d'un template
   */
  async generatePDFFromTemplate(templateName, data, options = {}) {
    const template = this.loadTemplate(templateName);
    const logoDataUri = this.getLogoDataUri();
    const templateData = { ...data, logoDataUri };
    const html = template(templateData);
    return await this.generatePDF(html, options);
  }

  /**
   * Génère le PDF d'un résultat de laboratoire
   */
  async generateLabResultPDF(labResult, labRequest, patient, doctor) {
    const { formatDate } = require('../utils/dateFormatter');

    const validator = labResult.validator || (labResult.validatorId && { name: 'Technicien labo' });
    const signerName = validator?.name || 'Laboratoire Vitalis';
    const labNumber = validator?.labNumber?.number || null;

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: patient.age,
      vitalisId: patient.vitalisId,
      labRequestId: labRequest.id.substring(0, 8).toUpperCase(),
      serviceDate: formatDate(labRequest.createdAt),
      doctorName: doctor.name,
      sections: (labResult.results && labResult.results.sections) || (labResult.results && labResult.results.results && labResult.results.results.sections) || [],
      notes: labRequest.notes || null,
      technicianNotes: labResult.technicianNotes || null,
      generatedDate: formatDate(new Date()),
      signerName,
      labNumber
    };

    return await this.generatePDFFromTemplate('lab-result', data);
  }

  /**
   * Génère le PDF d'un résultat d'imagerie
   */
  async generateImagingResultPDF(imagingRequest, patient, doctor) {
    const { formatDate } = require('../utils/dateFormatter');

    const labTechnician = imagingRequest.labTechnician;
    const signerName = labTechnician?.name || 'Service imagerie';
    const labNumber = labTechnician?.labNumber?.number || null;

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: patient.age,
      vitalisId: patient.vitalisId,
      imagingRequestId: imagingRequest.id.substring(0, 8).toUpperCase(),
      serviceDate: formatDate(imagingRequest.createdAt),
      doctorName: doctor.name,
      exams: imagingRequest.exams || [],
      results: imagingRequest.results || '',
      generatedDate: formatDate(new Date()),
      signerName,
      labNumber
    };

    return await this.generatePDFFromTemplate('imaging-result', data);
  }

  /**
   * Génère le PDF d'une ordonnance
   */
  async generatePrescriptionPDF(prescription, patient, doctor, items) {
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: patient.age,
      vitalisId: patient.vitalisId,
      prescriptionDate: formatDate(prescription.createdAt),
      doctorName: doctor.name,
      items: items || [],
      notes: prescription.notes || null,
      generatedDate: formatDate(new Date()),
      signerName: doctor.name
    };

    return await this.generatePDFFromTemplate('prescription', data);
  }

  /**
   * Génère le PDF d'une facture de paiement
   */
  async generateInvoicePDF(payment, patient, items) {
    const { formatDate } = require('../utils/dateFormatter');

    const amountBase = parseFloat(payment.amountBase || payment.amount || 0);
    const insuranceDeduction = parseFloat(payment.insuranceDeduction || 0);
    const discountDeduction = parseFloat(payment.discountDeduction || 0);
    const acompte = parseFloat(payment.acompte || 0);
    const netAPayer = amountBase - insuranceDeduction - discountDeduction - acompte;

    const methodLabels = { cash: 'Espèces', orange_money: 'Orange Money' };
    const statusLabels = { paid: 'Payé', pending: 'En attente', cancelled: 'Annulé' };
    const statusClasses = { paid: 'status-paid', pending: 'status-pending', cancelled: 'status-cancelled' };

    const insurance = patient.insuranceEstablishment;
    const hasInsurance = !!(insurance && insuranceDeduction > 0);

    const data = {
      invoiceRef: payment.id.substring(0, 8).toUpperCase(),
      invoiceDate: formatDate(payment.createdAt),
      generatedDate: formatDate(new Date()),
      patientName: `${patient.firstName} ${patient.lastName}`,
      vitalisId: patient.vitalisId,
      patientAge: patient.age || null,
      patientPhone: patient.phone || null,
      insuranceName: insurance ? insurance.name : null,
      coveragePercent: patient.insuranceCoveragePercent ? `${patient.insuranceCoveragePercent}%` : null,
      paymentMethod: methodLabels[payment.method] || payment.method,
      reference: payment.reference || null,
      statusLabel: statusLabels[payment.status] || payment.status,
      statusClass: statusClasses[payment.status] || 'status-pending',
      items: (items || []).map(item => {
        const unitPrice = parseFloat(item.unitPrice || item.price || 0);
        const coverage = parseFloat(patient.insuranceCoveragePercent || 0);
        const insurancePart = hasInsurance ? Math.round(unitPrice * coverage / 100) : 0;
        return {
          label: item.label || item.name,
          typeLabel: item.typeLabel || item.type || '',
          unitPrice: unitPrice.toLocaleString('fr-FR'),
          insurancePart: insurancePart.toLocaleString('fr-FR'),
          patientPart: (unitPrice - insurancePart).toLocaleString('fr-FR')
        };
      }),
      hasInsurance,
      amountBase: amountBase.toLocaleString('fr-FR'),
      insuranceDeduction: insuranceDeduction > 0 ? insuranceDeduction.toLocaleString('fr-FR') : null,
      discountDeduction: discountDeduction > 0 ? discountDeduction.toLocaleString('fr-FR') : null,
      discountPercent: patient.discountPercent || null,
      acompte: acompte > 0 ? acompte.toLocaleString('fr-FR') : null,
      netAPayer: Math.max(0, netAPayer).toLocaleString('fr-FR')
    };

    return await this.generatePDFFromTemplate('invoice', data);
  }

  /**
   * Génère le PDF d'un devis prévisionnel
   */
  async generateDevisPDF(patient, items, options = {}) {
    const { formatDate } = require('../utils/dateFormatter');

    const insurance = patient.insuranceEstablishment;
    const coveragePct = parseFloat(patient.insuranceCoveragePercent || (insurance && insurance.coveragePercent) || 0);
    const discountPct = parseFloat(patient.discountPercent || 0);
    const hasInsurance = !!(insurance && coveragePct > 0);

    let amountBase = 0;
    const enrichedItems = (items || []).map(item => {
      const unitPrice = parseFloat(item.price || 0);
      amountBase += unitPrice;
      const insurancePart = hasInsurance ? Math.round(unitPrice * coveragePct / 100) : 0;
      return {
        label: item.label || item.name,
        typeLabel: item.typeLabel || item.type || '',
        unitPrice: unitPrice.toLocaleString('fr-FR'),
        insurancePart: insurancePart.toLocaleString('fr-FR'),
        patientPart: (unitPrice - insurancePart).toLocaleString('fr-FR')
      };
    });

    const insuranceDeduction = hasInsurance ? Math.round(amountBase * coveragePct / 100) : 0;
    const discountDeduction = discountPct > 0 ? Math.round((amountBase - insuranceDeduction) * discountPct / 100) : 0;
    const netEstime = amountBase - insuranceDeduction - discountDeduction;

    // Date de validité : aujourd'hui + 7 jours
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 7);

    const data = {
      devisRef: `DEV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      devisDate: formatDate(new Date()),
      validUntil: formatDate(validDate),
      generatedDate: formatDate(new Date()),
      patientName: `${patient.firstName} ${patient.lastName}`,
      vitalisId: patient.vitalisId,
      patientAge: patient.age || null,
      patientPhone: patient.phone || null,
      insuranceName: insurance ? insurance.name : null,
      coveragePercent: coveragePct > 0 ? `${coveragePct}%` : null,
      items: enrichedItems,
      hasInsurance,
      amountBase: amountBase.toLocaleString('fr-FR'),
      insuranceDeduction: insuranceDeduction > 0 ? insuranceDeduction.toLocaleString('fr-FR') : null,
      discountDeduction: discountDeduction > 0 ? discountDeduction.toLocaleString('fr-FR') : null,
      discountPercent: discountPct > 0 ? `${discountPct}%` : null,
      netEstime: Math.max(0, netEstime).toLocaleString('fr-FR')
    };

    return await this.generatePDFFromTemplate('devis', data);
  }

  /**
   * Génère le PDF d'un item personnalisé (résultat labo/imagerie externe)
   */
  async generateCustomItemPDF(customItem, patient, doctor) {
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: patient.age,
      vitalisId: patient.vitalisId,
      serviceDate: formatDate(customItem.createdAt),
      doctorName: doctor.name,
      itemName: customItem.name || 'Résultat examen externe',
      itemDescription: customItem.description || 'Aucun détail fourni.',
      itemRef: customItem.id ? customItem.id.substring(0, 8).toUpperCase() : '—',
      generatedDate: formatDate(new Date()),
      signerName: doctor.name
    };

    return await this.generatePDFFromTemplate('custom-item-result', data);
  }
}

module.exports = new PDFService();
