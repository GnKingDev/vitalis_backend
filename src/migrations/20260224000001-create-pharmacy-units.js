'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pharmacy_units', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
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
    const now = new Date();
    const { v4: uuidv4 } = require('uuid');
    await queryInterface.bulkInsert('pharmacy_units', [
      { id: uuidv4(), name: 'boîte', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'flacon', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'comprimé', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'gélule', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'sachet', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'unité', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'ml', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'pièce', createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pharmacy_units');
  }
};
