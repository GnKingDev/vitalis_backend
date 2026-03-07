const { Patient, Payment, Bed, DoctorAssignment, ConsultationDossier, LabRequest, ImagingRequest, User, InsuranceEstablishment, ConsultationPrice } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { generateVitalisId } = require('../utils/vitalisIdGenerator');
const { calculateAge } = require('../utils/ageCalculator');
const { computePaymentAmount, getPercentagesFromPatient } = require('../utils/paymentAmountHelper');
const { enrichPatientForDisplay } = require('../utils/patientDisplayHelper');
const { Op, Sequelize } = require('sequelize');
const ExcelJS = require('exceljs');

// ========== ROUTES PATIENTS ==========

/**
 * Liste des patients avec filtres
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { vitalisId: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Patient.findAndCountAll({
      where,
      include: [
        {
          model: Bed,
          as: 'bed',
          required: false
        },
        {
          model: InsuranceEstablishment,
          as: 'insuranceEstablishment',
          required: false,
          attributes: ['id', 'name', 'code']
        },
        {
          model: Payment,
          as: 'payments',
          where: { type: 'consultation' },
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1
        },
        {
          model: DoctorAssignment,
          as: 'doctorAssignments',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }],
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM doctor_assignments da WHERE da.patientId = \`Patient\`.\`id\` AND da.status IN ('assigned','in_consultation'))`),
          'ASC'
        ],
        ['createdAt', 'DESC']
      ],
      distinct: true
    });
    
    const patients = rows.map(patient => {
      const payment = patient.payments && patient.payments.length > 0 ? patient.payments[0] : null;
      const rawAssignment = patient.doctorAssignments && patient.doctorAssignments.length > 0 ? patient.doctorAssignments[0] : null;
      // Ne renvoyer que les assignations actives (assigned, in_consultation) — pas les completed (dossier archivé)
      const assignment = rawAssignment && ['assigned', 'in_consultation'].includes(rawAssignment.status)
        ? rawAssignment
        : null;
      const base = enrichPatientForDisplay(patient);
      // Pour la liste : assurance/remise du paiement affiché (ce dossier), pas du profil patient
      let paymentCoveragePercent = null;
      let paymentDiscountPercent = null;
      if (payment && payment.amountBase != null && Number(payment.amountBase) > 0) {
        const baseAmount = Number(payment.amountBase);
        if (payment.insuranceDeduction != null) {
          paymentCoveragePercent = Math.round((Number(payment.insuranceDeduction) / baseAmount) * 100);
        }
        if (payment.discountDeduction != null) {
          paymentDiscountPercent = Math.round((Number(payment.discountDeduction) / baseAmount) * 100);
        }
      }
      return {
        ...base,
        id: patient.id,
        vitalisId: patient.vitalisId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        bed: patient.bed ? {
          id: patient.bed.id,
          number: patient.bed.number,
          type: patient.bed.type
        } : null,
        payment: payment ? {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          coveragePercent: paymentCoveragePercent,
          discountPercent: paymentDiscountPercent
        } : null,
        assignment: assignment ? {
          id: assignment.id,
          doctor: assignment.doctor,
          status: assignment.status
        } : null,
        createdAt: patient.createdAt
      };
    });
    
    // Calculer les statistiques (withPayment = patients distincts avec paiement payé)
    const stats = {
      total: count,
      withPayment: await Patient.count({
        where,
        include: [{
          model: Payment,
          as: 'payments',
          where: { type: 'consultation', status: 'paid' },
          required: true
        }],
        distinct: true
      }),
      assigned: await DoctorAssignment.count({
        where: { status: { [Op.in]: ['assigned', 'in_consultation'] } },
        include: [{
          model: Patient,
          as: 'patient',
          where: date ? {
            createdAt: where.createdAt
          } : {}
        }],
        distinct: true
      })
    };
    
    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        stats
      }
    });
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
        },
        {
          model: InsuranceEstablishment,
          as: 'insuranceEstablishment',
          required: false,
          attributes: ['id', 'name', 'code']
        },
        {
          model: Payment,
          as: 'payments',
          where: { type: 'consultation' },
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1
        },
        {
          model: DoctorAssignment,
          as: 'doctorAssignments',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }],
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ]
    });
    
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    const payment = patient.payments && patient.payments.length > 0 ? patient.payments[0] : null;
    const assignment = patient.doctorAssignments && patient.doctorAssignments.length > 0 ? patient.doctorAssignments[0] : null;
    const base = enrichPatientForDisplay(patient);
    
    res.json(successResponse({
      ...base,
      id: patient.id,
      vitalisId: patient.vitalisId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      age: calculateAge(patient.dateOfBirth),
      bed: patient.bed,
      payment: payment,
      assignment: assignment ? {
        id: assignment.id,
        doctor: assignment.doctor,
        status: assignment.status
      } : null,
      createdAt: patient.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistrer un nouveau patient avec paiement et optionnellement assignation
 */
