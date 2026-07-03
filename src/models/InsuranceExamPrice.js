const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const InsuranceExamPrice = sequelize.define('InsuranceExamPrice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  insuranceEstablishmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'insurance_establishments', key: 'id' }
  },
  examId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID de l\'examen (lab_exam ou imaging_exam)'
  },
  examType: {
    type: DataTypes.ENUM('lab', 'imaging'),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
    comment: 'Prix spécifique de cet examen pour cette assurance'
  }
}, {
  tableName: 'insurance_exam_prices',
  timestamps: true,
  indexes: [
    { name: 'idx_iep_insurance', fields: ['insuranceEstablishmentId'] },
    { name: 'idx_iep_exam', fields: ['examId', 'examType'] },
    { name: 'uq_iep_insurance_exam', unique: true, fields: ['insuranceEstablishmentId', 'examId', 'examType'] }
  ]
});

module.exports = InsuranceExamPrice;
