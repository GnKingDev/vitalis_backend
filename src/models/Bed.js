const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Bed = sequelize.define('Bed', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('classic', 'vip'),
    allowNull: false,
    defaultValue: 'classic'
  },
  additionalFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  isOccupied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'beds',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['number']
    },
    { fields: ['type'] },
    { fields: ['isOccupied'] }
  ]
});

module.exports = Bed;
