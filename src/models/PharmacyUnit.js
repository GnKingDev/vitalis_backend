const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const PharmacyUnit = sequelize.define('PharmacyUnit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  }
}, {
  tableName: 'pharmacy_units',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['name'] }
  ]
});

module.exports = PharmacyUnit;
