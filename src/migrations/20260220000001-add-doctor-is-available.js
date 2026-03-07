'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'doctorIsAvailable', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'doctorIsAvailable');
  }
};
