const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Consultation = sequelize.define('Consultation', {
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
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('waiting', 'in_progress', 'completed'),
    allowNull: false,
    defaultValue: 'waiting'
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  vitals: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consultations',
  timestamps: true,
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['doctorId']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Consultation;
