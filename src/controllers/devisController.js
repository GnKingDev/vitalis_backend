const { Patient, InsuranceEstablishment, LabExam, ImagingExam, ConsultationType } = require('../models');
const pdfService = require('../services/pdfService');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Générer un devis PDF pour un patient
 * POST /api/v1/devis
 * Body: {
 *   patientId,
 *   items: [{ type: 'consultation'|'lab'|'imaging', refId, label, price }]
 * }
 */
exports.generateDevis = async (req, res, next) => {
  try {
    const { patientId, items } = req.body;

    if (!patientId) {
      return res.status(400).json(errorResponse('patientId est requis', 400));
    }

    const patient = await Patient.findByPk(patientId, {
      include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false }]
    });
    if (!patient) {
      return res.status(404).json(errorResponse('Patient non trouvé', 404));
    }

    // Enrichir les items si refId fourni sans prix
    const enrichedItems = await Promise.all((items || []).map(async (item) => {
      let label = item.label;
      let price = parseFloat(item.price || 0);

      if (item.refId && price === 0) {
        if (item.type === 'lab') {
          const exam = await LabExam.findByPk(item.refId);
          if (exam) { label = label || exam.name; price = parseFloat(exam.price); }
        } else if (item.type === 'imaging') {
          const exam = await ImagingExam.findByPk(item.refId);
          if (exam) { label = label || exam.name; price = parseFloat(exam.price); }
        } else if (item.type === 'consultation') {
          const ct = await ConsultationType.findByPk(item.refId);
          if (ct) { label = label || ct.name; price = parseFloat(ct.price || 0); }
        }
      }

      const typeLabels = { consultation: 'Consultation', lab: 'Laboratoire', imaging: 'Imagerie', pharmacy: 'Pharmacie' };
      return { label: label || 'Prestation', typeLabel: typeLabels[item.type] || item.type, price };
    }));

    const pdf = await pdfService.generateDevisPDF(patient, enrichedItems);

    const ref = `DEV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="devis-${ref}.pdf"`,
      'Content-Length': pdf.length
    });
    res.end(pdf);
  } catch (error) {
    next(error);
  }
};
