const { LabExam, LabRequest, LabRequestExam, LabResult, Patient, User, Consultation, Payment, ConsultationDossier } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');

// ========== ROUTES EXAMENS ==========

/**
 * Liste tous les examens de laboratoire
 */
exports.getAllExams = async (req, res, next) => {
  try {
    const { category, isActive } = req.query;
    const where = {};
    
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true;
    }
    
    const exams = await LabExam.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    
    res.json(successResponse(exams));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouvel examen (admin uniquement)
 */
exports.createExam = async (req, res, next) => {
  try {
    const { name, category, price, description } = req.body;
    
    if (!name || !category || price === undefined) {
      return res.status(400).json(
        errorResponse('name, category et price sont requis', 400)
      );
    }
    
    if (price < 0) {
      return res.status(400).json(
        errorResponse('Le prix doit être positif', 400)
      );
    }
    
    const exam = await LabExam.create({
      name,
      category,
      price,
      description: description || null
    });
    
    res.status(201).json(successResponse({
      id: exam.id,
      name: exam.name,
      category: exam.category,
      price: exam.price,
      createdAt: exam.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un examen (admin uniquement)
 */
exports.updateExam = async (req, res, next) => {
  try {
    const exam = await LabExam.findByPk(req.params.id);
    
    if (!exam) {
      return res.status(404).json(
        errorResponse('Examen non trouvé', 404)
      );
    }
    
    const { name, category, price, description, isActive } = req.body;
    
    await exam.update({
      name: name || exam.name,
      category: category || exam.category,
      price: price !== undefined ? price : exam.price,
      description: description !== undefined ? description : exam.description,
      isActive: isActive !== undefined ? isActive : exam.isActive
    });
    
    res.json(successResponse(exam));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES DEMANDES ==========

/**
 * Liste toutes les demandes de laboratoire
 */
exports.getAllRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, patientId, doctorId, status, date, search } = req.query;
    const user = req.user;
    
    // Validation et limitation de la pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offset = (pageNum - 1) * limitNum;
    
    // Validation du patientId si fourni
    if (patientId) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
      if (!isValidUUID) {
        return res.status(400).json(
          errorResponse('Format UUID invalide pour patientId', 400)
        );
      }
    }
    
    const where = {};
    
    // Filtrage selon le rôle
    if (user.role === 'lab') {
      where.paymentId = { [Op.ne]: null };
      // Lab: accepter le paramètre status pour le dashboard (pending ET sent_to_doctor)
      where.status = status || 'pending';
      // Le filtre date est ignoré pour le lab (voir toutes les demandes, peu importe la date)
    } else if (user.role === 'doctor') {
      // Doctor: voir uniquement ses propres demandes ou celles de ses patients assignés
      if (patientId) {
        // Vérifier que le patient est assigné au médecin
        const { DoctorAssignment } = require('../models');
        const assignment = await DoctorAssignment.findOne({
          where: {
            patientId,
            doctorId: user.id,
            status: { [Op.in]: ['assigned', 'in_consultation', 'completed'] }
          }
        });
        if (!assignment) {
          return res.status(403).json(
            errorResponse('Patient non assigné à ce médecin', 403)
          );
        }
        // Filtrer par patient et médecin
        where.patientId = patientId;
        where.doctorId = user.id;
      } else {
        // Toujours filtrer par médecin
        where.doctorId = user.id;
      }
      // Le médecin peut filtrer par status s'il est fourni
      if (status) {
        where.status = status;
      }
    } else {
      // Reception et Admin: voir les demandes en cours (pending) par défaut.
      // Les "Fini et envoyé au médecin" (sent_to_doctor) ne doivent pas apparaître dans la liste lab.
      if (patientId) {
        where.patientId = patientId;
      }
      if (doctorId) {
        where.doctorId = doctorId;
      }
      if (status) {
        where.status = status;
      } else {
        where.status = 'pending';
      }
    }
    // Appliquer le filtre date si fourni
    // - pending: createdAt (date de création de la demande)
    // - sent_to_doctor: updatedAt (date d'envoi au médecin) pour le dashboard "Total aujourd'hui"
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      const dateRange = { [Op.between]: [startDate, endDate] };
      where[status === 'sent_to_doctor' ? 'updatedAt' : 'createdAt'] = dateRange;
    }
    
    // Recherche textuelle dans les examens
    const examWhere = {};
    if (search) {
      examWhere[Op.or] = [
        { '$labExam.name$': { [Op.like]: `%${search}%` } },
        { '$labExam.category$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Debug: console.log les filtres appliqués
    console.log('🔬 === LAB REQUESTS DEBUG ===');
    console.log('🔬 User role:', user.role);
    console.log('🔬 Query params:', { page, limit, patientId, doctorId, status, date, search });
    console.log('🔬 Where clause final:', JSON.stringify(where, null, 2));
    
    const { count, rows } = await LabRequest.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName'],
          ...(search && !patientId ? {
            where: {
              [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { vitalisId: { [Op.like]: `%${search}%` } }
              ]
            }
          } : {})
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email'],
          ...(search && !doctorId ? {
            where: {
              name: { [Op.like]: `%${search}%` }
            }
          } : {})
        },
        {
          model: LabRequestExam,
          as: 'exams',
          include: [{
            model: LabExam,
            as: 'labExam',
            attributes: ['id', 'name', 'category', 'price'],
            where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
            required: Object.keys(examWhere).length > 0 ? false : false
          }]
        },
        {
          model: LabResult,
          as: 'results',
          attributes: ['id'],
          required: false,
          limit: 1,
          order: [['createdAt', 'DESC']]
        },
        // Pour le rôle lab, inclure Payment pour vérifier le statut
        ...(user.role === 'lab' ? [{
          model: Payment,
          as: 'payment',
          attributes: ['id', 'status'],
          where: { status: 'paid' },
          required: true
        }] : [])
      ],
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    console.log('🔬 Total count from query:', count);
    console.log('🔬 Rows found:', rows.length);
    
    if (rows.length > 0) {
      console.log('🔬 First request found:', {
        id: rows[0].id,
        status: rows[0].status,
        paymentId: rows[0].paymentId,
        createdAt: rows[0].createdAt,
        hasPayment: !!rows[0].payment,
        paymentStatus: rows[0].payment ? rows[0].payment.status : 'N/A'
      });
    } else {
      console.log('🔬 ⚠️ Aucune demande trouvée');
      // Vérifier pourquoi
      const allRequests = await LabRequest.findAll({
        attributes: ['id', 'status', 'paymentId', 'createdAt'],
        include: [{
          model: Payment,
          as: 'payment',
          attributes: ['id', 'status'],
          required: false
        }],
        limit: 5
      });
      console.log('🔬 Toutes les demandes dans la base (échantillon):', allRequests.map(r => ({
        id: r.id,
        status: r.status,
        paymentId: r.paymentId,
        paymentStatus: r.payment ? r.payment.status : 'N/A'
      })));
    }
    console.log('🔬 ================================');
    
    // Formater les résultats
    const requests = rows.map(request => ({
      id: request.id,
      patientId: request.patientId,
      doctorId: request.doctorId,
      consultationId: request.consultationId,
      status: request.status,
      totalAmount: request.totalAmount ? request.totalAmount.toString() : request.exams.reduce((sum, exam) => 
        sum + parseFloat(exam.price || 0), 0
      ).toString(),
      paymentId: request.paymentId, // Inclure le paymentId
      notes: null, // Le modèle LabRequest n'a pas de champ notes pour l'instant
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      exams: request.exams.map(exam => ({
        id: exam.labExam.id,
        name: exam.labExam.name,
        category: exam.labExam.category,
        price: exam.price ? exam.price.toString() : exam.labExam.price.toString()
      })),
      doctor: request.doctor ? {
        id: request.doctor.id,
        name: request.doctor.name,
        email: request.doctor.email
      } : null,
      patient: request.patient ? {
        id: request.patient.id,
        firstName: request.patient.firstName,
        lastName: request.patient.lastName,
        vitalisId: request.patient.vitalisId
      } : null,
      resultId: request.results && request.results.length > 0 ? request.results[0].id : null
    }));
    
    res.json(paginatedResponse({ requests }, { page: pageNum, limit: limitNum }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'une demande
 */
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await LabRequest.findByPk(req.params.id, {
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
          model: Payment,
          as: 'payment',
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
          required: false,
          include: [{
            model: User,
            as: 'validator',
            attributes: ['id', 'name', 'email'],
            required: false
          }]
        }
      ]
    });
    
    if (!request) {
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }
    
    res.json(successResponse({
      id: request.id,
      patient: request.patient,
      doctor: request.doctor,
      consultation: request.consultation,
      status: request.status,
      exams: request.exams.map(exam => ({
        id: exam.labExam.id,
        name: exam.labExam.name,
        category: exam.labExam.category,
        price: exam.price
      })),
      totalAmount: request.totalAmount,
      payment: request.payment,
      results: request.results && request.results.length > 0 ? request.results[0] : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer une nouvelle demande de laboratoire
 */
exports.createRequest = async (req, res, next) => {
  try {
    const { patientId, doctorId, consultationId, examIds, notes } = req.body;
    
    if (!patientId || !doctorId || !examIds || !Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json(
        errorResponse('patientId, doctorId et examIds (tableau non vide) sont requis', 400)
      );
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier que le médecin existe
    const doctor = await User.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json(
        errorResponse('Médecin non trouvé', 404)
      );
    }
    
    // Vérifier que le dossier n'est pas archivé
    // Si consultationId est fourni, vérifier le dossier associé
    if (consultationId) {
      const dossier = await ConsultationDossier.findOne({
        where: {
          consultationId: consultationId
        }
      });
      
      if (dossier && dossier.status === 'archived') {
        return res.status(400).json(
          errorResponse('Impossible de créer une demande de laboratoire pour un dossier archivé', 400)
        );
      }
    } else {
      // Si pas de consultationId, vérifier s'il existe un dossier actif (non archivé) pour ce patient et ce médecin
      const activeDossier = await ConsultationDossier.findOne({
        where: {
          patientId,
          doctorId,
          status: { [Op.in]: ['active', 'completed'] }
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Si aucun dossier actif n'existe, on permet quand même la création
      // (le système permet plusieurs demandes pour un même patient)
      // Mais si le dernier dossier est archivé, on empêche
      if (activeDossier && activeDossier.status === 'archived') {
        return res.status(400).json(
          errorResponse('Impossible de créer une demande de laboratoire. Le dossier du patient est archivé.', 400)
        );
      }
    }
    
    // Vérifier que tous les examens existent et sont actifs
    const exams = await LabExam.findAll({
      where: {
        id: { [Op.in]: examIds },
        isActive: true
      }
    });
    
    if (exams.length !== examIds.length) {
      return res.status(400).json(
        errorResponse('Un ou plusieurs examens sont invalides ou inactifs', 400)
      );
    }
    
    // Calculer le montant total
    const totalAmount = exams.reduce((sum, exam) => sum + parseFloat(exam.price), 0);
    
    // Créer automatiquement un paiement pour cette demande (montant de base toujours stocké)
    const payment = await Payment.create({
      patientId,
      amount: totalAmount,
      method: 'cash', // Par défaut, sera modifié à la réception
      status: 'pending',
      type: 'lab',
      reference: `LAB-${Date.now()}`,
      relatedId: null, // Sera mis à jour après création de la demande
      createdBy: doctorId, // Le médecin qui crée la demande
      amountBase: totalAmount
    });
    
    // Créer la demande avec le paymentId
    const labRequest = await LabRequest.create({
      patientId,
      doctorId,
      consultationId: consultationId || null,
      status: 'pending',
      totalAmount,
      paymentId: payment.id
    });
    
    // Mettre à jour le paiement avec le relatedId
    await payment.update({
      relatedId: labRequest.id
    });
    
    // Créer les enregistrements dans la table de liaison
    await Promise.all(
      exams.map(exam =>
        LabRequestExam.create({
          labRequestId: labRequest.id,
          labExamId: exam.id,
          price: exam.price
        })
      )
    );
    
    // Récupérer la demande avec les relations
    const requestWithRelations = await LabRequest.findByPk(labRequest.id, {
      include: [
        {
          model: LabRequestExam,
          as: 'exams',
          include: [{
            model: LabExam,
            as: 'labExam'
          }]
        },
        {
          model: Payment,
          as: 'payment',
          required: false
        }
      ]
    });
    
    res.status(201).json(successResponse({
      id: requestWithRelations.id,
      patientId: requestWithRelations.patientId,
      doctorId: requestWithRelations.doctorId,
      status: requestWithRelations.status,
      totalAmount: requestWithRelations.totalAmount,
      payment: requestWithRelations.payment ? {
        id: requestWithRelations.payment.id,
        amount: requestWithRelations.payment.amount,
        method: requestWithRelations.payment.method,
        status: requestWithRelations.payment.status,
        type: requestWithRelations.payment.type,
        reference: requestWithRelations.payment.reference
      } : null,
      exams: requestWithRelations.exams.map(exam => ({
        id: exam.labExam.id,
        name: exam.labExam.name,
        category: exam.labExam.category,
        price: exam.price
      })),
      createdAt: requestWithRelations.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner une demande à un technicien
 */
exports.assignRequest = async (req, res, next) => {
  try {
    const { labTechnicianId } = req.body;
    
    if (!labTechnicianId) {
      return res.status(400).json(
        errorResponse('labTechnicianId est requis', 400)
      );
    }
    
    const request = await LabRequest.findByPk(req.params.id, {
      include: [{
        model: Payment,
        as: 'payment',
        required: false
      }]
    });
    
    if (!request) {
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }
    
    // Vérifier que la demande a un paiement et que ce paiement est payé
    if (!request.paymentId) {
      return res.status(400).json(
        errorResponse('La demande doit avoir un paiement pour être assignée', 400)
      );
    }
    
    if (!request.payment) {
      return res.status(400).json(
        errorResponse('Le paiement associé à cette demande n\'existe plus', 400)
      );
    }
    
    if (request.payment.status !== 'paid') {
      return res.status(400).json(
        errorResponse(`Cette demande n'est pas encore payée. Statut du paiement: ${request.payment.status}`, 400)
      );
    }
    
    // Vérifier que le technicien existe et a le rôle 'lab'
    const technician = await User.findByPk(labTechnicianId);
    if (!technician || technician.role !== 'lab') {
      return res.status(400).json(
        errorResponse('Technicien invalide ou n\'a pas le rôle lab', 400)
      );
    }
    
    if (!technician.isActive) {
      return res.status(400).json(
        errorResponse('Technicien inactif', 400)
      );
    }
    
    await request.update({ labTechnicianId });
    
    res.json(successResponse(null, 'Demande assignée avec succès'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES RÉSULTATS ==========

/**
 * Liste tous les résultats de laboratoire
 */
exports.getAllResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, patientId, doctorId, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (patientId) {
      where['$labRequest.patientId$'] = patientId;
    }
    if (doctorId) {
      where['$labRequest.doctorId$'] = doctorId;
    }
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await LabResult.findAndCountAll({
      where,
      include: [
        {
          model: LabRequest,
          as: 'labRequest',
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
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['completedAt', 'DESC']],
      distinct: true
    });
    
    const results = rows.map(result => ({
      id: result.id,
      labRequest: {
        id: result.labRequest.id,
        patient: result.labRequest.patient,
        doctor: result.labRequest.doctor
      },
      status: result.status,
      completedAt: result.completedAt
    }));
    
    res.json(paginatedResponse({ results }, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'un résultat
 */
exports.getResultById = async (req, res, next) => {
  try {
    const result = await LabResult.findByPk(req.params.id, {
      include: [
        {
          model: LabRequest,
          as: 'labRequest',
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
              model: LabRequestExam,
              as: 'exams',
              include: [{
                model: LabExam,
                as: 'labExam'
              }]
            }
          ]
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });
    
    if (!result) {
      return res.status(404).json(
        errorResponse('Résultat non trouvé', 404)
      );
    }
    
    res.json(successResponse({
      id: result.id,
      labRequest: {
        id: result.labRequest.id,
        patient: result.labRequest.patient,
        doctor: result.labRequest.doctor,
        exams: result.labRequest.exams.map(exam => ({
          id: exam.labExam.id,
          name: exam.labExam.name,
          category: exam.labExam.category
        }))
      },
      status: result.status,
      results: result.results,
      technicianNotes: result.technicianNotes,
      validatedBy: result.validator,
      validatedAt: result.validatedAt,
      sentAt: result.sentAt,
      completedAt: result.completedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer ou mettre à jour un résultat
 */
exports.createOrUpdateResult = async (req, res, next) => {
  try {
    const { labRequestId, results, technicianNotes } = req.body;
    const user = req.user;
    
    if (!labRequestId || !results) {
      return res.status(400).json(
        errorResponse('labRequestId et results sont requis', 400)
      );
    }
    
    // Vérifier que la demande existe
    const labRequest = await LabRequest.findByPk(labRequestId, {
      include: [
        {
          model: User,
          as: 'labTechnician'
        },
        {
          model: Payment,
          as: 'payment',
          required: false
        }
      ]
    });
    
    if (!labRequest) {
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }
    
    // Vérifier que la demande est payée
    if (!labRequest.paymentId) {
      return res.status(400).json(
        errorResponse('Cette demande n\'a pas de paiement associé', 400)
      );
    }
    
    if (!labRequest.payment) {
      return res.status(400).json(
        errorResponse('Le paiement associé à cette demande n\'existe plus', 400)
      );
    }
    
    if (labRequest.payment.status !== 'paid') {
      return res.status(400).json(
        errorResponse(`Cette demande n'est pas encore payée. Elle ne peut pas être traitée pour le moment. Statut du paiement: ${labRequest.payment.status}`, 400)
      );
    }
    
    // Vérifier que l'utilisateur est le technicien assigné ou admin
    if (user.role !== 'admin' && labRequest.labTechnicianId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous n\'êtes pas autorisé à modifier ce résultat', 403)
      );
    }
    
    // Chercher un résultat existant
    let labResult = await LabResult.findOne({
      where: { labRequestId }
    });
    
    if (labResult) {
      // Mettre à jour
      await labResult.update({
        results,
        technicianNotes: technicianNotes || labResult.technicianNotes,
        status: 'draft'
      });
    } else {
      // Créer
      labResult = await LabResult.create({
        labRequestId,
        results,
        technicianNotes: technicianNotes || null,
        status: 'draft'
      });
    }
    
    res.status(201).json(successResponse({
      id: labResult.id,
      labRequestId: labResult.labRequestId,
      status: labResult.status,
      completedAt: labResult.completedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Valider un résultat (lab uniquement)
 */
exports.validateResult = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.role !== 'lab' && user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Seuls les techniciens de laboratoire peuvent valider les résultats', 403)
      );
    }
    
    const result = await LabResult.findByPk(req.params.id);
    if (!result) {
      return res.status(404).json(
        errorResponse('Résultat non trouvé', 404)
      );
    }
    
    await result.update({
      status: 'validated',
      validatedBy: user.id,
      validatedAt: new Date()
    });
    
    res.json(successResponse(null, 'Résultat validé avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Envoyer un résultat au médecin
 */
exports.sendResult = async (req, res, next) => {
  try {
    const result = await LabResult.findByPk(req.params.id, {
      include: [{
        model: LabRequest,
        as: 'labRequest'
      }]
    });
    
    if (!result) {
      return res.status(404).json(
        errorResponse('Résultat non trouvé', 404)
      );
    }
    
    if (result.status !== 'validated') {
      return res.status(400).json(
        errorResponse('Le résultat doit être validé avant d\'être envoyé', 400)
      );
    }
    
    // Mettre à jour le résultat
    await result.update({
      status: 'sent',
      sentAt: new Date()
    });
    
    // Mettre à jour la demande
    await result.labRequest.update({
      status: 'sent_to_doctor'
    });
    
    res.json(successResponse(null, 'Résultat envoyé au médecin'));
  } catch (error) {
    next(error);
  }
};

/**
 * Générer le PDF d'un résultat de laboratoire (id = labRequestId)
 */
exports.getRequestPDF = async (req, res, next) => {
  const pdfService = require('../services/pdfService');
  try {
    const labRequestId = req.params.id;
    const labRequest = await LabRequest.findByPk(labRequestId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: require('../models').InsuranceEstablishment, as: 'insuranceEstablishment', required: false }]
        },
        {
          model: User,
          as: 'doctor',
          attributes: { exclude: ['password'] }
        },
        {
          model: LabResult,
          as: 'results',
          include: [{
            model: User,
            as: 'validator',
            attributes: ['id', 'name'],
            include: [{ model: require('../models').LabNumber, as: 'labNumber', attributes: ['number'], required: false }],
            required: false
          }]
        }
      ]
    });

    if (!labRequest) {
      return res.status(404).json(
        errorResponse('Demande de laboratoire non trouvée', 404)
      );
    }

    const resultsList = labRequest.results
      ? (Array.isArray(labRequest.results) ? labRequest.results : [labRequest.results])
      : [];
    const labResult = resultsList.length > 0
      ? resultsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;

    if (!labResult) {
      return res.status(404).json(
        errorResponse('Aucun résultat validé pour cette demande', 404)
      );
    }

    const patient = labRequest.patient;
    const doctor = labRequest.doctor;

    if (!patient || !doctor) {
      return res.status(404).json(
        errorResponse('Patient ou médecin introuvable', 404)
      );
    }

    const pdf = await pdfService.generateLabResultPDF(labResult, labRequest, patient, doctor);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="resultat-lab-${labRequestId}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};
