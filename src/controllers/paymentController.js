const { Payment, Patient, User, LabRequest, ImagingRequest, PaymentItem, PharmacyProduct } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');

// ========== ROUTES PRINCIPALES ==========

/**
 * Liste tous les paiements avec filtres avancés
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, type, status, method, search, patientId, createdBy } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (method && method !== 'all') {
      where.method = method;
    }
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (createdBy) {
      where.createdBy = createdBy;
    }
    
    if (search) {
      where[Op.or] = [
        { '$patient.vitalisId$': { [Op.like]: `%${search}%` } },
        { '$patient.firstName$': { [Op.like]: `%${search}%` } },
        { '$patient.lastName$': { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    // Récupérer les ressources liées
    const payments = await Promise.all(
      rows.map(async (payment) => {
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
          } else if (payment.type === 'pharmacy') {
            const items = await PaymentItem.findAll({
              where: { paymentId: payment.id },
              include: [{ model: PharmacyProduct, as: 'product' }]
            });
            if (items.length > 0) {
              relatedResource = { type: 'pharmacy_payment', id: payment.id, data: { items } };
            }
          }
        }
        
        return {
          id: payment.id,
          patient: payment.patient,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          type: payment.type,
          reference: payment.reference,
          relatedResource,
          createdBy: payment.creator,
          createdAt: payment.createdAt
        };
      })
    );
    
    // Calculer les statistiques
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [total, totalAmount, todayCount, todayAmount, byType, byMethod, byStatus] = await Promise.all([
      Payment.count({ where }),
      Payment.sum('amount', { where }),
      Payment.count({ where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Payment.sum('amount', { where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Payment.findAll({
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where,
        group: ['type']
      }),
      Payment.findAll({
        attributes: [
          'method',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where,
        group: ['method']
      }),
      Payment.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where,
        group: ['status']
      })
    ]);
    
    const stats = {
      total: total || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      today: {
        count: todayCount || 0,
        amount: parseFloat(todayAmount) || 0
      },
      byType: {},
      byMethod: {},
      byStatus: {}
    };
    
    byType.forEach(item => {
      stats.byType[item.type] = parseInt(item.get('count')) || 0;
    });
    
    byMethod.forEach(item => {
      stats.byMethod[item.method] = parseInt(item.get('count')) || 0;
    });
    
    byStatus.forEach(item => {
      stats.byStatus[item.status] = parseInt(item.get('count')) || 0;
    });
    
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
        stats
      }
    });
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
          as: 'patient'
        },
        {
          model: User,
          as: 'creator',
          attributes: { exclude: ['password'] }
        },
        {
          model: PaymentItem,
          as: 'items',
          include: [{
            model: PharmacyProduct,
            as: 'product'
          }],
          required: false
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json(
        errorResponse('Paiement non trouvé', 404)
      );
    }
    
    // Récupérer la ressource liée
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
      patient: payment.patient,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      type: payment.type,
      reference: payment.reference,
      relatedResource,
      items: payment.items && payment.items.length > 0 ? payment.items.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })) : null,
      createdBy: payment.creator,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau paiement
 */
exports.createPayment = async (req, res, next) => {
  try {
    const { patientId, amount, method, type, reference, relatedId } = req.body;
    const user = req.user;
    
    if (!patientId || amount === undefined || !method || !type) {
      return res.status(400).json(
        errorResponse('patientId, amount, method et type sont requis', 400)
      );
    }
    
    if (amount < 0) {
      return res.status(400).json(
        errorResponse('Le montant doit être positif', 400)
      );
    }
    
    if (method === 'orange_money' && !reference) {
      return res.status(400).json(
        errorResponse('reference est requis pour orange_money', 400)
      );
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier la ressource liée si fournie
    if (relatedId) {
      if (type === 'lab') {
        const labRequest = await LabRequest.findByPk(relatedId);
        if (!labRequest) {
          return res.status(404).json(
            errorResponse('Demande de laboratoire non trouvée', 404)
          );
        }
      } else if (type === 'imaging') {
        const imagingRequest = await ImagingRequest.findByPk(relatedId);
        if (!imagingRequest) {
          return res.status(404).json(
            errorResponse('Demande d\'imagerie non trouvée', 404)
          );
        }
      }
    }
    
    const payment = await Payment.create({
      patientId,
      amount,
      method,
      status: 'paid',
      type,
      reference: reference || null,
      relatedId: relatedId || null,
      createdBy: user.id
    });
    
    // Lier le paiement à la ressource si fournie
    if (relatedId) {
      if (type === 'lab') {
        await LabRequest.update({ paymentId: payment.id }, { where: { id: relatedId } });
      } else if (type === 'imaging') {
        await ImagingRequest.update({ paymentId: payment.id }, { where: { id: relatedId } });
      }
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

/**
 * Modifier le statut d'un paiement
 */
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json(
        errorResponse('status doit être pending, paid ou cancelled', 400)
      );
    }
    
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json(
        errorResponse('Paiement non trouvé', 404)
      );
    }
    
    await payment.update({ status });
    
    res.json(successResponse({
      id: payment.id,
      status: payment.status,
      updatedAt: payment.updatedAt
    }, 'Statut du paiement mis à jour'));
  } catch (error) {
    next(error);
  }
};

