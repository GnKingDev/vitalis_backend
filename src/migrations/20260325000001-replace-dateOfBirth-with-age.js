'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the age column
    await queryInterface.addColumn('patients', 'age', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // Convert existing dateOfBirth to age
    await queryInterface.sequelize.query(`
      UPDATE patients
      SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth"))
      WHERE "dateOfBirth" IS NOT NULL
    `);

    // Make age NOT NULL now that data is migrated
    await queryInterface.changeColumn('patients', 'age', {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 150 }
    });

    // Remove dateOfBirth column
    await queryInterface.removeColumn('patients', 'dateOfBirth');
  },

  async down(queryInterface, Sequelize) {
    // Add dateOfBirth back
    await queryInterface.addColumn('patients', 'dateOfBirth', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    // Remove age column
    await queryInterface.removeColumn('patients', 'age');
  }
};
