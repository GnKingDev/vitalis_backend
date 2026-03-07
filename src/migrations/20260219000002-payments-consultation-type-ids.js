'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'consultationTypeIds', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'IDs des types de consultation (paiement type=consultation)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payments', 'consultationTypeIds');
  }
};
