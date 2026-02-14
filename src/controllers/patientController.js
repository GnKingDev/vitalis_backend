const { 
  Patient, 
  Bed, 
  Consultation, 
  User, 
  LabRequest, 
  LabRequestExam, 
  LabExam, 
  LabResult,
  ImagingRequest,
  ImagingRequestExam,
  ImagingExam,
  Prescription,
  PrescriptionItem,
  Payment,
  ConsultationDossier,
  DoctorAssignment
} = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { generateVitalisId } = require('../utils/vitalisIdGenerator');
const { calculateAge } = require('../utils/ageCalculator');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

/**
 * Liste tous les patients avec pagination et filtres
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, date } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { vitalisId: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (date) {
      where.createdAt = {
        [Op.gte]: new Date(date),
        [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    
    const { count, rows } = await Patient.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Bed,
          as: 'bed',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Ajouter l'âge à chaque patient
    const patients = rows.map(patient => ({
      ...patient.toJSON(),
      age: calculateAge(patient.dateOfBirth)
    }));
    
    res.json(paginatedResponse(patients, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'un patient
 */
exports.getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        {
          model: Bed,
          as: 'bed',
          required: false
        }
      ]
    });
    
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    const patientData = {
      ...patient.toJSON(),
      age: calculateAge(patient.dateOfBirth)
    };
    
    res.json(successResponse(patientData));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau patient
 */
