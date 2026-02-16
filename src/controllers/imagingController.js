const { ImagingExam, ImagingRequest, ImagingRequestExam, Patient, User, Consultation, Payment, ConsultationDossier, DoctorAssignment } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');

// ========== ROUTES EXAMENS ==========

/**
 * Liste tous les examens d'imagerie
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
    
    const exams = await ImagingExam.findAll({
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
    
    const exam = await ImagingExam.create({
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
    const exam = await ImagingExam.findByPk(req.params.id);
    
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
 * Liste toutes les demandes d'imagerie
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
      // Lab: voir uniquement les demandes avec paymentId
      where.paymentId = { [Op.ne]: null };
      // Le lab peut voir les demandes 'pending' ou 'sent_to_doctor' selon le paramètre status
      if (status && (status === 'pending' || status === 'sent_to_doctor')) {
        where.status = status;
      } else {
        // Par défaut, montrer les demandes 'pending'
        where.status = 'pending';
      }
      // Le filtre date est ignoré pour le lab (voir toutes les demandes, peu importe la date)
    } else if (user.role === 'doctor') {
      // Doctor: voir uniquement ses propres demandes ou celles de ses patients assignés
      if (patientId) {
        // Vérifier que le patient est assigné au médecin
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
      // Reception et Admin: voir toutes les demandes avec filtres optionnels
      if (patientId) {
        where.patientId = patientId;
      }
      if (doctorId) {
        where.doctorId = doctorId;
      }
      if (status) {
        where.status = status;
      }
    }
    // Pour le rôle lab, ne jamais appliquer le filtre de date
    // car on veut voir toutes les demandes, peu importe leur date de création
    if (date && user.role !== 'lab') {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }
    // Note: Pour le rôle lab, le paramètre date est complètement ignoré
    
    // Recherche textuelle dans les examens
    const examWhere = {};
    if (search) {
      examWhere[Op.or] = [
        { '$imagingExam.name$': { [Op.like]: `%${search}%` } },
        { '$imagingExam.category$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Debug: console.log les filtres appliqués
    console.log('🔬 === IMAGING REQUESTS DEBUG ===');
    console.log('🔬 User role:', user.role);
    console.log('🔬 Query params:', { page, limit, patientId, doctorId, status, date, search });
    console.log('🔬 Where clause final:', JSON.stringify(where, null, 2));
    
    const { count, rows } = await ImagingRequest.findAndCountAll({
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
          model: ImagingRequestExam,
          as: 'exams',
          include: [{
            model: ImagingExam,
            as: 'imagingExam',
            attributes: ['id', 'name', 'category', 'price'],
            where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
            required: Object.keys(examWhere).length > 0 ? false : false
          }]
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
      console.log('🔬 ⚠️ Aucune demande trouvée avec ces critères');
      // Vérifier pourquoi
      const allRequests = await ImagingRequest.findAll({
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
      notes: null, // Le modèle ImagingRequest n'a pas de champ notes pour l'instant
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      exams: request.exams.map(exam => ({
        id: exam.imagingExam.id,
        name: exam.imagingExam.name,
        category: exam.imagingExam.category,
        price: exam.price ? exam.price.toString() : exam.imagingExam.price.toString()
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
      resultId: request.results ? request.id : null // Si results existe, utiliser l'ID de la demande
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
    const request = await ImagingRequest.findByPk(req.params.id, {
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
          model: User,
          as: 'labTechnician',
          attributes: ['id', 'name', 'email'],
          required: false
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
          model: ImagingRequestExam,
          as: 'exams',
          include: [{
            model: ImagingExam,
            as: 'imagingExam'
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
        id: exam.imagingExam.id,
        name: exam.imagingExam.name,
        category: exam.imagingExam.category,
        price: exam.price
      })),
      totalAmount: request.totalAmount,
      payment: request.payment,
      results: request.results,
      labTechnician: request.labTechnician,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer une nouvelle demande d'imagerie
 */
