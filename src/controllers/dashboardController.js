const models = require('../models');
const { User, Patient, Consultation, Payment, LabRequest, ImagingRequest, Prescription, PharmacyProduct, Bed } = models;
const { successResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');

/**
 * Statistiques du dashboard selon le rôle de l'utilisateur
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let stats = {};

    switch (role) {
      case 'admin':
        // Statistiques complètes pour l'admin
        stats = await getAdminStats(today, tomorrow, startOfMonth, startOfYear);
        break;
      
      case 'reception':
        // Statistiques pour la réception
        stats = await getReceptionStats(today, tomorrow, startOfMonth);
        break;
      
      case 'doctor':
        // Statistiques pour le médecin
        stats = await getDoctorStats(user.id, today, tomorrow, startOfMonth);
        break;
      
      case 'lab':
        // Statistiques pour le laboratoire
        stats = await getLabStats(today, tomorrow, startOfMonth);
        break;
      
      case 'pharmacy':
        // Statistiques pour la pharmacie
        stats = await getPharmacyStats(today, tomorrow, startOfMonth);
        break;
      
      default:
        return res.status(403).json({
          success: false,
          error: 'Rôle non autorisé'
        });
    }

    res.json(successResponse({
      role,
      stats
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques pour l'administrateur
 */
async function getAdminStats(today, tomorrow, startOfMonth, startOfYear) {
  const [
    totalPatients,
    todayPatients,
    monthPatients,
    totalConsultations,
    todayConsultations,
    completedConsultations,
    inProgressConsultations,
    totalPayments,
    todayPayments,
    totalRevenue,
    todayRevenue,
    monthRevenue,
    totalLabRequests,
    pendingLabRequests,
    completedLabRequests,
    totalImagingRequests,
    pendingImagingRequests,
    completedImagingRequests,
    totalUsers,
    usersByRole
  ] = await Promise.all([
    Patient.count(),
    Patient.count({ where: { createdAt: { [Op.gte]: today } } }),
    Patient.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
    Consultation.count(),
    Consultation.count({ where: { createdAt: { [Op.gte]: today } } }),
    Consultation.count({ where: { status: 'completed' } }),
    Consultation.count({ where: { status: 'in_progress' } }),
    Payment.count(),
    Payment.count({ where: { createdAt: { [Op.gte]: today } } }),
    Payment.sum('amount'),
    Payment.sum('amount', { where: { createdAt: { [Op.gte]: today } } }),
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

  const usersByRoleObj = {};
  usersByRole.forEach(item => {
    usersByRoleObj[item.role] = parseInt(item.count);
  });

  return {
    patients: {
      total: totalPatients || 0,
      today: todayPatients || 0,
      thisMonth: monthPatients || 0
    },
    consultations: {
      total: totalConsultations || 0,
      today: todayConsultations || 0,
      completed: completedConsultations || 0,
      inProgress: inProgressConsultations || 0
    },
    payments: {
      total: totalPayments || 0,
      today: todayPayments || 0,
      revenue: {
        total: parseFloat(totalRevenue) || 0,
        today: parseFloat(todayRevenue) || 0,
        thisMonth: parseFloat(monthRevenue) || 0
      }
    },
    lab: {
      total: totalLabRequests || 0,
      pending: pendingLabRequests || 0,
      completed: completedLabRequests || 0
    },
    imaging: {
      total: totalImagingRequests || 0,
      pending: pendingImagingRequests || 0,
      completed: completedImagingRequests || 0
    },
    users: {
      total: totalUsers || 0,
      byRole: usersByRoleObj
    }
  };
}

/**
 * Statistiques pour la réception
 */
async function getReceptionStats(today, tomorrow, startOfMonth) {
  const [
    todayPatients,
    monthPatients,
    todayConsultations,
    waitingConsultations,
    todayPayments,
    todayRevenue
  ] = await Promise.all([
    Patient.count({ where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
    Patient.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
    Consultation.count({ where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
    Consultation.count({ where: { status: 'waiting' } }),
    Payment.count({ where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
    Payment.sum('amount', { where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
  ]);

  return {
    patients: {
      today: todayPatients || 0,
      thisMonth: monthPatients || 0
    },
    consultations: {
      today: todayConsultations || 0,
      waiting: waitingConsultations || 0
    },
    payments: {
      today: todayPayments || 0,
      revenue: {
        today: parseFloat(todayRevenue) || 0
      }
    }
  };
}

/**
 * Statistiques pour le médecin
 */
async function getDoctorStats(doctorId, today, tomorrow, startOfMonth) {
  const [
    todayConsultations,
    monthConsultations,
    waitingConsultations,
    inProgressConsultations,
    completedConsultations,
    todayPrescriptions,
    monthPrescriptions
  ] = await Promise.all([
    Consultation.count({ 
      where: { 
        doctorId,
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
      } 
    }),
    Consultation.count({ 
      where: { 
        doctorId,
        createdAt: { [Op.gte]: startOfMonth } 
      } 
    }),
    Consultation.count({ where: { doctorId, status: 'waiting' } }),
    Consultation.count({ where: { doctorId, status: 'in_progress' } }),
    Consultation.count({ where: { doctorId, status: 'completed' } }),
    Prescription.count({ 
      where: { 
        doctorId,
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
      } 
    }),
    Prescription.count({ 
      where: { 
        doctorId,
        createdAt: { [Op.gte]: startOfMonth } 
      } 
    })
  ]);

  return {
    consultations: {
      today: todayConsultations || 0,
      thisMonth: monthConsultations || 0,
      waiting: waitingConsultations || 0,
      inProgress: inProgressConsultations || 0,
      completed: completedConsultations || 0
    },
    prescriptions: {
      today: todayPrescriptions || 0,
      thisMonth: monthPrescriptions || 0
    }
  };
}

/**
 * Statistiques pour le laboratoire
 */
async function getLabStats(today, tomorrow, startOfMonth) {
  const [
    totalLabRequests,
    pendingLabRequests,
    completedLabRequests,
    todayLabRequests,
    monthLabRequests
  ] = await Promise.all([
    LabRequest.count(),
    LabRequest.count({ where: { status: 'pending' } }),
    LabRequest.count({ where: { status: 'sent_to_doctor' } }),
    LabRequest.count({ 
      where: { 
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
      } 
    }),
    LabRequest.count({ 
      where: { 
        createdAt: { [Op.gte]: startOfMonth } 
      } 
    })
  ]);

  return {
    lab: {
      total: totalLabRequests || 0,
      pending: pendingLabRequests || 0,
      completed: completedLabRequests || 0,
      today: todayLabRequests || 0,
      thisMonth: monthLabRequests || 0
    }
  };
}

/**
 * Statistiques pour la pharmacie
 */
async function getPharmacyStats(today, tomorrow, startOfMonth) {
  const [
    totalProducts,
    inStockProducts,
    lowStockProducts,
    outOfStockProducts,
    todaySales,
    monthSales,
    todayRevenue,
    monthRevenue
  ] = await Promise.all([
    PharmacyProduct.count(),
    PharmacyProduct.count({ 
      where: Sequelize.literal('stock > minStock AND stock > 0')
    }),
    PharmacyProduct.count({ 
      where: Sequelize.literal('stock <= minStock AND stock > 0')
    }),
    PharmacyProduct.count({ where: { stock: 0 } }),
    Payment.count({ 
      where: { 
        type: 'pharmacy',
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
      } 
    }),
    Payment.count({ 
      where: { 
        type: 'pharmacy',
        createdAt: { [Op.gte]: startOfMonth } 
      } 
    }),
    Payment.sum('amount', { 
      where: { 
        type: 'pharmacy',
        createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
      } 
    }),
    Payment.sum('amount', { 
      where: { 
        type: 'pharmacy',
        createdAt: { [Op.gte]: startOfMonth } 
      } 
    })
  ]);

  return {
    products: {
      total: totalProducts || 0,
      inStock: inStockProducts || 0,
      lowStock: lowStockProducts || 0,
      outOfStock: outOfStockProducts || 0
    },
    sales: {
      today: {
        count: todaySales || 0,
        amount: parseFloat(todayRevenue) || 0
      },
      thisMonth: {
        count: monthSales || 0,
        amount: parseFloat(monthRevenue) || 0
      }
    }
  };
}