exports.registerPatient = async (req, res, next) => {
  try {
    // Debug inscription : ce que le front envoie
    console.log('========== INSCRIPTION PATIENT (register) ==========');
    console.log('req.body (clés):', Object.keys(req.body || {}));
    console.log('req.body.insurance:', JSON.stringify(req.body?.insurance, null, 2));
    console.log('req.body.discount:', JSON.stringify(req.body?.discount, null, 2));
    console.log('Content-Type:', req.get('Content-Type'));

    const { firstName, lastName, dateOfBirth, gender, phone, email, address, emergencyContact, payment, bedId, assignDoctor, doctorId, insurance, discount } = req.body;
    const user = req.user;

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone || !payment) {
      return res.status(400).json(
        errorResponse('firstName, lastName, dateOfBirth, gender, phone et payment sont requis', 400)
      );
    }
    
    if (assignDoctor && !doctorId) {
      return res.status(400).json(
        errorResponse('doctorId est requis si assignDoctor est true', 400)
      );
    }
    
    // Générer l'ID Vitalis
    const vitalisId = await generateVitalisId();
    
    // Champs assurance / remise pour le patient
    const isInsured = insurance?.isInsured === true;
    const insuranceMemberNumberRaw = insurance?.memberNumber ?? insurance?.insuranceMemberNumber;
    const insuranceMemberNumber = isInsured && insuranceMemberNumberRaw != null
      ? String(insuranceMemberNumberRaw).trim() || null
      : null;
    if (isInsured && !insuranceMemberNumber) {
      return res.status(400).json(
        errorResponse('Le numéro d\'identifiant assureur est obligatoire lorsque l\'assurance est activée', 400)
      );
    }
    const insuranceEstablishmentId = isInsured && insurance?.establishmentId ? insurance.establishmentId : null;
    const insuranceCoveragePercent = isInsured && insurance?.coveragePercent != null ? insurance.coveragePercent : null;
    const hasDiscount = discount?.hasDiscount === true;
    const discountPercent = hasDiscount && discount?.discountPercent != null ? discount.discountPercent : null;

    console.log('Assurance/remise extraits -> isInsured:', isInsured, 'establishmentId:', insuranceEstablishmentId, 'coveragePercent:', insuranceCoveragePercent, 'memberNumber:', insuranceMemberNumber, 'hasDiscount:', hasDiscount, 'discountPercent:', discountPercent);

    // Créer le patient
    const patient = await Patient.create({
      vitalisId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email: email || null,
      address: address || null,
      emergencyContact: emergencyContact || null,
      isInsured: !!isInsured,
      insuranceEstablishmentId,
      insuranceCoveragePercent,
      insuranceMemberNumber,
      hasDiscount: !!hasDiscount,
      discountPercent
    });
    
    // Montant de base = consultation + frais lit VIP si applicable
    const consultationPriceRecord = await ConsultationPrice.findOne({ where: { isActive: true } });
    const consultationPriceValue = consultationPriceRecord ? Number(consultationPriceRecord.price) : (Number(payment.amount) || 0);
    let bedRecord = null;
    if (bedId) {
      bedRecord = await Bed.findByPk(bedId);
      if (!bedRecord) {
        return res.status(404).json(errorResponse('Lit non trouvé', 404));
      }
      if (bedRecord.isOccupied) {
        return res.status(400).json(errorResponse('Le lit est déjà occupé', 400));
      }
    }
    const bedAdditionalFee = bedRecord ? (Number(bedRecord.additionalFee) || 0) : 0;
    const baseAmount = consultationPriceValue + bedAdditionalFee;
    const { finalAmount, amountBase, insuranceDeduction, discountDeduction } = computePaymentAmount(baseAmount, {
      insurancePercent: insuranceCoveragePercent || 0,
      discountPercent: discountPercent || 0
    });
    
    const paymentRecord = await Payment.create({
      patientId: patient.id,
      amount: finalAmount,
      method: payment.method,
      status: 'paid',
      type: 'consultation',
      reference: payment.reference || null,
      createdBy: user.id,
      amountBase: amountBase,
      insuranceDeduction: insuranceDeduction,
      discountDeduction: discountDeduction
    });
    
    let bed = null;
    if (bedId && bedRecord) {
      await bedRecord.update({
        isOccupied: true,
        patientId: patient.id
      });
      bed = bedRecord;
    }
    
    let assignment = null;
    if (assignDoctor) {
      const doctor = await User.findByPk(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(400).json(
          errorResponse('Médecin invalide', 400)
        );
      }
      
      // Vérifier qu'il n'y a pas déjà une assignation active
      const existingAssignment = await DoctorAssignment.findOne({
        where: {
          patientId: patient.id,
          status: { [Op.in]: ['assigned', 'in_consultation'] }
        }
      });
      
      if (existingAssignment) {
        return res.status(400).json(
          errorResponse('Le patient a déjà une assignation active', 400)
        );
      }
      
      assignment = await DoctorAssignment.create({
        patientId: patient.id,
        doctorId: doctor.id,
        paymentId: paymentRecord.id,
        status: 'assigned',
        createdBy: user.id
      });
      
      // Créer le dossier de consultation
      await ConsultationDossier.create({
        patientId: patient.id,
        doctorId: doctor.id,
        assignmentId: assignment.id,
        status: 'active'
      });
    }
    
    const createdWithEstablishment = await Patient.findByPk(patient.id, {
      include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
    });
    const patientPayload = enrichPatientForDisplay(createdWithEstablishment);
    res.status(201).json(successResponse({
      patient: {
        ...patientPayload,
        id: patient.id,
        vitalisId: patient.vitalisId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        createdAt: patient.createdAt
      },
      payment: {
        id: paymentRecord.id,
        amount: paymentRecord.amount,
        status: paymentRecord.status,
        type: paymentRecord.type
      },
      bed: bed ? {
        id: bed.id,
        number: bed.number,
        isOccupied: bed.isOccupied
      } : null,
      assignment: assignment ? {
        id: assignment.id,
        doctorId: assignment.doctorId,
        status: assignment.status
      } : null
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistrer un paiement pour un patient existant.
 * Applique assurance puis remise sur le montant de base (sauf pharmacie : remise seule).
 */
exports.createPayment = async (req, res, next) => {
  try {
    const { method, amount, type, reference, relatedId, insurance, discount } = req.body;
    const user = req.user;
    const patientId = req.params.id;
    
    if (!method || amount === undefined || !type) {
      return res.status(400).json(
        errorResponse('method, amount et type sont requis', 400)
      );
    }
    
    if (method === 'orange_money' && !reference) {
      return res.status(400).json(
        errorResponse('reference est requis pour orange_money', 400)
      );
    }
    
    if (insurance?.isInsured === true) {
      const memberNumber = (insurance?.memberNumber ?? insurance?.insuranceMemberNumber ?? '').toString().trim();
      if (!memberNumber) {
        return res.status(400).json(
          errorResponse('Le numéro d\'identifiant assureur est obligatoire lorsque l\'assurance est activée', 400)
        );
      }
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }

    // Mettre à jour les infos assurance/remise du patient uniquement si l'assurance est explicitement fournie
    const patientUpdates = {};
    if (insurance && typeof insurance.isInsured === 'boolean') {
      if (insurance.isInsured === true) {
        const memberNumber = (insurance.memberNumber ?? insurance.insuranceMemberNumber ?? '').toString().trim();
        if (memberNumber) patientUpdates.insuranceMemberNumber = memberNumber;
        if (insurance.establishmentId) patientUpdates.insuranceEstablishmentId = insurance.establishmentId;
        if (insurance.coveragePercent != null) patientUpdates.insuranceCoveragePercent = insurance.coveragePercent;
        patientUpdates.isInsured = true;
      } else {
        patientUpdates.isInsured = false;
        patientUpdates.insuranceMemberNumber = null;
        patientUpdates.insuranceEstablishmentId = null;
        patientUpdates.insuranceCoveragePercent = null;
      }
    }
    if (discount) {
      if (discount.hasDiscount === true) {
        if (discount.discountPercent != null) patientUpdates.discountPercent = discount.discountPercent;
        patientUpdates.hasDiscount = true;
      } else if (discount.hasDiscount === false) {
        patientUpdates.hasDiscount = false;
        patientUpdates.discountPercent = null;
      }
    }
    if (Object.keys(patientUpdates).length > 0) {
      await patient.update(patientUpdates);
    }
    
    let baseAmount = Number(amount) || 0;
    if (type === 'consultation') {
      const consultationPrice = await ConsultationPrice.findOne({ where: { isActive: true } });
      if (consultationPrice) baseAmount = Number(consultationPrice.price);
    }
    const overrides = {};
    if (insurance?.coveragePercent != null) overrides.insurancePercent = insurance.coveragePercent;
    if (discount?.discountPercent != null) overrides.discountPercent = discount.discountPercent;
    const { insurancePercent, discountPercent } = getPercentagesFromPatient(patient, overrides, type !== 'pharmacy');
    const { finalAmount, amountBase, insuranceDeduction, discountDeduction } = computePaymentAmount(baseAmount, {
      insurancePercent,
      discountPercent
    });
    
    const payment = await Payment.create({
      patientId,
      amount: finalAmount,
      method,
      status: 'paid',
      type,
      reference: reference || null,
      relatedId: relatedId || null,
      createdBy: user.id,
      amountBase,
      insuranceDeduction,
      discountDeduction
    });
    
    // Si relatedId fourni, lier le paiement à la ressource
    if (relatedId && type === 'lab') {
      await LabRequest.update({ paymentId: payment.id }, { where: { id: relatedId } });
    } else if (relatedId && type === 'imaging') {
      await ImagingRequest.update({ paymentId: payment.id }, { where: { id: relatedId } });
    }
    
    res.status(201).json(successResponse({
      id: payment.id,
      patientId: payment.patientId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      type: payment.type,
      createdAt: payment.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES PAIEMENTS ==========

/**
 * Liste tous les paiements avec filtres
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    console.log('=== GET ALL PAYMENTS DEBUG ===');
    const { page = 1, limit = 10 } = req.query;
    console.log('Query params:', { ...req.query, page, limit });
    
    const offset = (page - 1) * limit;
    const where = buildReceptionPaymentsWhere(req.query);
    console.log('📋 Where clause:', JSON.stringify(where, null, 2));
    
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          required: false,
          include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        { model: LabRequest, as: 'labRequest', required: false, attributes: ['id', 'totalAmount'] },
        { model: ImagingRequest, as: 'imagingRequest', required: false, attributes: ['id', 'totalAmount'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    console.log('📊 Résultats de la requête:');
    console.log('  - count:', count);
    console.log('  - rows.length:', rows.length);
    console.log('  - limit:', parseInt(limit));
    console.log('  - offset:', parseInt(offset));
    
    if (rows.length > 0) {
      console.log('  - Premier paiement:', {
        id: rows[0].id,
        type: rows[0].type,
        status: rows[0].status,
        createdAt: rows[0].createdAt,
        patientId: rows[0].patientId
      });
    } else {
      console.log('  ⚠️ Aucun paiement trouvé avec ces critères');
      
      // Vérifier s'il y a des paiements sans filtre
      const totalPayments = await Payment.count();
      const paymentsByType = await Payment.findAll({
        attributes: ['type', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        group: ['type'],
        raw: true
      });
      // Vérifier les dates des paiements existants
      const samplePayments = await Payment.findAll({
        attributes: ['id', 'type', 'createdAt'],
        limit: 5,
        order: [['createdAt', 'DESC']]
      });
      
      console.log('  📈 Total paiements dans la DB:', totalPayments);
      console.log('  📈 Paiements par type:', paymentsByType);
      console.log('  📅 Exemples de dates de paiements:');
      samplePayments.forEach(p => {
        const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
        console.log(`    - ${p.type} (${p.id.substring(0, 8)}...): ${createdAt.toISOString()}`);
      });
    }
    
    const consultationPriceRow = await ConsultationPrice.findOne({ where: { isActive: true } });
    const consultationBasePrice = consultationPriceRow ? Number(consultationPriceRow.price) : 0;

    const payments = rows.map(payment => {
      let amountBase = payment.amountBase != null && payment.amountBase > 0 ? Number(payment.amountBase) : null;
      if (amountBase == null) {
        if (payment.type === 'consultation') {
          amountBase = consultationBasePrice;
        } else if (payment.type === 'lab' && payment.labRequest?.totalAmount != null) {
          amountBase = Number(payment.labRequest.totalAmount);
        } else if (payment.type === 'imaging' && payment.imagingRequest?.totalAmount != null) {
          amountBase = Number(payment.imagingRequest.totalAmount);
        } else {
          amountBase = payment.amount != null ? Number(payment.amount) : 0;
        }
      }
      return {
        id: payment.id,
        patient: payment.patient ? enrichPatientForDisplay(payment.patient) : null,
        amount: payment.amount,
        amountBase,
        insuranceDeduction: payment.insuranceDeduction != null ? Number(payment.insuranceDeduction) : 0,
        discountDeduction: payment.discountDeduction != null ? Number(payment.discountDeduction) : 0,
        method: payment.method,
        status: payment.status,
        type: payment.type,
        reference: payment.reference,
        createdBy: payment.creator,
        createdAt: payment.createdAt
      };
    });
    
    // Statistiques (inclure Patient pour que les filtres $patient.xxx$ soient valides)
    const statsInclude = [{ model: Patient, as: 'patient', required: false, attributes: [] }];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [total, totalAmount, todayCount, todayAmount] = await Promise.all([
      Payment.count({ where, include: statsInclude, distinct: true }),
      Payment.sum('amount', { where, include: statsInclude }),
      Payment.count({ where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } }, include: statsInclude, distinct: true }),
      Payment.sum('amount', { where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } }, include: statsInclude })
    ]);
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        stats: {
          total: total || 0,
          totalAmount: parseFloat(totalAmount) || 0,
          today: todayCount || 0,
          todayAmount: parseFloat(todayAmount) || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Construit le where pour la liste/export des paiements réception (date, type, status, search, isInsured, hasDiscount, insuranceEstablishmentId).
 */
function buildReceptionPaymentsWhere(query) {
  const { date, dateFrom, dateTo, type, status, search, isInsured, hasDiscount, insuranceEstablishmentId } = query || {};
  const where = {};
  if (isInsured === 'true') {
    where['$patient.isInsured$'] = true;
    if (insuranceEstablishmentId) where['$patient.insuranceEstablishmentId$'] = insuranceEstablishmentId;
  } else if (isInsured === 'false') {
    where['$patient.isInsured$'] = false;
  }
  if (hasDiscount === 'true') {
    where['$patient.hasDiscount$'] = true;
    where['$patient.discountPercent$'] = { [Op.gt]: 0 };
  }
  if (dateFrom && dateTo) {
    try {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        where.createdAt = { [Op.between]: [start, end] };
      }
    } catch (_) {}
  } else if (date) {
    try {
      const dateParts = date.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          where.createdAt = { [Op.between]: [startDate, endDate] };
        }
      }
    } catch (_) {}
  }
  if (type && type !== 'all') {
    where.type = type;
  } else {
    where.type = { [Op.ne]: 'pharmacy' };
  }
  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
      { '$patient.firstName$': { [Op.like]: `%${search}%` } },
      { '$patient.lastName$': { [Op.like]: `%${search}%` } },
      { reference: { [Op.like]: `%${search}%` } }
    ];
  }
  if (hasDiscount === 'false') {
    return { [Op.and]: [where, { [Op.or]: [{ '$patient.hasDiscount$': false }, { '$patient.discountPercent$': null }, { '$patient.discountPercent$': 0 }] }] };
  }
  return where;
}

/**
 * Export Excel des paiements réception (mêmes filtres que la liste).
 */
exports.exportPayments = async (req, res, next) => {
  try {
    const where = buildReceptionPaymentsWhere(req.query);
    const rows = await Payment.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', required: false, include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: LabRequest, as: 'labRequest', required: false, attributes: ['id', 'totalAmount'] },
        { model: ImagingRequest, as: 'imagingRequest', required: false, attributes: ['id', 'totalAmount'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const consultationPriceRow = await ConsultationPrice.findOne({ where: { isActive: true } });
    const consultationBasePrice = consultationPriceRow ? Number(consultationPriceRow.price) : 0;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Paiements');
    sheet.columns = [
      { header: 'Date', key: 'createdAt', width: 20 },
      { header: 'ID Vitalis', key: 'vitalisId', width: 15 },
      { header: 'Patient', key: 'patientName', width: 30 },
      { header: 'N° identifiant assureur', key: 'insuranceMemberNumber', width: 22 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Montant de base', key: 'amountBase', width: 14 },
      { header: 'Montant payé par le patient', key: 'amount', width: 18 },
      { header: 'Montant pris en charge par l\'assureur', key: 'insuranceDeduction', width: 28 },
      { header: 'Assurance %', key: 'insuranceCoveragePercent', width: 12 },
      { header: 'Remise %', key: 'discountPercent', width: 10 },
      { header: 'Assurance', key: 'insurance', width: 25 },
      { header: 'Méthode', key: 'method', width: 14 },
      { header: 'Statut', key: 'status', width: 10 },
      { header: 'Créé par', key: 'creatorName', width: 20 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    const typeLibelle = { consultation: 'Consultation', lab: 'Laboratoire', imaging: 'Imagerie', pharmacy: 'Pharmacie' };
    const statusLibelle = { paid: 'Payé', pending: 'En attente', cancelled: 'Annulé' };
    rows.forEach(p => {
      const patient = p.patient;
      const patientData = patient && typeof patient.get === 'function' ? patient.get({ plain: true }) : (patient || {});
      const insuranceMemberNumber = (patientData?.insuranceMemberNumber ?? patientData?.insurance_member_number ?? patient?.insuranceMemberNumber ?? patient?.insurance_member_number ?? '').toString().trim() || '';
      const establishmentName = patient?.insuranceEstablishment?.name || (patient?.isInsured ? 'Oui' : '') || 'Non';
      let baseAmount = p.amount;
      if (p.type === 'consultation') {
        baseAmount = (p.amountBase != null && p.amountBase > 0) ? p.amountBase : consultationBasePrice;
      } else if (p.type === 'lab') {
        baseAmount = (p.amountBase != null && p.amountBase > 0) ? p.amountBase : (p.labRequest?.totalAmount != null ? Number(p.labRequest.totalAmount) : p.amount);
      } else if (p.type === 'imaging') {
        baseAmount = (p.amountBase != null && p.amountBase > 0) ? p.amountBase : (p.imagingRequest?.totalAmount != null ? Number(p.imagingRequest.totalAmount) : p.amount);
      } else if (p.amountBase != null && p.amountBase > 0) {
        baseAmount = p.amountBase;
      }
      sheet.addRow({
        createdAt: p.createdAt,
        vitalisId: patient?.vitalisId ?? '',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
        insuranceMemberNumber,
        type: typeLibelle[p.type] || p.type,
        amountBase: baseAmount,
        amount: p.amount,
        insuranceDeduction: p.insuranceDeduction != null ? Number(p.insuranceDeduction) : 0,
        insuranceCoveragePercent: patient?.insuranceCoveragePercent ?? patientData?.insuranceCoveragePercent ?? 0,
        discountPercent: patient?.discountPercent ?? patientData?.discountPercent ?? 0,
        insurance: establishmentName,
        method: p.method,
        status: statusLibelle[p.status] || p.status,
        creatorName: p.creator?.name ?? ''
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `paiements_${req.query.date || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'un paiement
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
        },
        {
          model: User,
          as: 'creator',
          attributes: { exclude: ['password'] }
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json(
        errorResponse('Paiement non trouvé', 404)
      );
    }
    
    // Récupérer la ressource liée si elle existe
    let relatedResource = null;
    if (payment.relatedId) {
      if (payment.type === 'lab') {
        const labRequest = await LabRequest.findByPk(payment.relatedId);
        if (labRequest) {
          relatedResource = { type: 'lab_request', id: labRequest.id, data: labRequest };
        }
      } else if (payment.type === 'imaging') {
        const imagingRequest = await ImagingRequest.findByPk(payment.relatedId);
        if (imagingRequest) {
          relatedResource = { type: 'imaging_request', id: imagingRequest.id, data: imagingRequest };
        }
      }
    }
    
    res.json(successResponse({
      id: payment.id,
      patient: payment.patient ? enrichPatientForDisplay(payment.patient) : null,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      type: payment.type,
      reference: payment.reference,
      relatedResource,
      createdBy: payment.creator,
      createdAt: payment.createdAt
    }));
  } catch (error) { 
    next(error);
  }
};

// ========== ROUTES PAIEMENTS LAB/IMAGING ==========

/**
 * Liste des demandes de laboratoire et imagerie pour paiement
 */
/**
 * Construit le where pour lab/imaging requests (date, search, isInsured, hasDiscount, insuranceEstablishmentId).
 */
function buildLabPaymentsWhere(query) {
  const { date, search, isInsured, hasDiscount, insuranceEstablishmentId } = query || {};
  const where = {};
  if (isInsured === 'true') {
    where['$patient.isInsured$'] = true;
    if (insuranceEstablishmentId) where['$patient.insuranceEstablishmentId$'] = insuranceEstablishmentId;
  } else if (isInsured === 'false') {
    where['$patient.isInsured$'] = false;
  }
  if (hasDiscount === 'true') {
    where['$patient.hasDiscount$'] = true;
    where['$patient.discountPercent$'] = { [Op.gt]: 0 };
  }
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    where.createdAt = { [Op.between]: [startDate, endDate] };
  }
  if (search) {
    where[Op.or] = [
      { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
      { '$patient.firstName$': { [Op.like]: `%${search}%` } },
      { '$patient.lastName$': { [Op.like]: `%${search}%` } }
    ];
  }
  if (hasDiscount === 'false') {
    return { [Op.and]: [where, { [Op.or]: [{ '$patient.hasDiscount$': false }, { '$patient.discountPercent$': null }, { '$patient.discountPercent$': 0 }] }] };
  }
  return where;
}

exports.getLabPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, status, search, type } = req.query;
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const offset = (parseInt(page) - 1) * limitNum;
    
    const where = buildLabPaymentsWhere(req.query);
    
    const allRequests = [];
    
    if (!type || type === 'lab' || type === 'all') {
      const { rows } = await LabRequest.findAndCountAll({
        where,
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Payment,
            as: 'payment',
            attributes: ['id', 'status', 'method', 'amount', 'amountBase', 'insuranceDeduction', 'discountDeduction'],
            required: false
          },
          {
            model: User,
            as: 'labTechnician',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        limit: 1000,
        order: [['createdAt', 'DESC']],
        distinct: true
      });
      
      let filteredRows = rows;
      if (status === 'pending') {
        filteredRows = rows.filter(row => !row.payment || row.payment.status === 'pending');
      } else if (status === 'paid') {
        filteredRows = rows.filter(row => row.payment && row.payment.status === 'paid');
      }
      
      filteredRows.forEach(row => {
        const paymentStatus = row.payment ? row.payment.status : 'pending';
        const p = row.payment;
        allRequests.push({
          id: row.id,
          type: 'lab',
          patient: row.patient ? enrichPatientForDisplay(row.patient) : null,
          doctor: row.doctor,
          labTechnician: row.labTechnician ? {
            id: row.labTechnician.id,
            name: row.labTechnician.name,
            email: row.labTechnician.email
          } : null,
          status: paymentStatus,
          totalAmount: row.totalAmount,
          paymentId: row.paymentId,
          paymentStatus: paymentStatus,
          requestStatus: row.status,
          createdAt: row.createdAt,
          // Montant de base, déductions et montant payé (après déductions)
          amountBase: p?.amountBase ?? row.totalAmount,
          insuranceDeduction: p?.insuranceDeduction ?? 0,
          discountDeduction: p?.discountDeduction ?? 0,
          amount: p?.amount ?? row.totalAmount
        });
      });
    }
    
    if (!type || type === 'imaging' || type === 'all') {
      const { rows } = await ImagingRequest.findAndCountAll({
        where,
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Payment,
            as: 'payment',
            attributes: ['id', 'status', 'method', 'amount', 'amountBase', 'insuranceDeduction', 'discountDeduction'],
            required: false
          },
          {
            model: User,
            as: 'labTechnician',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        limit: 1000,
        order: [['createdAt', 'DESC']],
        distinct: true
      });
      
      let filteredRows = rows;
      if (status === 'pending') {
        filteredRows = rows.filter(row => !row.payment || row.payment.status === 'pending');
      } else if (status === 'paid') {
        filteredRows = rows.filter(row => row.payment && row.payment.status === 'paid');
      }
      
      filteredRows.forEach(row => {
        const paymentStatus = row.payment ? row.payment.status : 'pending';
        const p = row.payment;
        allRequests.push({
          id: row.id,
          type: 'imaging',
          patient: row.patient ? enrichPatientForDisplay(row.patient) : null,
          doctor: row.doctor,
          labTechnician: row.labTechnician ? {
            id: row.labTechnician.id,
            name: row.labTechnician.name,
            email: row.labTechnician.email
          } : null,
          status: paymentStatus,
          totalAmount: row.totalAmount,
          paymentId: row.paymentId,
          paymentStatus: paymentStatus,
          requestStatus: row.status,
          createdAt: row.createdAt,
          amountBase: p?.amountBase ?? row.totalAmount,
          insuranceDeduction: p?.insuranceDeduction ?? 0,
          discountDeduction: p?.discountDeduction ?? 0,
          amount: p?.amount ?? row.totalAmount
        });
      });
    }
    
    // Trier par date de création puis paginer (10 par page)
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalCount = allRequests.length;
    const requests = allRequests.slice(offset, offset + limitNum);
    
    // Statistiques - Calculer séparément pour lab et imaging puis additionner
    // Utiliser une jointure avec Payment pour vérifier le statut réel
    const [
      labPendingCount,
      labPaidCount,
      labPendingAmount,
      labTotalAmount,
      imagingPendingCount,
      imagingPaidCount,
      imagingPendingAmount,
      imagingTotalAmount
    ] = await Promise.all([
      // Lab: pending = pas de paiement OU paiement avec status 'pending'
      LabRequest.count({
        where: {
          ...where,
          [Op.or]: [
            { paymentId: null },
            { '$payment.status$': 'pending' }
          ]
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: false
        }],
        distinct: true
      }),
      // Lab: paid = paiement avec status 'paid'
      LabRequest.count({
        where: {
          ...where,
          '$payment.status$': 'paid'
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: true
        }],
        distinct: true
      }),
      LabRequest.sum('totalAmount', {
        where: {
          ...where,
          [Op.or]: [
            { paymentId: null },
            { '$payment.status$': 'pending' }
          ]
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: false
        }]
      }),
      LabRequest.sum('totalAmount', { where }),
      // Imaging: pending = pas de paiement OU paiement avec status 'pending'
      ImagingRequest.count({
        where: {
          ...where,
          [Op.or]: [
            { paymentId: null },
            { '$payment.status$': 'pending' }
          ]
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: false
        }],
        distinct: true
      }),
      // Imaging: paid = paiement avec status 'paid'
      ImagingRequest.count({
        where: {
          ...where,
          '$payment.status$': 'paid'
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: true
        }],
        distinct: true
      }),
      ImagingRequest.sum('totalAmount', {
        where: {
          ...where,
          [Op.or]: [
            { paymentId: null },
            { '$payment.status$': 'pending' }
          ]
        },
        include: [{
          model: Payment,
          as: 'payment',
          attributes: [],
          required: false
        }]
      }),
      ImagingRequest.sum('totalAmount', { where })
    ]);
    
    // Additionner les résultats
    const pendingCount = (labPendingCount || 0) + (imagingPendingCount || 0);
    const paidCount = (labPaidCount || 0) + (imagingPaidCount || 0);
    const pendingAmount = (parseFloat(labPendingAmount) || 0) + (parseFloat(imagingPendingAmount) || 0);
    const totalAmount = (parseFloat(labTotalAmount) || 0) + (parseFloat(imagingTotalAmount) || 0);
    
    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limitNum) || 1,
          totalItems: totalCount,
          itemsPerPage: limitNum
        },
        stats: {
          total: totalCount,
          pending: pendingCount || 0,
          paid: paidCount || 0,
          totalAmount: parseFloat(totalAmount) || 0,
          pendingAmount: parseFloat(pendingAmount) || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export Excel des paiements labo / imagerie (mêmes filtres que la liste).
 */
exports.exportLabPayments = async (req, res, next) => {
  try {
    const where = buildLabPaymentsWhere(req.query);
    const { status, type } = req.query;
    const includeCommon = [
      { model: Patient, as: 'patient', include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }] },
      { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
      { model: Payment, as: 'payment', attributes: ['id', 'status', 'method', 'amount', 'amountBase', 'insuranceDeduction'], required: false }
    ];
    const rows = [];
    if (!type || type === 'lab' || type === 'all') {
      const labRows = await LabRequest.findAll({ where, include: includeCommon, order: [['createdAt', 'DESC']] });
      let filtered = labRows;
      if (status === 'pending') filtered = labRows.filter(r => !r.payment || r.payment.status === 'pending');
      else if (status === 'paid') filtered = labRows.filter(r => r.payment && r.payment.status === 'paid');
      filtered.forEach(r => rows.push({ ...r.get({ plain: true }), type: 'lab' }));
    }
    if (!type || type === 'imaging' || type === 'all') {
      const imagingRows = await ImagingRequest.findAll({ where, include: includeCommon, order: [['createdAt', 'DESC']] });
      let filtered = imagingRows;
      if (status === 'pending') filtered = imagingRows.filter(r => !r.payment || r.payment.status === 'pending');
      else if (status === 'paid') filtered = imagingRows.filter(r => r.payment && r.payment.status === 'paid');
      filtered.forEach(r => rows.push({ ...r.get({ plain: true }), type: 'imaging' }));
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Paiements Labo & Imagerie');
    sheet.columns = [
      { header: 'Date', key: 'createdAt', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'ID Vitalis', key: 'vitalisId', width: 15 },
      { header: 'Patient', key: 'patientName', width: 30 },
      { header: 'N° identifiant assureur', key: 'insuranceMemberNumber', width: 22 },
      { header: 'Médecin', key: 'doctorName', width: 20 },
      { header: 'Montant de base', key: 'amountBase', width: 14 },
      { header: 'Montant payé par le patient', key: 'amountPaid', width: 22 },
      { header: 'Montant pris en charge par l\'assureur', key: 'insuranceDeduction', width: 28 },
      { header: 'Assurance %', key: 'insuranceCoveragePercent', width: 12 },
      { header: 'Remise %', key: 'discountPercent', width: 10 },
      { header: 'Assurance', key: 'insurance', width: 25 },
      { header: 'Statut', key: 'paymentStatus', width: 14 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    const typeLibelle = { lab: 'Laboratoire', imaging: 'Imagerie' };
    const statusLibelle = { paid: 'Payé', pending: 'En attente', cancelled: 'Annulé' };
    rows.forEach(r => {
      const patient = r.patient;
      const patientData = patient && typeof patient.get === 'function' ? patient.get({ plain: true }) : (patient || {});
      const insuranceMemberNumber = (patientData?.insuranceMemberNumber ?? patientData?.insurance_member_number ?? patient?.insuranceMemberNumber ?? patient?.insurance_member_number ?? '').toString().trim() || '';
      const paymentStatus = r.payment ? r.payment.status : 'pending';
      const baseAmount = (r.payment?.amountBase != null && r.payment.amountBase > 0) ? r.payment.amountBase : Number(r.totalAmount) || 0;
      const amountPaid = r.payment?.amount ?? r.totalAmount;
      sheet.addRow({
        createdAt: r.createdAt,
        type: typeLibelle[r.type] || r.type,
        vitalisId: patient?.vitalisId ?? '',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
        insuranceMemberNumber,
        doctorName: r.doctor?.name ?? '',
        amountBase: baseAmount,
        amountPaid,
        insuranceDeduction: r.payment?.insuranceDeduction != null ? Number(r.payment.insuranceDeduction) : 0,
        insuranceCoveragePercent: patient?.insuranceCoveragePercent ?? patientData?.insuranceCoveragePercent ?? 0,
        discountPercent: patient?.discountPercent ?? patientData?.discountPercent ?? 0,
        insurance: patient?.insuranceEstablishment?.name || (patient?.isInsured ? 'Oui' : '') || 'Non',
        paymentStatus: statusLibelle[paymentStatus] || paymentStatus
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `paiements_labo_imagerie_${req.query.date || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistrer le paiement d'une demande de laboratoire ou imagerie
 */
exports.payLabRequest = async (req, res, next) => {
  try {
    console.log('=== PAY LAB REQUEST DEBUG ===');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    
    const { method, reference, assignToLab, labTechnicianId, type, insurance, discount } = req.body;
    const user = req.user;
    const requestId = req.params.id;
    // type peut être dans body ou query (pour compatibilité)
    const requestType = type || req.query.type; // 'lab' ou 'imaging'
    
    console.log('Extracted values:');
    console.log('  - method:', method);
    console.log('  - reference:', reference);
    console.log('  - assignToLab:', assignToLab);
    console.log('  - labTechnicianId:', labTechnicianId);
    console.log('  - requestId:', requestId);
    console.log('  - type (from body):', type);
    console.log('  - type (from query):', req.query.type);
    console.log('  - requestType (final):', requestType);
    
    if (!method) {
      console.log('❌ Erreur: method est requis');
      return res.status(400).json(
        errorResponse('method est requis', 400)
      );
    }
    
    if (method === 'orange_money' && !reference) {
      console.log('❌ Erreur: reference est requis pour orange_money');
      return res.status(400).json(
        errorResponse('reference est requis pour orange_money', 400)
      );
    }
    
    if (insurance?.isInsured === true) {
      const memberNumber = (insurance?.memberNumber ?? insurance?.insuranceMemberNumber ?? '').toString().trim();
      if (!memberNumber) {
        return res.status(400).json(
          errorResponse('Le numéro d\'identifiant assureur est obligatoire lorsque l\'assurance est activée', 400)
        );
      }
    }
    
    let request;
    if (requestType === 'lab') {
      console.log('🔍 Recherche de la demande de lab...');
      request = await LabRequest.findByPk(requestId);
      console.log('Demande de lab trouvée:', request ? {
        id: request.id,
        patientId: request.patientId,
        status: request.status,
        paymentId: request.paymentId,
        totalAmount: request.totalAmount
      } : 'Non trouvée');
    } else if (requestType === 'imaging') {
      console.log('🔍 Recherche de la demande d\'imagerie...');
      request = await ImagingRequest.findByPk(requestId);
      console.log('Demande d\'imagerie trouvée:', request ? {
        id: request.id,
        patientId: request.patientId,
        status: request.status,
        paymentId: request.paymentId,
        totalAmount: request.totalAmount
      } : 'Non trouvée');
    } else {
      console.log('❌ Erreur: type doit être lab ou imaging, reçu:', requestType);
      return res.status(400).json(
        errorResponse('type doit être lab ou imaging', 400)
      );
    }
    
    if (!request) {
      console.log('❌ Erreur: Demande non trouvée');
      return res.status(404).json(
        errorResponse('Demande non trouvée', 404)
      );
    }

    // Mettre à jour les infos assurance/remise du patient si fournies
    const patient = await Patient.findByPk(request.patientId);
    if (patient && (insurance || discount)) {
      const patientUpdates = {};
      if (insurance) {
        if (insurance.isInsured === true) {
          const memberNumber = (insurance.memberNumber ?? insurance.insuranceMemberNumber ?? '').toString().trim();
          if (memberNumber) patientUpdates.insuranceMemberNumber = memberNumber;
          if (insurance.establishmentId) patientUpdates.insuranceEstablishmentId = insurance.establishmentId;
          if (insurance.coveragePercent != null) patientUpdates.insuranceCoveragePercent = insurance.coveragePercent;
          patientUpdates.isInsured = true;
        } else if (insurance.isInsured === false) {
          patientUpdates.isInsured = false;
          patientUpdates.insuranceMemberNumber = null;
          patientUpdates.insuranceEstablishmentId = null;
          patientUpdates.insuranceCoveragePercent = null;
        }
      }
      if (discount) {
        if (discount.hasDiscount === true) {
          if (discount.discountPercent != null) patientUpdates.discountPercent = discount.discountPercent;
          patientUpdates.hasDiscount = true;
        } else if (discount.hasDiscount === false) {
          patientUpdates.hasDiscount = false;
          patientUpdates.discountPercent = null;
        }
      }
      if (Object.keys(patientUpdates).length > 0) {
        await patient.update(patientUpdates);
      }
    }
    
    let payment;
    
    if (request.paymentId) {
      // La demande a déjà un paiement (créé automatiquement) - recalculer assurance/remise puis mettre à jour
      console.log('💰 La demande a déjà un paiement, mise à jour avec assurance/remise...');
      
      payment = await Payment.findByPk(request.paymentId);
      if (!payment) {
        return res.status(404).json(
          errorResponse('Paiement associé non trouvé', 404)
        );
      }
      
      const patient = await Patient.findByPk(request.patientId);
      const baseAmount = Number(request.totalAmount) || 0;
      const applyInsurance = requestType !== 'pharmacy';
      const overrides = {};
      if (insurance?.isInsured && insurance?.coveragePercent != null) overrides.insurancePercent = insurance.coveragePercent;
      else if (insurance?.isInsured === false) overrides.insurancePercent = 0;
      if (discount?.hasDiscount && discount?.discountPercent != null) overrides.discountPercent = discount.discountPercent;
      else if (discount?.hasDiscount === false) overrides.discountPercent = 0;
      const { insurancePercent, discountPercent } = patient
        ? getPercentagesFromPatient(patient, overrides, applyInsurance)
        : { insurancePercent: overrides.insurancePercent ?? 0, discountPercent: overrides.discountPercent ?? 0 };
      const { finalAmount, amountBase, insuranceDeduction, discountDeduction } = computePaymentAmount(baseAmount, {
        insurancePercent,
        discountPercent
      });
      
      await payment.update({
        amount: finalAmount,
        amountBase,
        insuranceDeduction,
        discountDeduction,
        method,
        status: 'paid',
        reference: reference || payment.reference,
        updatedAt: new Date()
      });
      
      await payment.reload();
      
      console.log('✅ Paiement mis à jour:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        type: payment.type
      });
    } else {
      // Créer un nouveau paiement (pour les anciennes demandes sans paiement)
      const patient = await Patient.findByPk(request.patientId);
      const baseAmount = Number(request.totalAmount) || 0;
      const applyInsurance = requestType !== 'pharmacy';
      const overrides = {};
      if (insurance?.isInsured && insurance?.coveragePercent != null) overrides.insurancePercent = insurance.coveragePercent;
      else if (insurance?.isInsured === false) overrides.insurancePercent = 0;
      if (discount?.hasDiscount && discount?.discountPercent != null) overrides.discountPercent = discount.discountPercent;
      else if (discount?.hasDiscount === false) overrides.discountPercent = 0;
      const { insurancePercent, discountPercent } = patient
        ? getPercentagesFromPatient(patient, overrides, applyInsurance)
        : { insurancePercent: overrides.insurancePercent ?? 0, discountPercent: overrides.discountPercent ?? 0 };
      const { finalAmount, amountBase, insuranceDeduction, discountDeduction } = computePaymentAmount(baseAmount, {
        insurancePercent,
        discountPercent
      });
      console.log('✅ Validation passée, création d\'un nouveau paiement...');
      console.log('💰 Création du paiement avec les données:');
      console.log('  - patientId:', request.patientId);
      console.log('  - amount (final):', finalAmount);
      console.log('  - method:', method);
      console.log('  - type:', requestType);
      payment = await Payment.create({
        patientId: request.patientId,
        amount: finalAmount,
        method,
        status: 'paid',
        type: requestType,
        reference: reference || null,
        relatedId: request.id,
        createdBy: user.id,
        amountBase,
        insuranceDeduction,
        discountDeduction
      });
      
      console.log('✅ Paiement créé:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        type: payment.type
      });
      
      // Lier le paiement à la demande
      console.log('🔗 Liaison du paiement à la demande...');
      await request.update({ paymentId: payment.id });
      await request.reload();
      console.log('✅ Demande mise à jour avec paymentId:', request.paymentId);
    }
    
    // Assigner au technicien si demandé
    if (assignToLab && labTechnicianId) {
      console.log('👤 Assignation au technicien:', labTechnicianId);
      
      // Vérifier si c'est un UUID valide
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(labTechnicianId);
      
      if (isValidUUID) {
        const technician = await User.findByPk(labTechnicianId);
        if (!technician || technician.role !== 'lab') {
          console.log('⚠️ Avertissement: Technicien invalide ou non trouvé:', {
            found: !!technician,
            role: technician ? technician.role : 'N/A'
          });
          console.log('⚠️ Continuation sans assignation du technicien');
        } else if (!technician.isActive) {
          console.log('⚠️ Avertissement: Technicien inactif');
          console.log('⚠️ Continuation sans assignation du technicien');
        } else {
          await request.update({ labTechnicianId: technician.id });
          await request.reload();
          console.log('✅ Technicien assigné:', {
            id: technician.id,
            name: technician.name,
            role: technician.role
          });
        }
      } else {
        console.log('⚠️ Avertissement: labTechnicianId n\'est pas un UUID valide:', labTechnicianId);
        console.log('⚠️ Continuation sans assignation du technicien');
      }
    }
    
    console.log('✅ Paiement enregistré avec succès');
    console.log('========================');
    
    res.json(successResponse({
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        type: payment.type
      },
      request: {
        id: request.id,
        paymentId: request.paymentId,
        labTechnicianId: request.labTechnicianId,
        status: request.status
      }
    }));
  } catch (error) {
    console.error('❌ Erreur dans payLabRequest:', error);
    console.error('Stack:', error.stack);
    next(error);
  }
};

// ========== ROUTES ASSIGNATION ==========

/**
 * Liste des patients avec paiement pour assignation
 */
exports.getAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {
      type: 'consultation',
      status: 'paid'
    };
    
    if (search) {
      where[Op.or] = [
        { '$patient.firstName$': { [Op.like]: `%${search}%` } },
        { '$patient.lastName$': { [Op.like]: `%${search}%` } },
        { '$patient.vitalisId$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{ model: InsuranceEstablishment, as: 'insuranceEstablishment', required: false, attributes: ['id', 'name', 'code'] }]
        },
        {
          model: DoctorAssignment,
          as: 'doctorAssignments',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }],
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    const patients = rows.map(payment => {
      const assignment = payment.doctorAssignments && payment.doctorAssignments.length > 0 ? payment.doctorAssignments[0] : null;
      const patientDisplay = payment.patient ? enrichPatientForDisplay(payment.patient) : null;
      return {
        ...(patientDisplay || {}),
        id: payment.patient?.id,
        vitalisId: payment.patient?.vitalisId,
        firstName: payment.patient?.firstName,
        lastName: payment.patient?.lastName,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          type: payment.type
        },
        assignment: assignment ? {
          id: assignment.id,
          doctor: assignment.doctor,
          status: assignment.status
        } : null
      };
    });
    
    // Filtrer par statut d'assignation si demandé
    let filteredPatients = patients;
    if (status === 'assigned') {
      filteredPatients = patients.filter(p => p.assignment !== null);
    } else if (status === 'unassigned') {
      filteredPatients = patients.filter(p => p.assignment === null);
    }
    
    res.json(paginatedResponse({ patients: filteredPatients }, { page: parseInt(page), limit: parseInt(limit) }, filteredPatients.length));
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner un médecin à un patient
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const { patientId, doctorId, paymentId } = req.body;
    const user = req.user;
    
    if (!patientId || !doctorId || !paymentId) {
      return res.status(400).json(
        errorResponse('patientId, doctorId et paymentId sont requis', 400)
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
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json(
        errorResponse('Médecin invalide', 400)
      );
    }
    
    // Vérifier que le paiement existe et est payé
    const payment = await Payment.findByPk(paymentId);
    if (!payment || payment.status !== 'paid' || payment.type !== 'consultation') {
      return res.status(400).json(
        errorResponse('Paiement invalide ou non payé', 400)
      );
    }
    
    // Vérifier qu'il n'y a pas déjà une assignation active (dossier non archivé)
    const existingAssignment = await DoctorAssignment.findOne({
      where: {
        patientId,
        status: { [Op.in]: ['assigned', 'in_consultation'] }
      },
      include: [{ model: ConsultationDossier, as: 'dossier', required: false }]
    });

    if (existingAssignment) {
      const dossier = existingAssignment.dossier;
      if (dossier && dossier.status === 'archived') {
        // Dossier archivé : marquer l'assignation comme terminée pour permettre une nouvelle assignation
        await existingAssignment.update({ status: 'completed' });
      } else {
        return res.status(400).json(
          errorResponse('Le patient a déjà une assignation active', 400)
        );
      }
    }
    
    // Créer l'assignation
    const assignment = await DoctorAssignment.create({
      patientId,
      doctorId,
      paymentId,
      status: 'assigned',
      createdBy: user.id
    });
    
    // Créer le dossier de consultation
    const dossier = await ConsultationDossier.create({
      patientId,
      doctorId,
      assignmentId: assignment.id,
      status: 'active'
    });
    
    res.status(201).json(successResponse({
      id: assignment.id,
      patientId: assignment.patientId,
      doctorId: assignment.doctorId,
      paymentId: assignment.paymentId,
      status: assignment.status,
      dossier: {
        id: dossier.id,
        status: dossier.status
      },
      createdAt: assignment.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste tous les médecins disponibles
 */
exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: 'doctor',
        isActive: true,
        isSuspended: false
      },
      attributes: ['id', 'name', 'email', 'department', 'doctorIsAvailable']
    });
    
    // Compter les assignations actives pour chaque médecin
    const doctorsWithCounts = await Promise.all(
      doctors.map(async (doctor) => {
        const activeAssignments = await DoctorAssignment.count({
          where: {
            doctorId: doctor.id,
            status: { [Op.in]: ['assigned', 'in_consultation'] }
          }
        });
        
        return {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          department: doctor.department,
          doctorIsAvailable: doctor.doctorIsAvailable !== false,
          activeAssignments
        };
      })
    );
    
    res.json(successResponse(doctorsWithCounts));
  } catch (error) {
    next(error);
  }
};

/**
 * Activer ou désactiver la disponibilité d'un médecin pour nouvelles assignations
 */
exports.toggleDoctorAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    
    const doctor = await User.findByPk(id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json(
        errorResponse('Médecin non trouvé', 404)
      );
    }
    
    const newValue = available !== false;
    await doctor.update({ doctorIsAvailable: newValue });
    
    res.json(successResponse({
      id: doctor.id,
      name: doctor.name,
      doctorIsAvailable: doctor.doctorIsAvailable
    }, newValue ? 'Médecin marqué comme disponible' : 'Médecin marqué comme indisponible'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES LITS ==========

/**
 * Liste tous les lits
 */
exports.getAllBeds = async (req, res, next) => {
  try {
    const { type, available } = req.query;
    
    const where = {};
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (available === 'true') {
      where.isOccupied = false;
    }
    
    const beds = await Bed.findAll({
      where,
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'vitalisId', 'firstName', 'lastName'],
        required: false
      }],
      order: [['number', 'ASC']]
    });
    
    res.json(successResponse(beds));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste uniquement les lits disponibles
 */
exports.getAvailableBeds = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    const where = {
      isOccupied: false
    };
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    const beds = await Bed.findAll({
      where,
      order: [['number', 'ASC']]
    });
    
    res.json(successResponse(beds));
  } catch (error) {
    next(error);
  }
};

/**
 * Marquer un lit comme occupé
 */
exports.occupyBed = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    
    if (!patientId) {
      return res.status(400).json(
        errorResponse('patientId est requis', 400)
      );
    }
    
    const bed = await Bed.findByPk(req.params.id);
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    if (bed.isOccupied) {
      return res.status(400).json(
        errorResponse('Le lit est déjà occupé', 400)
      );
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    await bed.update({
      isOccupied: true,
      patientId
    });
    
    res.json(successResponse({
      id: bed.id,
      number: bed.number,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId
    }, 'Lit occupé avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Libérer un lit
 */
exports.freeBed = async (req, res, next) => {
  try {
    const bed = await Bed.findByPk(req.params.id);
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    if (!bed.isOccupied) {
      return res.status(400).json(
        errorResponse('Le lit n\'est pas occupé', 400)
      );
    }
    
    await bed.update({
      isOccupied: false,
      patientId: null
    });
    
    res.json(successResponse(null, 'Lit libéré avec succès'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES STATISTIQUES ==========

/**
 * Statistiques pour le tableau de bord réception
 */
exports.getStats = async (req, res, next) => {
  try {
    console.log('=== GET RECEPTION STATS DEBUG ===');
    const { date } = req.query;
    console.log('Query params:', { date });
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('📅 Dates calculées:');
    console.log('  - targetDate:', targetDate.toISOString());
    console.log('  - nextDay:', nextDay.toISOString());
    
    // Vérifier les assignations avant le calcul
    const allAssignments = await DoctorAssignment.findAll({
      attributes: ['id', 'status', 'createdAt', 'patientId'],
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'vitalisId', 'firstName', 'lastName']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('📋 Toutes les assignations dans la DB:');
    allAssignments.forEach(assign => {
      console.log(`  - ID: ${assign.id.substring(0, 8)}... | Status: ${assign.status} | Patient: ${assign.patient ? assign.patient.vitalisId : 'N/A'} | Created: ${assign.createdAt.toISOString()}`);
    });
    
    const assignedCount = await DoctorAssignment.count({ where: { status: 'assigned' } });
    const inConsultationCount = await DoctorAssignment.count({ where: { status: 'in_consultation' } });
    const completedCount = await DoctorAssignment.count({ where: { status: 'completed' } });
    
    console.log('📊 Comptage des assignations par statut:');
    console.log('  - assigned:', assignedCount);
    console.log('  - in_consultation:', inConsultationCount);
    console.log('  - completed:', completedCount);
    
    // Calculer pendingAssignments : patients avec paiement consultation payé mais sans assignation active
    // Récupérer tous les patients avec un paiement de consultation payé
    const patientsWithPaidConsultation = await Payment.findAll({
      where: {
        type: 'consultation',
        status: 'paid'
      },
      attributes: ['patientId'],
      group: ['patientId'],
      raw: true
    });
    
    const patientIdsWithPaidConsultation = patientsWithPaidConsultation.map(p => p.patientId);
    console.log('💰 Patients avec paiement consultation payé:', patientIdsWithPaidConsultation.length);
    console.log('  - IDs:', patientIdsWithPaidConsultation.map(id => id.substring(0, 8) + '...'));
    
    // Récupérer tous les patients avec une assignation active
    const patientsWithActiveAssignment = await DoctorAssignment.findAll({
      where: {
        status: { [Op.in]: ['assigned', 'in_consultation'] }
      },
      attributes: ['patientId'],
      group: ['patientId'],
      raw: true
    });
    
    const patientIdsWithActiveAssignment = patientsWithActiveAssignment.map(a => a.patientId);
    console.log('👨‍⚕️ Patients avec assignation active:', patientIdsWithActiveAssignment.length);
    console.log('  - IDs:', patientIdsWithActiveAssignment.map(id => id.substring(0, 8) + '...'));
    
    // Patients avec paiement payé mais sans assignation active
    const pendingPatientIds = patientIdsWithPaidConsultation.filter(
      patientId => !patientIdsWithActiveAssignment.includes(patientId)
    );
    
    console.log('⏳ Patients en attente d\'assignation:', pendingPatientIds.length);
    console.log('  - IDs:', pendingPatientIds.map(id => id.substring(0, 8) + '...'));
    
    const [patientsToday, paymentsToday, revenueToday, bedsOccupied, bedsAvailable] = await Promise.all([
      Patient.count({ where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Payment.count({ where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Payment.sum('amount', { where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Bed.count({ where: { isOccupied: true } }),
      Bed.count({ where: { isOccupied: false } })
    ]);
    
    const pendingAssignments = pendingPatientIds.length;
    
    console.log('📈 Résultats des statistiques:');
    console.log('  - patientsToday:', patientsToday);
    console.log('  - paymentsToday:', paymentsToday);
    console.log('  - pendingAssignments:', pendingAssignments);
    console.log('  - revenueToday:', revenueToday);
    console.log('  - bedsOccupied:', bedsOccupied);
    console.log('  - bedsAvailable:', bedsAvailable);
    console.log('========================');
    
    res.json(successResponse({
      patientsToday: patientsToday || 0,
      paymentsToday: paymentsToday || 0,
      pendingAssignments: pendingAssignments || 0,
      revenueToday: parseFloat(revenueToday) || 0,
      bedsOccupied: bedsOccupied || 0,
      bedsAvailable: bedsAvailable || 0
    }));
  } catch (error) {
    console.error('❌ Erreur dans getStats:', error);
    next(error);
  }
};
