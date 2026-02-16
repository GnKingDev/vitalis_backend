const { LabRequest, LabResult, ImagingRequest, ConsultationDossier, Patient, User, Consultation, Prescription, PrescriptionItem, CustomItem, LabRequestExam, LabExam, ImagingRequestExam, ImagingExam, DoctorAssignment, PharmacyProduct } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { calculateAge } = require('../utils/ageCalculator');

// ========== ROUTES RÉSULTATS COMBINÉS ==========

/**
 * Liste combinée des résultats de laboratoire et d'imagerie pour un médecin
 */
exports.getAllResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, patientId, search } = req.query;
    const offset = (page - 1) * limit;
    const user = req.user;
    
    const results = [];
    
    // Récupérer les résultats de laboratoire
    // Uniquement ceux avec statut 'sent_to_doctor' ET qui ont un résultat avec statut 'sent' (en attente)
    if (!type || type === 'lab' || type === 'all') {
      const labWhere = {
        doctorId: user.id,
        status: 'sent_to_doctor'
      };
      
      if (patientId) {
        labWhere.patientId = patientId;
      }
      
      if (search) {
        labWhere[Op.or] = [
          { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
          { '$patient.firstName$': { [Op.like]: `%${search}%` } },
          { '$patient.lastName$': { [Op.like]: `%${search}%` } }
        ];
      }
      
      const labRequests = await LabRequest.findAll({
        where: labWhere,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'vitalisId', 'firstName', 'lastName']
          },
          {
            model: LabResult,
            as: 'results',
            where: {
              status: 'sent' // Uniquement les résultats envoyés au médecin (en attente)
            },
            required: true, // Obligatoire : doit avoir un résultat avec statut 'sent'
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['updatedAt', 'DESC']]
      });
      
      labRequests.forEach(request => {
        const result = request.results && request.results.length > 0 ? request.results[0] : null;
        if (result) { // S'assurer qu'il y a un résultat
          results.push({
            id: request.id,
            type: 'lab',
            patient: request.patient,
            request: {
              id: request.id,
              status: request.status,
              totalAmount: request.totalAmount
            },
            result: {
              id: result.id,
              status: result.status,
              completedAt: result.completedAt
            },
            status: request.status,
            completedAt: result.completedAt
          });
        }
      });
    }
    
    // Récupérer les résultats d'imagerie
    // Uniquement ceux avec statut 'sent_to_doctor' ET qui ont des résultats remplis (en attente)
    if (!type || type === 'imaging' || type === 'all') {
      const imagingWhere = {
        doctorId: user.id,
        status: 'sent_to_doctor',
        results: { [Op.ne]: null } // Doit avoir des résultats remplis
      };
      
      if (patientId) {
        imagingWhere.patientId = patientId;
      }
      
      if (search) {
        imagingWhere[Op.or] = [
          { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
          { '$patient.firstName$': { [Op.like]: `%${search}%` } },
          { '$patient.lastName$': { [Op.like]: `%${search}%` } }
        ];
      }
      
      const imagingRequests = await ImagingRequest.findAll({
        where: imagingWhere,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'vitalisId', 'firstName', 'lastName']
          }
        ],
        order: [['updatedAt', 'DESC']]
      });
      
      imagingRequests.forEach(request => {
        // Vérifier que les résultats ne sont pas vides
        if (request.results && request.results.trim().length > 0) {
          results.push({
            id: request.id,
            type: 'imaging',
            patient: request.patient,
            request: {
              id: request.id,
              status: request.status,
              totalAmount: request.totalAmount,
              results: request.results
            },
            status: request.status,
            completedAt: request.updatedAt
          });
        }
      });
    }
    
    // Trier par date (plus récent en premier)
    results.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + parseInt(limit));
    
    res.json(paginatedResponse({ results: paginatedResults }, { page: parseInt(page), limit: parseInt(limit) }, total));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'un résultat (lab ou imaging).
 * Si type n'est pas fourni en query, on tente lab puis imaging (auto-détection).
 */
