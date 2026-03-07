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
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const validator = labResult.validator || (labResult.validatorId && { name: 'Technicien labo' });
    const signerName = validator?.name || 'Laboratoire Vitalis';
    const labNumber = validator?.labNumber?.number || null;

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
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
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const labTechnician = imagingRequest.labTechnician;
    const signerName = labTechnician?.name || 'Service imagerie';
    const labNumber = labTechnician?.labNumber?.number || null;

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
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
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
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
   * Génère le PDF d'un item personnalisé (résultat labo/imagerie externe)
   */
  async generateCustomItemPDF(customItem, patient, doctor) {
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
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
