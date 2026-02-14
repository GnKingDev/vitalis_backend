const puppeteer = require('puppeteer');
const config = require('../config');
const fs = require('fs');
const path = require('path');
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
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
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
   * Génère un PDF à partir d'un template
   */
  async generatePDFFromTemplate(templateName, data, options = {}) {
    const template = this.loadTemplate(templateName);
    const html = template(data);
    return await this.generatePDF(html, options);
  }

  /**
   * Génère le PDF d'un résultat de laboratoire
   */
  async generateLabResultPDF(labResult, labRequest, patient, doctor) {
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
      vitalisId: patient.vitalisId,
      labRequestId: labRequest.id.substring(0, 8).toUpperCase(),
      serviceDate: formatDate(labRequest.createdAt),
      doctorName: doctor.name,
      sections: labResult.results.sections || [],
      notes: labRequest.notes || null,
      technicianNotes: labResult.technicianNotes || null,
      generatedDate: formatDate(new Date())
    };

    return await this.generatePDFFromTemplate('lab-result', data);
  }

  /**
   * Génère le PDF d'un résultat d'imagerie
   */
  async generateImagingResultPDF(imagingRequest, patient, doctor) {
    const { calculateAge } = require('../utils/ageCalculator');
    const { formatDate } = require('../utils/dateFormatter');

    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: calculateAge(patient.dateOfBirth),
      vitalisId: patient.vitalisId,
      imagingRequestId: imagingRequest.id.substring(0, 8).toUpperCase(),
      serviceDate: formatDate(imagingRequest.createdAt),
      doctorName: doctor.name,
      exams: imagingRequest.exams || [],
      results: imagingRequest.results || '',
      generatedDate: formatDate(new Date())
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
      generatedDate: formatDate(new Date())
    };

    return await this.generatePDFFromTemplate('prescription', data);
  }
}

module.exports = new PDFService();
