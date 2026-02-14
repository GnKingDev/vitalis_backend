const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const ImagingRequestExam = sequelize.define('ImagingRequestExam', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  imagingRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'imaging_requests',
      key: 'id'
    }
  },
  imagingExamId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'imaging_exams',
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
  tableName: 'imaging_request_exams',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['imagingRequestId', 'imagingExamId']
    }
  ]
});

module.exports = ImagingRequestExam;