exports.createRequest = async (req, res, next) => {
  try {
    const { patientId, doctorId, consultationId, examIds, notes } = req.body;
    
    if (!patientId || !doctorId || !examIds || !Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json(
        errorResponse('patientId, doctorId et examIds (tableau non vide) sont requis', 400)
      );
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    const doctor = await User.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json(
        errorResponse('Médecin non trouvé', 404)
      );
    }
    
    // Vérifier que le dossier n'est pas archivé
    if (consultationId) {
      const dossier = await ConsultationDossier.findOne({
        where: {
          consultationId: consultationId
        }
      });
      
      if (dossier && dossier.status === 'archived') {
        return res.status(400).json(
          errorResponse('Impossible de créer une demande d\'imagerie pour un dossier archivé', 400)
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
      
      // Si le dernier dossier est archivé, on empêche
      if (activeDossier && activeDossier.status === 'archived') {
        return res.status(400).json(
          errorResponse('Impossible de créer une demande d\'imagerie. Le dossier du patient est archivé.', 400)
        );
      }
    }
    
    const exams = await ImagingExam.findAll({
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
    
    const totalAmount = exams.reduce((sum, exam) => sum + parseFloat(exam.price), 0);
    
    // Créer automatiquement un paiement pour cette demande
    const payment = await Payment.create({
      patientId,
      amount: totalAmount,
      method: 'cash', // Par défaut, sera modifié à la réception
      status: 'pending',
      type: 'imaging',
      reference: `IMG-${Date.now()}`,
      relatedId: null, // Sera mis à jour après création de la demande
      createdBy: doctorId // Le médecin qui crée la demande
    });
    
    // Créer la demande avec le paymentId
    const imagingRequest = await ImagingRequest.create({
      patientId,
      doctorId,
      consultationId: consultationId || null,
      status: 'pending',
      totalAmount,
      results: null,
      paymentId: payment.id
    });
    
    // Mettre à jour le paiement avec le relatedId
    await payment.update({
      relatedId: imagingRequest.id
    });
    
    await Promise.all(
      exams.map(exam =>
        ImagingRequestExam.create({
          imagingRequestId: imagingRequest.id,
          imagingExamId: exam.id,
          price: exam.price
        })
      )
    );
    
    const requestWithRelations = await ImagingRequest.findByPk(imagingRequest.id, {
      include: [{
        model: ImagingRequestExam,
        as: 'exams',
        include: [{
          model: ImagingExam,
          as: 'imagingExam'
        }]
      },
      {
        model: Payment,
        as: 'payment',
        required: false
      }]
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
        id: exam.imagingExam.id,
        name: exam.imagingExam.name,
        category: exam.imagingExam.category,
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
    
    const request = await ImagingRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }
    
    if (!request.paymentId) {
      return res.status(400).json(
        errorResponse('La demande doit avoir un paiement pour être assignée', 400)
      );
    }
    
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

/**
 * Marquer une demande comme terminée et envoyer au médecin
 */
exports.completeRequest = async (req, res, next) => {
  try {
    const { results } = req.body;
    const user = req.user;
    
    if (!results) {
      return res.status(400).json(
        errorResponse('results est requis', 400)
      );
    }
    
    const request = await ImagingRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }
    
    if (!request.paymentId) {
      return res.status(400).json(
        errorResponse('La demande doit avoir un paiement', 400)
      );
    }
    
    if (user.role !== 'admin' && request.labTechnicianId !== user.id) {
      return res.status(403).json(
        errorResponse('Vous n\'êtes pas autorisé à modifier cette demande', 403)
      );
    }
    
    await request.update({
      status: 'sent_to_doctor',
      results
    });
    
    res.json(successResponse({
      id: request.id,
      status: request.status,
      results: request.results,
      updatedAt: request.updatedAt
    }, 'Résultats envoyés au médecin'));
  } catch (error) {
    next(error);
  }
};
