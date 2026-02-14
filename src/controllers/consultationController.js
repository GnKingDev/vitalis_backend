const { Consultation, Patient, User, LabRequest, ImagingRequest, Prescription, ConsultationDossier } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op } = require('sequelize');

/**
 * Liste toutes les consultations
 */
exports.getAllConsultations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, patientId, doctorId, status, date } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (date) {
      where.createdAt = {
        [Op.gte]: new Date(date),
        [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    
    const { count, rows } = await Consultation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(paginatedResponse(rows, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'une consultation
 */
exports.getConsultationById = async (req, res, next) => {
  try {
    const consultation = await Consultation.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: User,
          as: 'doctor'
        },
        {
          model: LabRequest,
          as: 'labRequests',
          required: false
        },
        {
          model: ImagingRequest,
          as: 'imagingRequests',
          required: false
        },
        {
          model: Prescription,
          as: 'prescriptions',
          required: false
        }
      ]
    });
    
    if (!consultation) {
      return res.status(404).json(
        errorResponse('Consultation non trouvée', 404)
      );
    }
    
    res.json(successResponse(consultation));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer une nouvelle consultation
 */
exports.createConsultation = async (req, res, next) => {
  try {
    const { patientId, doctorId, symptoms, vitals, diagnosis, notes } = req.body;
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin existe et a le rôle doctor
    const doctor = await User.findByPk(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json(
        errorResponse('Médecin invalide', 400)
      );
    }
    
    const consultation = await Consultation.create({
      patientId,
      doctorId,
      symptoms,
      vitals,
      diagnosis,
      notes,
      status: 'in_progress'
    });
    
    res.status(201).json(successResponse(consultation));
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour une consultation
 */
exports.updateConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findByPk(req.params.id);
    
    if (!consultation) {
      return res.status(404).json(
        errorResponse('Consultation non trouvée', 404)
      );
    }
    
    await consultation.update(req.body);
    
    res.json(successResponse(consultation));
  } catch (error) {
    next(error);
  }
};

/**
 * Marquer une consultation comme terminée
 */
exports.completeConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findByPk(req.params.id);
    
    if (!consultation) {
      return res.status(404).json(
        errorResponse('Consultation non trouvée', 404)
      );
    }
    
    // Vérifier que l'utilisateur est le médecin assigné ou admin
    if (consultation.doctorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Vous n\'êtes pas autorisé à terminer cette consultation', 403)
      );
    }
    
    await consultation.update({ status: 'completed' });
    
    // Mettre à jour le dossier associé pour le marquer comme terminé
    if (consultation.id) {
      const dossier = await ConsultationDossier.findOne({
        where: {
          consultationId: consultation.id,
          status: 'active'
        }
      });
      
      if (dossier) {
        await dossier.update({
          status: 'completed',
          completedAt: new Date()
        });
      }
    }
    
    res.json(successResponse(null, 'Consultation terminée avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Marquer un dossier comme terminé (clôturer le dossier)
 */
exports.completeDossier = async (req, res, next) => {
  try {
    const user = req.user;
    const dossierId = req.params.id;
    
    // Vérifier que l'utilisateur est un médecin
    if (user.role !== 'doctor') {
      return res.status(403).json(
        errorResponse('Seul un médecin peut clôturer un dossier', 403)
      );
    }
    
    // Récupérer le dossier
    const dossier = await ConsultationDossier.findByPk(dossierId);
    
    if (!dossier) {
      return res.status(404).json(
        errorResponse('Dossier non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin est le propriétaire du dossier
    if (dossier.doctorId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous n\'êtes pas autorisé à clôturer ce dossier', 403)
      );
    }
    
    // Vérifier que le dossier est actif
    if (dossier.status !== 'active') {
      return res.status(400).json(
        errorResponse(`Le dossier est déjà ${dossier.status === 'completed' ? 'terminé' : 'archivé'}`, 400)
      );
    }
    
    // Marquer le dossier comme terminé
    await dossier.update({
      status: 'completed',
      completedAt: new Date()
    });
    
    res.json(successResponse({
      id: dossier.id,
      status: dossier.status,
      completedAt: dossier.completedAt
    }, 'Dossier clôturé avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Archive un dossier de consultation (uniquement par médecin)
 */
exports.archiveDossier = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = req.user;
    const dossierId = req.params.id;
    
    // Vérifier que l'utilisateur est un médecin
    if (user.role !== 'doctor') {
      return res.status(403).json(
        errorResponse('Seul un médecin peut archiver un dossier', 403)
      );
    }
    
    // Récupérer le dossier
    const dossier = await ConsultationDossier.findByPk(dossierId, {
      include: [{
        model: User,
        as: 'doctor',
        attributes: ['id', 'name']
      }]
    });
    
    if (!dossier) {
      return res.status(404).json(
        errorResponse('Dossier non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin est le propriétaire du dossier
    if (dossier.doctorId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous n\'êtes pas autorisé à archiver ce dossier', 403)
      );
    }
    
    // Vérifier que le dossier est terminé
    if (dossier.status !== 'completed') {
      return res.status(400).json(
        errorResponse('Le dossier doit être terminé avant d\'être archivé', 400)
      );
    }
    
    // Vérifier que le dossier n'est pas déjà archivé
    if (dossier.status === 'archived') {
      return res.status(400).json(
        errorResponse('Le dossier est déjà archivé', 400)
      );
    }
    
    // Archiver le dossier
    await dossier.update({
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: user.id
    });
    
    const archivedDossier = await ConsultationDossier.findByPk(dossierId, {
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'archivedByUser',
          attributes: ['id', 'name']
        }
      ]
    });
    
    res.json(successResponse({
      id: archivedDossier.id,
      status: archivedDossier.status,
      archivedAt: archivedDossier.archivedAt,
      archivedBy: archivedDossier.archivedByUser
    }, 'Dossier archivé avec succès'));
  } catch (error) {
    next(error);
  }
};
