'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('insurance_establishments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addColumn('patients', 'isInsured', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('patients', 'insuranceEstablishmentId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'insurance_establishments', key: 'id' }
    });
    await queryInterface.addColumn('patients', 'insuranceCoveragePercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });
    await queryInterface.addColumn('patients', 'hasDiscount', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('patients', 'discountPercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'amountBase', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'insuranceDeduction', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('payments', 'discountDeduction', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'discountDeduction');
    await queryInterface.removeColumn('payments', 'insuranceDeduction');
    await queryInterface.removeColumn('payments', 'amountBase');
    await queryInterface.removeColumn('patients', 'discountPercent');
    await queryInterface.removeColumn('patients', 'hasDiscount');
    await queryInterface.removeColumn('patients', 'insuranceCoveragePercent');
    await queryInterface.removeColumn('patients', 'insuranceEstablishmentId');
    await queryInterface.removeColumn('patients', 'isInsured');
    await queryInterface.dropTable('insurance_establishments');
  }
};