exports.getResultById = async (req, res, next) => {
  try {
    let { type } = req.query;
    const user = req.user;
    const resultId = req.params.id;
    
    // Auto-détection du type si non fourni : essayer lab puis imaging
    if (!type || (type !== 'lab' && type !== 'imaging')) {
      const labRequest = await LabRequest.findOne({
        where: { id: resultId, doctorId: user.id, status: 'sent_to_doctor' }
      });
      if (labRequest) {
        type = 'lab';
      } else {
        const imagingRequest = await ImagingRequest.findOne({
          where: { id: resultId, doctorId: user.id, status: 'sent_to_doctor' }
        });
        if (imagingRequest) {
          type = 'imaging';
        }
      }
    }
    
    if (!type || (type !== 'lab' && type !== 'imaging')) {
      return res.status(404).json(
        errorResponse('Résultat non trouvé ou non accessible', 404)
      );
    }
    
    if (type === 'lab') {
      const labRequest = await LabRequest.findByPk(resultId, {
        include: [
          {
            model: Patient,
            as: 'patient'
          },
          {
            model: User,
            as: 'doctor',
            attributes: { exclude: ['password'] }
          },
          {
            model: Consultation,
            as: 'consultation',
            required: false
          },
          {
            model: LabRequestExam,
            as: 'exams',
            include: [{
              model: LabExam,
              as: 'labExam'
            }]
          },
          {
            model: LabResult,
            as: 'results',
            include: [{
              model: User,
              as: 'validator',
              attributes: ['id', 'name', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit: 1
          }
        ]
      });
      
      if (!labRequest || labRequest.doctorId !== user.id) {
        return res.status(404).json(
          errorResponse('Résultat non trouvé', 404)
        );
      }
      
      if (labRequest.status !== 'sent_to_doctor') {
        return res.status(403).json(
          errorResponse('Ce résultat n\'est pas encore disponible', 403)
        );
      }
      
      // Toujours renvoyer results comme tableau pour le frontend (ex: .filter, .map)
      const resultsList = Array.isArray(labRequest.results)
        ? labRequest.results
        : labRequest.results
          ? [labRequest.results]
          : [];
      const resultsPayload = resultsList.map((result) => ({
        id: result.id,
        results: result.results || {},
        technicianNotes: result.technicianNotes,
        validatedBy: result.validator,
        validatedAt: result.validatedAt,
        completedAt: result.completedAt,
        createdAt: result.createdAt
      }));
      const lastResult = resultsList.length > 0 ? resultsList[resultsList.length - 1] : null;

      res.json(successResponse({
        type: 'lab',
        patient: labRequest.patient,
        doctor: labRequest.doctor,
        request: {
          id: labRequest.id,
          status: labRequest.status,
          exams: (labRequest.exams || []).map(exam => ({
            id: exam.labExam?.id,
            name: exam.labExam?.name,
            category: exam.labExam?.category,
            price: exam.price
          })),
          totalAmount: labRequest.totalAmount
        },
        results: resultsPayload,
        completedAt: lastResult ? (lastResult.completedAt || lastResult.createdAt) : labRequest.updatedAt
      }));
    } else {
      const imagingRequest = await ImagingRequest.findByPk(resultId, {
        include: [
          {
            model: Patient,
            as: 'patient'
          },
          {
            model: User,
            as: 'doctor',
            attributes: { exclude: ['password'] }
          },
          {
            model: Consultation,
            as: 'consultation',
            required: false
          },
          {
            model: ImagingRequestExam,
            as: 'exams',
            include: [{
              model: ImagingExam,
              as: 'imagingExam'
            }]
          }
        ]
      });
      
      if (!imagingRequest || imagingRequest.doctorId !== user.id) {
        return res.status(404).json(
          errorResponse('Résultat non trouvé', 404)
        );
      }
      
      if (imagingRequest.status !== 'sent_to_doctor') {
        return res.status(403).json(
          errorResponse('Ce résultat n\'est pas encore disponible', 403)
        );
      }
      
      res.json(successResponse({
        type: 'imaging',
        patient: imagingRequest.patient,
        doctor: imagingRequest.doctor,
        request: {
          id: imagingRequest.id,
          status: imagingRequest.status,
          exams: imagingRequest.exams.map(exam => ({
            id: exam.imagingExam.id,
            name: exam.imagingExam.name,
            category: exam.imagingExam.category,
            price: exam.price
          })),
          totalAmount: imagingRequest.totalAmount
        },
        results: imagingRequest.results,
        completedAt: imagingRequest.updatedAt
      }));
    }
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES DOSSIERS ==========

/**
 * Liste des dossiers actifs pour un médecin
 */
exports.getAllDossiers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    const user = req.user;
    
    const where = {
      doctorId: user.id
    };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
        { '$patient.firstName$': { [Op.like]: `%${search}%` } },
        { '$patient.lastName$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await ConsultationDossier.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender']
        },
        {
          model: DoctorAssignment,
          as: 'assignment',
          required: false
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    const dossiers = rows.map(dossier => ({
      id: dossier.id,
      patient: {
        ...dossier.patient.toJSON(),
        age: calculateAge(dossier.patient.dateOfBirth),
        gender: dossier.patient.gender
      },
      assignment: dossier.assignment,
      consultation: dossier.consultation,
      status: dossier.status,
      createdAt: dossier.createdAt
    }));
    
    res.json(paginatedResponse({ dossiers }, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer un dossier complet avec toutes les données
 */
exports.getDossierById = async (req, res, next) => {
  try {
    const user = req.user;
    const dossier = await ConsultationDossier.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: DoctorAssignment,
          as: 'assignment',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false
        }
      ]
    });
    
    if (!dossier || dossier.doctorId !== user.id) {
      return res.status(404).json(
        errorResponse('Dossier non trouvé', 404)
      );
    }
    
    // Récupérer les demandes de laboratoire
    const labRequests = await LabRequest.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: user.id
      },
      include: [{
        model: LabRequestExam,
        as: 'exams',
        include: [{
          model: LabExam,
          as: 'labExam'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les demandes d'imagerie
    const imagingRequests = await ImagingRequest.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: user.id
      },
      include: [{
        model: ImagingRequestExam,
        as: 'exams',
        include: [{
          model: ImagingExam,
          as: 'imagingExam'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les ordonnances
    const prescriptions = await Prescription.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: user.id
      },
      include: [{
        model: PrescriptionItem,
        as: 'items'
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les items personnalisés
    // Si une consultation existe, filtrer par consultationId, sinon tous les items du patient
    const customItemsWhere = {
      patientId: dossier.patientId,
      doctorId: user.id
    };
    
    if (dossier.consultationId) {
      customItemsWhere.consultationId = dossier.consultationId;
    }
    
    const customItems = await CustomItem.findAll({
      where: customItemsWhere,
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse({
      id: dossier.id,
      patient: dossier.patient,
      assignment: dossier.assignment,
      consultation: dossier.consultation,
      labRequests,
      imagingRequests,
      prescriptions,
      customItems,
      status: dossier.status,
      createdAt: dossier.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer ou mettre à jour une consultation (pour le médecin connecté)
 * Une seule consultation par dossier - si elle existe, elle est mise à jour
 */
exports.createConsultation = async (req, res, next) => {
  try {
    const { patientId, symptoms, vitals, diagnosis, notes, dossierId } = req.body;
    const user = req.user;
    
    if (!patientId) {
      return res.status(400).json(
        errorResponse('patientId est requis', 400)
      );
    }
    
    if (!dossierId) {
      return res.status(400).json(
        errorResponse('dossierId est requis', 400)
      );
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier que le dossier existe et appartient au médecin connecté
    const dossier = await ConsultationDossier.findByPk(dossierId);
    if (!dossier) {
      return res.status(404).json(
        errorResponse('Dossier non trouvé', 404)
      );
    }
    
    if (dossier.doctorId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous n\'avez pas accès à ce dossier', 403)
      );
    }
    
    // Vérifier si le dossier est archivé
    if (dossier.status === 'archived') {
      return res.status(400).json(
        errorResponse('Impossible de modifier une consultation dans un dossier archivé', 400)
      );
    }
    
    let consultation;
    let isNew = false;
    
    // Vérifier si une consultation existe déjà pour ce dossier
    if (dossier.consultationId) {
      // Mettre à jour la consultation existante
      consultation = await Consultation.findByPk(dossier.consultationId);
      if (!consultation) {
        // Si la consultation n'existe plus, créer une nouvelle
        consultation = await Consultation.create({
          patientId,
          doctorId: user.id,
          symptoms,
          vitals,
          diagnosis,
          notes,
          status: 'in_progress'
        });
        isNew = true;
        await dossier.update({ consultationId: consultation.id });
      } else {
        // Mettre à jour la consultation existante
        await consultation.update({
          symptoms: symptoms !== undefined ? symptoms : consultation.symptoms,
          vitals: vitals !== undefined ? vitals : consultation.vitals,
          diagnosis: diagnosis !== undefined ? diagnosis : consultation.diagnosis,
          notes: notes !== undefined ? notes : consultation.notes
        });
      }
    } else {
      // Créer une nouvelle consultation
      consultation = await Consultation.create({
        patientId,
        doctorId: user.id,
        symptoms,
        vitals,
        diagnosis,
        notes,
        status: 'in_progress'
      });
      isNew = true;
      
      // Associer la consultation au dossier
      await dossier.update({
        consultationId: consultation.id
      });
    }
    
    // Récupérer la consultation avec les relations
    const consultationWithRelations = await Consultation.findByPk(consultation.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    const message = isNew ? 'Consultation créée avec succès' : 'Consultation mise à jour avec succès';
    res.status(isNew ? 201 : 200).json(successResponse(consultationWithRelations, message));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES ITEMS PERSONNALISÉS ==========

/**
 * Créer ou mettre à jour un item personnalisé
 * POST /api/v1/doctor/custom-items
 */
exports.createOrUpdateCustomItem = async (req, res, next) => {
  try {
    const { consultationId, patientId, doctorId, name, description } = req.body;
    const user = req.user;
    
    // Validation
    if (!patientId || !doctorId || !name) {
      return res.status(400).json(
        errorResponse('patientId, doctorId et name sont requis', 400)
      );
    }
    
    // Vérifier que le médecin connecté correspond
    if (doctorId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous ne pouvez créer des items que pour vos propres consultations', 403)
      );
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Trouver la consultation si consultationId n'est pas fourni
    let finalConsultationId = consultationId;
    if (!finalConsultationId) {
      // Chercher la consultation active du patient pour ce médecin
      const activeConsultation = await Consultation.findOne({
        where: {
          patientId,
          doctorId,
          status: 'in_progress'
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (activeConsultation) {
        finalConsultationId = activeConsultation.id;
      }
    } else {
      // Vérifier que la consultation existe
      const consultation = await Consultation.findByPk(finalConsultationId);
      if (!consultation) {
        return res.status(404).json(
          errorResponse('Consultation non trouvée', 404)
        );
      }
      
      // Vérifier que la consultation appartient au médecin
      if (consultation.doctorId !== user.id) {
        return res.status(403).json(
          errorResponse('Vous n\'avez pas accès à cette consultation', 403)
        );
      }
    }
    
    // Normaliser le nom pour la comparaison (case-insensitive)
    const normalizedName = name.trim().toLowerCase();
    
    // Construire la clause where pour chercher un item existant
    const whereClause = {
      patientId,
      doctorId,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          normalizedName
        )
      ]
    };
    
    if (finalConsultationId) {
      whereClause.consultationId = finalConsultationId;
    } else {
      whereClause.consultationId = { [Op.is]: null };
    }
    
    // Chercher un item existant
    const existingItem = await CustomItem.findOne({
      where: whereClause
    });
    
    if (existingItem) {
      // MISE À JOUR : Item existe déjà
      await existingItem.update({
        name: name.trim(),
        description: description !== undefined ? (description || null) : existingItem.description,
        updatedAt: new Date()
      });
      
      await existingItem.reload();
      
      return res.json(successResponse({
        item: existingItem,
        isUpdate: true
      }, 'Item personnalisé mis à jour avec succès'));
    } else {
      // CRÉATION : Nouvel item
      const newItem = await CustomItem.create({
        consultationId: finalConsultationId || null,
        patientId,
        doctorId,
        name: name.trim(),
        description: description || null
      });
      
      return res.status(201).json(successResponse({
        item: newItem,
        isUpdate: false
      }, 'Item personnalisé créé avec succès'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer la liste des items personnalisés
 * GET /api/v1/doctor/custom-items
 */
exports.getAllCustomItems = async (req, res, next) => {
  try {
    const { patientId, consultationId, doctorId, page = 1, limit = 10 } = req.query;
    const user = req.user;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offset = (pageNum - 1) * limitNum;
    
    const where = {};
    
    // Filtrer par patient
    if (patientId) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
      if (!isValidUUID) {
        return res.status(400).json(
          errorResponse('Format UUID invalide pour patientId', 400)
        );
      }
      where.patientId = patientId;
    }
    
    // Filtrer par consultation
    if (consultationId) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(consultationId);
      if (!isValidUUID) {
        return res.status(400).json(
          errorResponse('Format UUID invalide pour consultationId', 400)
        );
      }
      where.consultationId = consultationId;
    }
    
    // Filtrer par médecin (doctors ne voient que leurs propres items)
    if (user.role === 'doctor') {
      where.doctorId = user.id;
    } else if (doctorId) {
      where.doctorId = doctorId;
    }
    
    const { count, rows } = await CustomItem.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });
    
    res.json(paginatedResponse({ items: rows }, { page: pageNum, limit: limitNum }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour un item personnalisé spécifique
 * PUT /api/v1/doctor/custom-items/:id
 */
exports.updateCustomItem = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const user = req.user;
    
    const item = await CustomItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json(
        errorResponse('Item personnalisé non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin est propriétaire de l'item
    if (item.doctorId !== user.id && user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Vous n\'avez pas accès à cet item', 403)
      );
    }
    
    // Mettre à jour
    await item.update({
      name: name !== undefined ? name.trim() : item.name,
      description: description !== undefined ? (description || null) : item.description,
      updatedAt: new Date()
    });
    
    await item.reload({
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'status']
        }
      ]
    });
    
    res.json(successResponse({ item }, 'Item personnalisé mis à jour avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un item personnalisé
 * DELETE /api/v1/doctor/custom-items/:id
 */
exports.deleteCustomItem = async (req, res, next) => {
  try {
    const user = req.user;
    
    const item = await CustomItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json(
        errorResponse('Item personnalisé non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin est propriétaire de l'item
    if (item.doctorId !== user.id && user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Vous n\'avez pas accès à cet item', 403)
      );
    }
    
    await item.destroy();
    
    res.json(successResponse(null, 'Item personnalisé supprimé avec succès'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES ORDONNANCES ==========

/**
 * Créer une ordonnance
 * POST /api/v1/doctor/prescriptions
 */
exports.createPrescription = async (req, res, next) => {
  try {
    const { consultationId, patientId, items, notes } = req.body;
    const user = req.user;
    
    // Validation
    if (!patientId) {
      return res.status(400).json(
        errorResponse('patientId est requis', 400)
      );
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(
        errorResponse('items (tableau non vide) est requis', 400)
      );
    }
    
    // Valider chaque item
    for (const item of items) {
      if (!item.medication || !item.dosage || !item.frequency || !item.duration || !item.quantity) {
        return res.status(400).json(
          errorResponse('Chaque item doit contenir: medication, dosage, frequency, duration, quantity', 400)
        );
      }
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier la consultation si fournie
    if (consultationId) {
      const consultation = await Consultation.findByPk(consultationId);
      if (!consultation) {
        return res.status(404).json(
          errorResponse('Consultation non trouvée', 404)
        );
      }
      
      // Vérifier que la consultation appartient au médecin
      if (consultation.doctorId !== user.id) {
        return res.status(403).json(
          errorResponse('Vous n\'avez pas accès à cette consultation', 403)
        );
      }
    }
    
    // Créer l'ordonnance
    const prescription = await Prescription.create({
      patientId,
      consultationId: consultationId || null,
      doctorId: user.id,
      status: 'draft',
      notes: notes || null
    });
    
    // Créer les items de l'ordonnance
    await Promise.all(
      items.map(item =>
        PrescriptionItem.create({
          prescriptionId: prescription.id,
          medication: item.medication.trim(),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          quantity: item.quantity.trim(),
          instructions: item.instructions ? item.instructions.trim() : null
        })
      )
    );
    
    // Récupérer l'ordonnance avec les relations
    const prescriptionWithRelations = await Prescription.findByPk(prescription.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'status']
        },
        {
          model: PrescriptionItem,
          as: 'items'
        }
      ]
    });
    
    res.status(201).json(successResponse(prescriptionWithRelations, 'Ordonnance créée avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste des ordonnances créées par un médecin
 * GET /api/v1/doctor/prescriptions
 */
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const { patientId, status, page = 1, limit = 10 } = req.query;
    const user = req.user;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offset = (pageNum - 1) * limitNum;
    
    const where = {};
    
    // Les médecins ne voient que leurs propres ordonnances
    if (user.role === 'doctor') {
      where.doctorId = user.id;
    }
    
    // Filtrer par patient
    if (patientId) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
      if (!isValidUUID) {
        return res.status(400).json(
          errorResponse('Format UUID invalide pour patientId', 400)
        );
      }
      where.patientId = patientId;
    }
    
    // Filtrer par statut
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await Prescription.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'status']
        },
        {
          model: PrescriptionItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });
    
    res.json(paginatedResponse({ prescriptions: rows }, { page: pageNum, limit: limitNum }, count));
  } catch (error) {
    next(error);
  }
};
