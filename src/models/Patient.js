const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vitalisId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      isBefore: new Date().toISOString()
    }
  },
  gender: {
    type: DataTypes.ENUM('M', 'F'),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emergencyContact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Assurance
  isInsured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  insuranceEstablishmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'insurance_establishments',
      key: 'id'
    }
  },
  insuranceCoveragePercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Pourcentage de couverture (0-100)'
  },
  insuranceMemberNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Numéro d\'identifiant chez l\'assureur (contrat, matricule)'
  },
  // Remise
  hasDiscount: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Pourcentage de remise (0-100)'
  }
}, {
  tableName: 'patients',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['vitalisId']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['email']
    }
  ]
});

module.exports = Patient;