/**
 * Annuler un paiement
 */
exports.deletePayment = async (req, res, next) => {
  try {
    const { confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json(
        errorResponse('La confirmation est requise', 400)
      );
    }
    
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json(
        errorResponse('Paiement non trouvé', 404)
      );
    }
    
    await payment.update({ status: 'cancelled' });
    
    res.json(successResponse(null, 'Paiement annulé avec succès'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES STATISTIQUES ==========

/**
 * Statistiques détaillées sur les paiements
 */
exports.getStats = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFilter = { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { [Op.between]: [start, end] } };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      total,
      totalAmount,
      todayData,
      thisMonthData,
      byType,
      byMethod,
      byStatus,
      trends
    ] = await Promise.all([
      Payment.count({ where: dateFilter }),
      Payment.sum('amount', { where: dateFilter }),
      Promise.all([
        Payment.count({ where: { ...dateFilter, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
        Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
      ]),
      Promise.all([
        Payment.count({ where: { ...dateFilter, createdAt: { [Op.gte]: startOfMonth } } }),
        Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: startOfMonth } } })
      ]),
      Payment.findAll({
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
        ],
        where: dateFilter,
        group: ['type']
      }),
      Payment.findAll({
        attributes: [
          'method',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
        ],
        where: dateFilter,
        group: ['method']
      }),
      Payment.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
        ],
        where: dateFilter,
        group: ['status']
      }),
      Promise.resolve().then(async () => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(day.getDate() - i);
          day.setHours(0, 0, 0, 0);
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);
          
          const [count, amount] = await Promise.all([
            Payment.count({ where: { ...dateFilter, createdAt: { [Op.gte]: day, [Op.lt]: nextDay } } }),
            Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: day, [Op.lt]: nextDay } } })
          ]);
          
          last7Days.push({
            date: day.toISOString().split('T')[0],
            count: count || 0,
            amount: parseFloat(amount) || 0
          });
        }
        return last7Days;
      })
    ]);
    
    const stats = {
      total: {
        count: total || 0,
        amount: parseFloat(totalAmount) || 0
      },
      today: {
        count: todayData[0] || 0,
        amount: parseFloat(todayData[1]) || 0
      },
      thisMonth: {
        count: thisMonthData[0] || 0,
        amount: parseFloat(thisMonthData[1]) || 0
      },
      byType: {},
      byMethod: {},
      byStatus: {},
      trends: {
        last7Days: trends
      }
    };
    
    byType.forEach(item => {
      stats.byType[item.type] = {
        count: parseInt(item.get('count')) || 0,
        amount: parseFloat(item.get('amount')) || 0
      };
    });
    
    byMethod.forEach(item => {
      stats.byMethod[item.method] = {
        count: parseInt(item.get('count')) || 0,
        amount: parseFloat(item.get('amount')) || 0
      };
    });
    
    byStatus.forEach(item => {
      stats.byStatus[item.status] = {
        count: parseInt(item.get('count')) || 0,
        amount: parseFloat(item.get('amount')) || 0
      };
    });
    
    res.json(successResponse(stats));
  } catch (error) {
    next(error);
  }
};
