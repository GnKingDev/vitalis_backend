const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const LabNumber = sequelize.define('LabNumber', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'lab_numbers',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['number'] },
    { fields: ['userId'] }
  ]
});

module.exports = LabNumber;
