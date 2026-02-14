const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const LabRequestExam = sequelize.define('LabRequestExam', {
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
  labExamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'lab_exams',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'lab_request_exams',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['labRequestId', 'labExamId']
    }
  ]
});

module.exports = LabRequestExam;