exports.createPatient = async (req, res, next) => {
  try {
    const vitalisId = await generateVitalisId();
    
    const patient = await Patient.create({
      ...req.body,
      vitalisId
    });
    
    const patientData = {
      ...patient.toJSON(),
      age: calculateAge(patient.dateOfBirth)
    };
    
    res.status(201).json(successResponse(patientData));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un patient
 */
exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    await patient.update(req.body);
    
    const patientData = {
      ...patient.toJSON(),
      age: calculateAge(patient.dateOfBirth)
    };
    
    res.json(successResponse(patientData));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les patients
 */
exports.getPatientStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    const where = {};
    if (date) {
      where.createdAt = {
        [Op.gte]: new Date(date),
        [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    
    const total = await Patient.count({ where });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthCount = await Patient.count({
      where: {
        createdAt: {
          [Op.gte]: thisMonth
        }
      }
    });
    
    const byGender = await Patient.findAll({
      attributes: [
        'gender',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where,
      group: ['gender'],
      raw: true
    });
    
    const byGenderObj = {};
    byGender.forEach(item => {
      byGenderObj[item.gender] = parseInt(item.count);
    });
    
    res.json(successResponse({
      total,
      today: todayCount,
      thisMonth: thisMonthCount,
      byGender: byGenderObj
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Recherche rapide de patients
 */
exports.searchPatients = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json(successResponse([]));
    }
    
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${q}%` } },
          { lastName: { [Op.iLike]: `%${q}%` } },
          { vitalisId: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } }
        ]
      },
      limit: parseInt(limit),
      attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'phone'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse(patients));
  } catch (error) {
    next(error);
  }
};

/**
 * Exporter la liste des patients en Excel (admin uniquement)
 */
exports.exportPatients = async (req, res, next) => {
  try {
    const { search, date } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { vitalisId: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (date) {
      where.createdAt = {
        [Op.gte]: new Date(date),
        [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    
    const patients = await Patient.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    // Créer le fichier Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Patients');
    
    // Définir les colonnes
    worksheet.columns = [
      { header: 'ID Vitalis', key: 'vitalisId', width: 15 },
      { header: 'Nom complet', key: 'fullName', width: 30 },
      { header: 'Date de naissance', key: 'dateOfBirth', width: 15 },
      { header: 'Âge', key: 'age', width: 10 },
      { header: 'Sexe', key: 'gender', width: 10 },
      { header: 'Téléphone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Adresse', key: 'address', width: 40 },
      { header: 'Date d\'enregistrement', key: 'createdAt', width: 20 }
    ];
    
    // Style de l'en-tête
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Ajouter les données
    patients.forEach(patient => {
      worksheet.addRow({
        vitalisId: patient.vitalisId,
        fullName: `${patient.firstName} ${patient.lastName}`,
        dateOfBirth: patient.dateOfBirth,
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender === 'M' ? 'Masculin' : 'Féminin',
        phone: patient.phone,
        email: patient.email || '',
        address: patient.address || '',
        createdAt: patient.createdAt
      });
    });
    
    // Générer le buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=patients-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer l'historique complet d'un patient
 */
exports.getPatientHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const userRole = req.user.role;
    
    // Récupérer le patient
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    const patientData = {
      ...patient.toJSON(),
      age: calculateAge(patient.dateOfBirth)
    };
    
    // Récupérer les consultations
    const consultations = await Consultation.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les demandes de laboratoire (filtré pour réception)
    const labRequests = userRole === 'reception' ? [] : await LabRequest.findAll({
      where: { patientId },
      include: [
        {
          model: LabRequestExam,
          as: 'exams',
          include: [
            {
              model: LabExam,
              as: 'labExam',
              attributes: ['id', 'name', 'category']
            }
          ]
        },
        {
          model: LabResult,
          as: 'results',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les demandes d'imagerie (filtré pour réception)
    const imagingRequests = userRole === 'reception' ? [] : await ImagingRequest.findAll({
      where: { patientId },
      include: [
        {
          model: ImagingRequestExam,
          as: 'exams',
          include: [
            {
              model: ImagingExam,
              as: 'imagingExam',
              attributes: ['id', 'name', 'category']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les ordonnances
    const prescriptions = await Prescription.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department']
        },
        {
          model: PrescriptionItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les paiements
    const payments = await Payment.findAll({
      where: { patientId },
      attributes: ['id', 'amount', 'type', 'status', 'method', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les dossiers de consultation
    const dossiers = await ConsultationDossier.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department']
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse({
      patient: patientData,
      consultations,
      labRequests,
      imagingRequests,
      prescriptions,
      payments,
      dossiers
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les dossiers de consultation d'un patient (avec pagination)
 */
exports.getPatientDossiers = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const user = req.user;
    const { 
      status, 
      includeConsultation, 
      includeLabRequests, 
      includePrescriptions,
      page = 1,
      limit = 10
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Vérifier les permissions
    if (user.role === 'reception') {
      return res.status(403).json(
        errorResponse('Accès refusé. Les réceptionnistes ne peuvent pas accéder aux dossiers.', 403)
      );
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier les permissions pour les médecins
    if (user.role === 'doctor') {
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
          errorResponse('Accès refusé. Ce patient n\'est pas assigné à votre service.', 403)
        );
      }
    }
    
    const where = { patientId };
    
    // Filtrer par statut
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Récupérer les dossiers avec pagination
    const { count, rows: dossiers } = await ConsultationDossier.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'archivedByUser',
          attributes: ['id', 'name'],
          required: false
        },
        ...(includeConsultation !== 'false' ? [{
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'symptoms', 'diagnosis', 'notes']
        }] : [])
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les IDs des demandes labo et ordonnances pour chaque dossier
    const dossiersWithData = await Promise.all(dossiers.map(async (dossier) => {
      const consultationId = dossier.consultationId;
      
      const dossierData = {
        ...dossier.toJSON(),
        labRequestIds: [],
        prescriptionIds: []
      };
      
      if (includeLabRequests !== 'false' && consultationId) {
        const labRequests = await LabRequest.findAll({
          where: { consultationId },
          attributes: ['id']
        });
        dossierData.labRequestIds = labRequests.map(r => r.id);
      }
      
      if (includePrescriptions !== 'false' && consultationId) {
        const prescriptions = await Prescription.findAll({
          where: { consultationId },
          attributes: ['id']
        });
        dossierData.prescriptionIds = prescriptions.map(p => p.id);
      }
      
      return dossierData;
    }));
    
    res.json(paginatedResponse(
      { dossiers: dossiersWithData },
      { page: parseInt(page), limit: parseInt(limit) },
      count
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les détails complets d'un dossier spécifique
 */
exports.getDossierById = async (req, res, next) => {
  try {
    const { id: patientId, dossierId } = req.params;
    const user = req.user;
    
    // Vérifier les permissions
    if (user.role === 'reception') {
      return res.status(403).json(
        errorResponse('Accès refusé', 403)
      );
    }
    
    const dossier = await ConsultationDossier.findOne({
      where: {
        id: dossierId,
        patientId
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'phone']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'archivedByUser',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false
        }
      ]
    });
    
    if (!dossier) {
      return res.status(404).json(
        errorResponse('Dossier non trouvé', 404)
      );
    }
    
    // Vérifier les permissions pour les médecins
    if (user.role === 'doctor' && dossier.doctorId !== user.id) {
      return res.status(403).json(
        errorResponse('Accès refusé. Ce dossier ne vous appartient pas.', 403)
      );
    }
    
    // Récupérer les demandes de laboratoire
    const labRequests = await LabRequest.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: dossier.doctorId,
        ...(dossier.consultationId ? { consultationId: dossier.consultationId } : {})
      },
      include: [
        {
          model: LabRequestExam,
          as: 'exams',
          include: [{
            model: LabExam,
            as: 'labExam',
            attributes: ['id', 'name', 'category', 'price']
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
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les demandes d'imagerie
    const imagingRequests = await ImagingRequest.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: dossier.doctorId,
        ...(dossier.consultationId ? { consultationId: dossier.consultationId } : {})
      },
      include: [{
        model: ImagingRequestExam,
        as: 'exams',
        include: [{
          model: ImagingExam,
          as: 'imagingExam',
          attributes: ['id', 'name', 'category', 'price']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Récupérer les ordonnances
    const prescriptions = await Prescription.findAll({
      where: {
        patientId: dossier.patientId,
        doctorId: dossier.doctorId,
        ...(dossier.consultationId ? { consultationId: dossier.consultationId } : {})
      },
      include: [{
        model: PrescriptionItem,
        as: 'items'
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse({
      id: dossier.id,
      patientId: dossier.patientId,
      patient: dossier.patient,
      doctorId: dossier.doctorId,
      doctor: dossier.doctor,
      consultationId: dossier.consultationId,
      consultation: dossier.consultation,
      status: dossier.status,
      labRequests: labRequests.map(req => ({
        id: req.id,
        exams: req.exams.map(exam => ({
          id: exam.labExam.id,
          name: exam.labExam.name,
          category: exam.labExam.category,
          price: exam.price
        })),
        status: req.status,
        result: req.results && req.results.length > 0 ? {
          id: req.results[0].id,
          results: req.results[0].results,
          technicianNotes: req.results[0].technicianNotes,
          status: req.results[0].status,
          validatedBy: req.results[0].validator,
          validatedAt: req.results[0].validatedAt
        } : null
      })),
      imagingRequests: imagingRequests.map(req => ({
        id: req.id,
        exams: req.exams.map(exam => ({
          id: exam.imagingExam.id,
          name: exam.imagingExam.name,
          category: exam.imagingExam.category,
          price: exam.price
        })),
        status: req.status,
        results: req.results
      })),
      prescriptions: prescriptions.map(pres => ({
        id: pres.id,
        items: pres.items,
        status: pres.status
      })),
      createdAt: dossier.createdAt,
      updatedAt: dossier.updatedAt,
      completedAt: dossier.completedAt,
      archivedAt: dossier.archivedAt,
      archivedBy: dossier.archivedByUser
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer toutes les consultations d'un patient
 */
exports.getPatientConsultations = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    
    const consultations = await Consultation.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse(consultations));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer toutes les ordonnances d'un patient
 */
exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    
    const prescriptions = await Prescription.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department']
        },
        {
          model: PrescriptionItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(successResponse(prescriptions));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer la timeline des événements d'un patient
 */
exports.getPatientTimeline = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const userRole = req.user.role;
    const includeLabResults = req.query.includeLabResults !== 'false' && userRole !== 'reception';
    
    const timeline = [];
    
    // Enregistrement du patient
    const patient = await Patient.findByPk(patientId);
    if (patient) {
      timeline.push({
        id: patient.id,
        type: 'registration',
        title: 'Enregistrement du patient',
        description: `Patient enregistré avec l'ID ${patient.vitalisId}`,
        date: patient.createdAt,
        createdBy: null,
        metadata: {}
      });
    }
    
    // Consultations
    const consultations = await Consultation.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    consultations.forEach(consultation => {
      timeline.push({
        id: consultation.id,
        type: 'consultation',
        title: `Consultation avec ${consultation.doctor.name}`,
        description: consultation.diagnosis || consultation.symptoms || 'Consultation médicale',
        date: consultation.createdAt,
        createdBy: {
          id: consultation.doctor.id,
          name: consultation.doctor.name,
          role: consultation.doctor.role
        },
        metadata: {
          consultationId: consultation.id
        }
      });
    });
    
    // Demandes de laboratoire (filtré pour réception)
    if (userRole !== 'reception') {
      const labRequests = await LabRequest.findAll({
        where: { patientId },
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'role']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      labRequests.forEach(request => {
        timeline.push({
          id: request.id,
          type: 'lab_request',
          title: 'Demande d\'examen de laboratoire',
          description: `Demande créée par ${request.doctor.name}`,
          date: request.createdAt,
          createdBy: {
            id: request.doctor.id,
            name: request.doctor.name,
            role: request.doctor.role
          },
          metadata: {
            labRequestId: request.id
          }
        });
      });
      
      // Résultats de laboratoire (si autorisé)
      if (includeLabResults && labRequests.length > 0) {
        const labResults = await LabResult.findAll({
          where: {
            labRequestId: {
              [Op.in]: labRequests.map(r => r.id)
            }
          },
          include: [
            {
              model: LabRequest,
              as: 'labRequest',
              attributes: ['id', 'patientId']
            }
          ],
          order: [['completedAt', 'DESC']]
        });
        
        labResults.forEach(result => {
          timeline.push({
            id: result.id,
            type: 'lab_result',
            title: 'Résultat d\'examen de laboratoire',
            description: `Résultat ${result.status}`,
            date: result.completedAt,
            createdBy: null,
            metadata: {
              labRequestId: result.labRequestId
            }
          });
        });
      }
    }
    
    // Demandes d'imagerie (filtré pour réception)
    if (userRole !== 'reception') {
      const imagingRequests = await ImagingRequest.findAll({
        where: { patientId },
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'role']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      imagingRequests.forEach(request => {
        timeline.push({
          id: request.id,
          type: 'imaging_request',
          title: 'Demande d\'examen d\'imagerie',
          description: `Demande créée par ${request.doctor.name}`,
          date: request.createdAt,
          createdBy: {
            id: request.doctor.id,
            name: request.doctor.name,
            role: request.doctor.role
          },
          metadata: {
            imagingRequestId: request.id
          }
        });
        
        // Résultat d'imagerie si disponible
        if (request.results && request.status === 'sent_to_doctor') {
          timeline.push({
            id: `${request.id}-result`,
            type: 'imaging_result',
            title: 'Résultat d\'examen d\'imagerie',
            description: 'Résultats disponibles',
            date: request.updatedAt,
            createdBy: null,
            metadata: {
              imagingRequestId: request.id
            }
          });
        }
      });
    }
    
    // Ordonnances
    const prescriptions = await Prescription.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    prescriptions.forEach(prescription => {
      timeline.push({
        id: prescription.id,
        type: 'prescription',
        title: 'Ordonnance médicale',
        description: `Prescrite par ${prescription.doctor.name}`,
        date: prescription.createdAt,
        createdBy: {
          id: prescription.doctor.id,
          name: prescription.doctor.name,
          role: prescription.doctor.role
        },
        metadata: {
          prescriptionId: prescription.id
        }
      });
    });
    
    // Paiements
    const payments = await Payment.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    payments.forEach(payment => {
      timeline.push({
        id: payment.id,
        type: 'payment',
        title: `Paiement ${payment.type}`,
        description: `${payment.amount} FCFA - ${payment.method}`,
        date: payment.createdAt,
        createdBy: {
          id: payment.creator.id,
          name: payment.creator.name,
          role: payment.creator.role
        },
        metadata: {
          paymentId: payment.id
        }
      });
    });
    
    // Trier par date (plus récent en premier)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(successResponse(timeline));
  } catch (error) {
    next(error);
  }
};
