const { Patient, Consultation, Payment, LabRequest, ImagingRequest, User, Bed, PharmacyProduct } = require('../models');
const { successResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');
const { calculateAge, getAgeGroup } = require('../utils/ageCalculator');

/**
 * Vue d'ensemble des statistiques générales
 */
exports.getOverview = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    
    const [
      patientsTotal,
      patientsToday,
      patientsThisMonth,
      consultationsTotal,
      consultationsToday,
      consultationsCompleted,
      consultationsInProgress,
      paymentsTotal,
      paymentsToday,
      revenueTotal,
      revenueToday,
      revenueThisMonth,
      labTotal,
      labPending,
      labCompleted,
      imagingTotal,
      imagingPending,
      imagingCompleted,
      usersTotal,
      usersByRole
    ] = await Promise.all([
      Patient.count(),
      Patient.count({ where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Patient.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
      Consultation.count(),
      Consultation.count({ where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Consultation.count({ where: { status: 'completed' } }),
      Consultation.count({ where: { status: 'in_progress' } }),
      Payment.count(),
      Payment.count({ where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Payment.sum('amount'),
      Payment.sum('amount', { where: { createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay } } }),
      Payment.sum('amount', { where: { createdAt: { [Op.gte]: startOfMonth } } }),
      LabRequest.count(),
      LabRequest.count({ where: { status: 'pending' } }),
      LabRequest.count({ where: { status: 'sent_to_doctor' } }),
      ImagingRequest.count(),
      ImagingRequest.count({ where: { status: 'pending' } }),
      ImagingRequest.count({ where: { status: 'sent_to_doctor' } }),
      User.count(),
      User.findAll({
        attributes: [
          'role',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      })
    ]);
    
    const byRole = {};
    usersByRole.forEach(item => {
      byRole[item.role] = parseInt(item.count) || 0;
    });
    
    res.json(successResponse({
      patients: {
        total: patientsTotal || 0,
        today: patientsToday || 0,
        thisMonth: patientsThisMonth || 0
      },
      consultations: {
        total: consultationsTotal || 0,
        today: consultationsToday || 0,
        completed: consultationsCompleted || 0,
        inProgress: consultationsInProgress || 0
      },
      payments: {
        total: paymentsTotal || 0,
        today: paymentsToday || 0,
        revenue: {
          total: parseFloat(revenueTotal) || 0,
          today: parseFloat(revenueToday) || 0,
          thisMonth: parseFloat(revenueThisMonth) || 0
        }
      },
      lab: {
        total: labTotal || 0,
        pending: labPending || 0,
        completed: labCompleted || 0
      },
      imaging: {
        total: imagingTotal || 0,
        pending: imagingPending || 0,
        completed: imagingCompleted || 0
      },
      users: {
        total: usersTotal || 0,
        byRole
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques détaillées sur les patients
 */
exports.getPatientsStats = async (req, res, next) => {
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
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    const [
      total,
      todayCount,
      thisMonthCount,
      thisYearCount,
      byGender,
      allPatients
    ] = await Promise.all([
      Patient.count({ where: dateFilter }),
      Patient.count({ where: { ...dateFilter, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Patient.count({ where: { ...dateFilter, createdAt: { [Op.gte]: startOfMonth } } }),
      Patient.count({ where: { ...dateFilter, createdAt: { [Op.gte]: startOfYear } } }),
      Patient.findAll({
        attributes: [
          'gender',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: dateFilter,
        group: ['gender'],
        raw: true
      }),
      Patient.findAll({
        where: dateFilter,
        attributes: ['id', 'dateOfBirth', 'gender']
      })
    ]);
    
    const genderStats = {};
    byGender.forEach(item => {
      genderStats[item.gender] = parseInt(item.count) || 0;
    });
    
    const ageGroupStats = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };
    
    allPatients.forEach(patient => {
      if (patient.dateOfBirth) {
        const ageGroup = getAgeGroup(patient.dateOfBirth);
        ageGroupStats[ageGroup]++;
      }
    });
    
    // Tendances (7 derniers jours)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = await Patient.count({
        where: { ...dateFilter, createdAt: { [Op.gte]: day, [Op.lt]: nextDay } }
      });
      
      last7Days.push({
        date: day.toISOString().split('T')[0],
        count: count || 0
      });
    }
    
    res.json(successResponse({
      total: total || 0,
      today: todayCount || 0,
      thisMonth: thisMonthCount || 0,
      thisYear: thisYearCount || 0,
      byGender: genderStats,
      byAgeGroup: ageGroupStats,
      trends: {
        last7Days
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les consultations
 */
exports.getConsultationsStats = async (req, res, next) => {
  try {
    const { date, doctorId } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const where = {};
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }
    
    const [
      total,
      todayCount,
      byStatus,
      byDoctor
    ] = await Promise.all([
      Consultation.count({ where }),
      Consultation.count({ where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Consultation.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where,
        group: ['status'],
        raw: true
      }),
      Consultation.findAll({
        attributes: [
          'doctorId',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.literal('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END)'), 'completed']
        ],
        where,
        include: [{
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }],
        group: ['doctorId', 'doctor.id'],
        raw: false
      })
    ]);
    
    const statusStats = {};
    byStatus.forEach(item => {
      statusStats[item.status] = parseInt(item.count) || 0;
    });
    
    res.json(successResponse({
      total: total || 0,
      today: todayCount || 0,
      byStatus: statusStats,
      byDoctor: byDoctor.map(item => ({
        doctor: item.doctor,
        count: parseInt(item.get('count')) || 0,
        completed: parseInt(item.get('completed')) || 0
      }))
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les revenus
 */
exports.getRevenueStats = async (req, res, next) => {
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
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    const [
      total,
      todayAmount,
      thisMonthAmount,
      thisYearAmount,
      byType,
      byMethod
    ] = await Promise.all([
      Payment.sum('amount', { where: dateFilter }),
      Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: startOfMonth } } }),
      Payment.sum('amount', { where: { ...dateFilter, createdAt: { [Op.gte]: startOfYear } } }),
      Payment.findAll({
        attributes: [
          'type',
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
        ],
        where: dateFilter,
        group: ['type'],
        raw: true
      }),
      Payment.findAll({
        attributes: [
          'method',
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount']
        ],
        where: dateFilter,
        group: ['method'],
        raw: true
      })
    ]);
    
    const typeStats = {};
    byType.forEach(item => {
      typeStats[item.type] = parseFloat(item.amount) || 0;
    });
    
    const methodStats = {};
    byMethod.forEach(item => {
      methodStats[item.method] = parseFloat(item.amount) || 0;
    });
    
    res.json(successResponse({
      total: parseFloat(total) || 0,
      today: parseFloat(todayAmount) || 0,
      thisMonth: parseFloat(thisMonthAmount) || 0,
      thisYear: parseFloat(thisYearAmount) || 0,
      byType: typeStats,
      byMethod: methodStats
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les examens de laboratoire
 */
exports.getLabStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const where = {};
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    }
    
    const [
      total,
      pending,
      completed,
      todayTotal,
      todayPending,
      todayCompleted
    ] = await Promise.all([
      LabRequest.count({ where }),
      LabRequest.count({ where: { ...where, status: 'pending' } }),
      LabRequest.count({ where: { ...where, status: 'sent_to_doctor' } }),
      LabRequest.count({ where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      LabRequest.count({ where: { ...where, status: 'pending', createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      LabRequest.count({ where: { ...where, status: 'sent_to_doctor', createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
    ]);
    
    res.json(successResponse({
      total: total || 0,
      pending: pending || 0,
      completed: completed || 0,
      today: {
        total: todayTotal || 0,
        pending: todayPending || 0,
        completed: todayCompleted || 0
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les examens d'imagerie
 */
exports.getImagingStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const where = {};
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = { [Op.gte]: targetDate, [Op.lt]: nextDay };
    }
    
    const [
      total,
      pending,
      completed,
      todayTotal,
      todayPending,
      todayCompleted
    ] = await Promise.all([
      ImagingRequest.count({ where }),
      ImagingRequest.count({ where: { ...where, status: 'pending' } }),
      ImagingRequest.count({ where: { ...where, status: 'sent_to_doctor' } }),
      ImagingRequest.count({ where: { ...where, createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      ImagingRequest.count({ where: { ...where, status: 'pending', createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      ImagingRequest.count({ where: { ...where, status: 'sent_to_doctor', createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
    ]);
    
    res.json(successResponse({
      total: total || 0,
      pending: pending || 0,
      completed: completed || 0,
      today: {
        total: todayTotal || 0,
        pending: todayPending || 0,
        completed: todayCompleted || 0
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les utilisateurs
 */
exports.getUsersStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    
    const [
      total,
      active,
      suspended,
      byRole,
      lastLoginToday,
      lastLoginLast7Days,
      lastLoginLast30Days
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isSuspended: true } }),
      User.findAll({
        attributes: [
          'role',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      }),
      User.count({ where: { lastLogin: { [Op.gte]: today } } }),
      User.count({ where: { lastLogin: { [Op.gte]: last7Days } } }),
      User.count({ where: { lastLogin: { [Op.gte]: last30Days } } })
    ]);
    
    const roleStats = {};
    byRole.forEach(item => {
      roleStats[item.role] = parseInt(item.count) || 0;
    });
    
    res.json(successResponse({
      total: total || 0,
      active: active || 0,
      suspended: suspended || 0,
      byRole: roleStats,
      activity: {
        lastLogin: {
          today: lastLoginToday || 0,
          last7Days: lastLoginLast7Days || 0,
          last30Days: lastLoginLast30Days || 0
        }
      }
    }));
  } catch (error) {
    next(error);
  }
};
