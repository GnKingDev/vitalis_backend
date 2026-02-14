const { PharmacyProduct, Payment, PaymentItem, Patient, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { calculateStockStatus, checkExpiringSoon, generateStockAlert } = require('../utils/stockCalculator');
const { Op, Sequelize } = require('sequelize');

// ========== ROUTES PRODUITS ==========

/**
 * Liste tous les produits de pharmacie
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, lowStock, outOfStock } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (category) {
      where.category = category;
    }
    if (lowStock === 'true') {
      where[Op.and] = [
        Sequelize.literal('stock <= minStock'),
        Sequelize.literal('stock > 0')
      ];
    }
    if (outOfStock === 'true') {
      where.stock = 0;
    }
    
    const { count, rows } = await PharmacyProduct.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });
    
    const products = rows.map(product => ({
      ...product.toJSON(),
      status: calculateStockStatus(product.stock, product.minStock)
    }));
    
    res.json(paginatedResponse({ products }, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les détails d'un produit
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await PharmacyProduct.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json(
        errorResponse('Produit non trouvé', 404)
      );
    }
    
    const productData = product.toJSON();
    productData.status = calculateStockStatus(product.stock, product.minStock);
    
    res.json(successResponse(productData));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau produit
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, category, price, stock, minStock, unit, expiryDate } = req.body;
    
    if (!name || !category || price === undefined || stock === undefined || minStock === undefined || !unit) {
      return res.status(400).json(
        errorResponse('name, category, price, stock, minStock et unit sont requis', 400)
      );
    }
    
    if (price < 0 || stock < 0 || minStock < 0) {
      return res.status(400).json(
        errorResponse('price, stock et minStock doivent être positifs', 400)
      );
    }
    
    const product = await PharmacyProduct.create({
      name,
      category,
      price,
      stock,
      minStock,
      unit,
      expiryDate: expiryDate || null
    });
    
    res.status(201).json(successResponse({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      createdAt: product.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un produit
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await PharmacyProduct.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json(
        errorResponse('Produit non trouvé', 404)
      );
    }
    
    const { name, category, price, stock, minStock, unit, expiryDate, isActive } = req.body;
    
    await product.update({
      name: name || product.name,
      category: category || product.category,
      price: price !== undefined ? price : product.price,
      stock: stock !== undefined ? stock : product.stock,
      minStock: minStock !== undefined ? minStock : product.minStock,
      unit: unit || product.unit,
      expiryDate: expiryDate !== undefined ? expiryDate : product.expiryDate,
      isActive: isActive !== undefined ? isActive : product.isActive
    });
    
    res.json(successResponse({
      id: product.id,
      updatedAt: product.updatedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un produit (soft delete)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await PharmacyProduct.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json(
        errorResponse('Produit non trouvé', 404)
      );
    }
    
    await product.update({ isActive: false });
    
    res.json(successResponse(null, 'Produit supprimé avec succès'));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES ALERTES ==========

/**
 * Liste toutes les alertes de stock
 */
exports.getAllAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    
    const products = await PharmacyProduct.findAll({ where });
    
    let alerts = [];
    
    products.forEach(product => {
      const alert = generateStockAlert(product);
      if (alert) {
        alerts.push({
          id: product.id,
          product: {
            id: product.id,
            name: product.name,
            category: product.category,
            stock: product.stock,
            minStock: product.minStock,
            unit: product.unit
          },
          ...alert
        });
      }
    });
    
    // Filtrer par type
    if (type && type !== 'all') {
      alerts = alerts.filter(alert => alert.type === type);
    }
    
    // Pagination
    const total = alerts.length;
    const paginatedAlerts = alerts.slice(offset, offset + parseInt(limit));
    
    // Statistiques
    const stats = {
      total: alerts.length,
      outOfStock: alerts.filter(a => a.type === 'out_of_stock').length,
      lowStock: alerts.filter(a => a.type === 'low_stock').length,
      expiringSoon: alerts.filter(a => a.type === 'expiring_soon').length
    };
    
    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
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
 * Statistiques sur les alertes
 */
exports.getAlertsStats = async (req, res, next) => {
  try {
    const products = await PharmacyProduct.findAll();
    
    const alerts = products.map(product => generateStockAlert(product)).filter(Boolean);
    
    res.json(successResponse({
      total: alerts.length,
      outOfStock: alerts.filter(a => a.type === 'out_of_stock').length,
      lowStock: alerts.filter(a => a.type === 'low_stock').length,
      expiringSoon: alerts.filter(a => a.type === 'expiring_soon').length
    }));
  } catch (error) {
    next(error);
  }
};

// ========== ROUTES PAIEMENTS ==========

/**
 * Liste tous les paiements de pharmacie
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = { type: 'pharmacy' };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }
    
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
        },
        {
          model: PaymentItem,
          as: 'items',
          include: [{
            model: PharmacyProduct,
            as: 'product',
            attributes: ['id', 'name', 'category']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    
    const payments = rows.map(payment => ({
      id: payment.id,
      patient: payment.patient,
      patientId: payment.patientId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      type: payment.type,
      reference: payment.reference,
      items: payment.items.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      createdBy: payment.creator,
      createdAt: payment.createdAt
    }));
    
    res.json(paginatedResponse({ payments }, { page: parseInt(page), limit: parseInt(limit) }, count));
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
          required: false
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
          }]
        }
      ]
    });
    
    if (!payment || payment.type !== 'pharmacy') {
      return res.status(404).json(
        errorResponse('Paiement non trouvé', 404)
      );
    }
    
    res.json(successResponse({
      id: payment.id,
      patient: payment.patient,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      type: payment.type,
      items: payment.items.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      createdBy: payment.creator,
      createdAt: payment.createdAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouveau paiement de pharmacie
 */
exports.createPayment = async (req, res, next) => {
  const transaction = await require('../models').sequelize.transaction();
  
  try {
    const { patientId, items, method, reference } = req.body;
    const user = req.user;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(
        errorResponse('items (tableau non vide) est requis', 400)
      );
    }
    
    if (!method) {
      return res.status(400).json(
        errorResponse('method est requis', 400)
      );
    }
    
    if (method === 'orange_money' && !reference) {
      return res.status(400).json(
        errorResponse('reference est requis pour orange_money', 400)
      );
    }
    
    // Vérifier que tous les produits existent et ont assez de stock
    const productIds = items.map(item => item.productId);
    const products = await PharmacyProduct.findAll({
      where: { id: { [Op.in]: productIds } },
      transaction
    });
    
    if (products.length !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json(
        errorResponse('Un ou plusieurs produits sont invalides', 400)
      );
    }
    
    // Vérifier les stocks et calculer le montant total
    let totalAmount = 0;
    const productMap = {};
    products.forEach(product => {
      productMap[product.id] = product;
    });
    
    for (const item of items) {
      const product = productMap[item.productId];
      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json(
          errorResponse(`Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}`, 400)
        );
      }
      totalAmount += parseFloat(product.price) * item.quantity;
    }
    
    // Créer le paiement
    const payment = await Payment.create({
      patientId: patientId || null,
      amount: totalAmount,
      method,
      status: 'paid',
      type: 'pharmacy',
      reference: reference || null,
      createdBy: user.id
    }, { transaction });
    
    // Créer les items et mettre à jour les stocks
    await Promise.all(
      items.map(async (item) => {
        const product = productMap[item.productId];
        
        await PaymentItem.create({
          paymentId: payment.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: parseFloat(product.price) * item.quantity
        }, { transaction });
        
        // Mettre à jour le stock
        await product.update({
          stock: product.stock - item.quantity
        }, { transaction });
      })
    );
    
    await transaction.commit();
    
    // Récupérer le paiement avec les relations
    const paymentWithRelations = await Payment.findByPk(payment.id, {
      include: [
        {
          model: PaymentItem,
          as: 'items',
          include: [{
            model: PharmacyProduct,
            as: 'product'
          }]
        }
      ]
    });
    
    res.status(201).json(successResponse({
      id: paymentWithRelations.id,
      patientId: paymentWithRelations.patientId,
      amount: paymentWithRelations.amount,
      method: paymentWithRelations.method,
      status: paymentWithRelations.status,
      type: paymentWithRelations.type,
      items: paymentWithRelations.items.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      createdAt: paymentWithRelations.createdAt
    }));
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// ========== ROUTES STATISTIQUES ==========

/**
 * Statistiques pour le tableau de bord pharmacie
 */
exports.getStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    
    const [
      totalProducts,
      totalStockValue,
      alerts,
      todayPayments,
      todayAmount,
      topProducts
    ] = await Promise.all([
      PharmacyProduct.count(),
      PharmacyProduct.sum(Sequelize.literal('stock * price')),
      Promise.resolve().then(async () => {
        const products = await PharmacyProduct.findAll();
        const allAlerts = products.map(p => generateStockAlert(p)).filter(Boolean);
        return {
          total: allAlerts.length,
          outOfStock: allAlerts.filter(a => a.type === 'out_of_stock').length,
          lowStock: allAlerts.filter(a => a.type === 'low_stock').length,
          expiringSoon: allAlerts.filter(a => a.type === 'expiring_soon').length
        };
      }),
      Payment.count({
        where: {
          type: 'pharmacy',
          createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay }
        }
      }),
      Payment.sum('amount', {
        where: {
          type: 'pharmacy',
          createdAt: { [Op.gte]: targetDate, [Op.lt]: nextDay }
        }
      }),
      PaymentItem.findAll({
        attributes: [
          'productId',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'quantitySold']
        ],
        include: [{
          model: PharmacyProduct,
          as: 'product',
          attributes: ['id', 'name', 'category']
        }],
        group: ['productId', 'product.id'],
        order: [[Sequelize.literal('quantitySold'), 'DESC']],
        limit: 10
      })
    ]);
    
    res.json(successResponse({
      totalProducts: totalProducts || 0,
      totalStockValue: parseFloat(totalStockValue) || 0,
      alerts,
      paymentsToday: {
        count: todayPayments || 0,
        amount: parseFloat(todayAmount) || 0
      },
      topProducts: topProducts.map(item => ({
        product: item.product,
        quantitySold: parseInt(item.get('quantitySold')) || 0
      }))
    }));
  } catch (error) {
    next(error);
  }
};
