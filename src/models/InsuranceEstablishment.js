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
