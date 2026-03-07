'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pharmacy_products', 'salePrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    await queryInterface.addColumn('pharmacy_products', 'privatePrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pharmacy_products', 'salePrice');
    await queryInterface.removeColumn('pharmacy_products', 'privatePrice');
  }
};
