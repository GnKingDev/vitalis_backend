const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  method: {
    type: DataTypes.ENUM('cash', 'orange_money'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  type: {
    type: DataTypes.ENUM('consultation', 'lab', 'imaging', 'pharmacy'),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  relatedId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Détail assurance / remise (optionnel, pour historique)
  amountBase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Montant de base avant déductions'
  },
  insuranceDeduction: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Montant déduit par l\'assurance'
  },
  discountDeduction: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Montant déduit par la remise'
  },
  consultationTypeIds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'IDs des types de consultation (paiement type=consultation)'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Payment;
