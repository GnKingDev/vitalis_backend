'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'pharmacy_products';
    const dialect = queryInterface.sequelize.getDialect();

    // Remplir salePrice par price si NULL (pour lignes existantes)
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET salePrice = price WHERE salePrice IS NULL`
      );
    } else {
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET "salePrice" = price WHERE "salePrice" IS NULL`
      );
    }

    // Rendre salePrice obligatoire (PostgreSQL)
    if (dialect === 'postgres') {
      await queryInterface.changeColumn(table, 'salePrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      });
    }
    // MySQL/MariaDB
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.changeColumn(table, 'salePrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      });
    }
    // SQLite
    if (dialect === 'sqlite') {
      await queryInterface.changeColumn(table, 'salePrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      });
    }

    // Supprimer la colonne prix privé
    await queryInterface.removeColumn(table, 'privatePrice');
  },

  async down(queryInterface, Sequelize) {
    const table = 'pharmacy_products';
    await queryInterface.addColumn(table, 'privatePrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    await queryInterface.changeColumn(table, 'salePrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  }
};
