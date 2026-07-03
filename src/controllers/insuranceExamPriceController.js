const { InsuranceExamPrice, InsuranceEstablishment, LabExam, ImagingExam } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Récupérer tous les prix d'examens pour une assurance
 * GET /api/v1/insurance-establishments/:id/exam-prices
 */
exports.getByInsurance = async (req, res, next) => {
  try {
    const { examType } = req.query;
    const where = { insuranceEstablishmentId: req.params.id };
    if (examType) where.examType = examType;

    const prices = await InsuranceExamPrice.findAll({ where });

    // Enrichir avec le nom de l'examen
    const enriched = await Promise.all(prices.map(async (p) => {
      let examName = null;
      if (p.examType === 'lab') {
        const exam = await LabExam.findByPk(p.examId, { attributes: ['id', 'name', 'category'] });
        examName = exam ? { id: exam.id, name: exam.name, category: exam.category } : null;
      } else {
        const exam = await ImagingExam.findByPk(p.examId, { attributes: ['id', 'name', 'category'] });
        examName = exam ? { id: exam.id, name: exam.name, category: exam.category } : null;
      }
      return { ...p.toJSON(), exam: examName };
    }));

    res.json(successResponse(enriched));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer ou mettre à jour un prix examen pour une assurance (upsert)
 * POST /api/v1/insurance-establishments/:id/exam-prices
 * Body: { examId, examType, price }
 */
exports.upsert = async (req, res, next) => {
  try {
    const insuranceEstablishmentId = req.params.id;
    const { examId, examType, price } = req.body;

    if (!examId || !examType || price === undefined) {
      return res.status(400).json(errorResponse('examId, examType et price sont requis', 400));
    }
    if (!['lab', 'imaging'].includes(examType)) {
      return res.status(400).json(errorResponse('examType doit être lab ou imaging', 400));
    }
    if (price < 0) {
      return res.status(400).json(errorResponse('Le prix ne peut pas être négatif', 400));
    }

    const insurance = await InsuranceEstablishment.findByPk(insuranceEstablishmentId);
    if (!insurance) {
      return res.status(404).json(errorResponse('Assurance non trouvée', 404));
    }

    const [record, created] = await InsuranceExamPrice.findOrCreate({
      where: { insuranceEstablishmentId, examId, examType },
      defaults: { insuranceEstablishmentId, examId, examType, price }
    });

    if (!created) {
      await record.update({ price });
    }

    res.status(created ? 201 : 200).json(successResponse(record, created ? 'Prix créé' : 'Prix mis à jour'));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un prix examen spécifique
 * DELETE /api/v1/insurance-establishments/:id/exam-prices/:priceId
 */
exports.remove = async (req, res, next) => {
  try {
    const record = await InsuranceExamPrice.findOne({
      where: { id: req.params.priceId, insuranceEstablishmentId: req.params.id }
    });
    if (!record) {
      return res.status(404).json(errorResponse('Prix non trouvé', 404));
    }
    await record.destroy();
    res.json(successResponse(null, 'Prix supprimé'));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer le prix d'un examen pour une assurance donnée
 * GET /api/v1/insurance-exam-price?insuranceId=X&examId=Y&examType=lab
 */
exports.getPrice = async (req, res, next) => {
  try {
    const { insuranceId, examId, examType } = req.query;
    if (!insuranceId || !examId || !examType) {
      return res.status(400).json(errorResponse('insuranceId, examId et examType sont requis', 400));
    }
    const record = await InsuranceExamPrice.findOne({
      where: { insuranceEstablishmentId: insuranceId, examId, examType }
    });
    res.json(successResponse(record ? { price: parseFloat(record.price) } : null));
  } catch (error) {
    next(error);
  }
};
