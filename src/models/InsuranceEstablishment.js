const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const InsuranceEstablishment = sequelize.define('InsuranceEstablishment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Code court (ex: MUT-01)'
  },
  coveragePercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null,
    validate: { min: 0, max: 100 },
    comment: 'Taux de prise en charge principal (ex: 80 pour 80%)'
  },
  coveragePercent2: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null,
    validate: { min: 0, max: 100 },
    comment: 'Deuxième taux de prise en charge (ex: 100 pour certains actes)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'insurance_establishments',
  timestamps: true,
  indexes: [
    { fields: ['isActive'] },
    { fields: ['code'] }
  ]
});

module.exports = InsuranceEstablishment;
