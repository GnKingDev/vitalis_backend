const { DataTypes, Op } = require('sequelize');
const sequelize = require('./sequelize');

const ConsultationPrice = sequelize.define('ConsultationPrice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  tableName: 'consultation_prices',
  timestamps: true,
  indexes: [
    { fields: ['isActive'] }
  ],
  hooks: {
    beforeCreate: async (price) => {
      // S'assurer qu'il n'y a qu'un seul prix actif
      if (price.isActive) {
        await ConsultationPrice.update(
          { isActive: false },
          { where: { isActive: true } }
        );
      }
    },
    beforeUpdate: async (price) => {
      // Si on active un prix, désactiver tous les autres
      if (price.changed('isActive') && price.isActive) {
        await ConsultationPrice.update(
          { isActive: false },
          { where: { isActive: true, id: { [Op.ne]: price.id } } }
        );
      }
    }
  }
});

module.exports = ConsultationPrice;
