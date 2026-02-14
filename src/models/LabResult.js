const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const LabResult = sequelize.define('LabResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  labRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'lab_requests',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'validated', 'sent'),
    allowNull: false,
    defaultValue: 'draft'
  },
  results: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  technicianNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  validatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'lab_results',
  timestamps: true,
  indexes: [
    { fields: ['labRequestId'] },
    { fields: ['status'] }
  ]
});

module.exports = LabResult;
