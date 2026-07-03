'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Ajouter coveragePercent et coveragePercent2 à insurance_establishments
    await queryInterface.addColumn('insurance_establishments', 'coveragePercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Taux de prise en charge principal (ex: 80 pour 80%)'
    });
    await queryInterface.addColumn('insurance_establishments', 'coveragePercent2', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Deuxième taux de prise en charge'
    });

    // 2. Ajouter acompte à payments
    await queryInterface.addColumn('payments', 'acompte', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Avance déjà versée par le patient'
    });

    // 3. Créer la table insurance_exam_prices
    await queryInterface.createTable('insurance_exam_prices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      insuranceEstablishmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'insurance_establishments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      examId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID de l\'examen (lab_exam ou imaging_exam)'
      },
      examType: {
        type: Sequelize.ENUM('lab', 'imaging'),
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('insurance_exam_prices', ['insuranceEstablishmentId']);
    await queryInterface.addIndex('insurance_exam_prices', ['examId', 'examType']);
    await queryInterface.addIndex('insurance_exam_prices',
      ['insuranceEstablishmentId', 'examId', 'examType'],
      { unique: true, name: 'unique_insurance_exam_price' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('insurance_establishments', 'coveragePercent');
    await queryInterface.removeColumn('insurance_establishments', 'coveragePercent2');
    await queryInterface.removeColumn('payments', 'acompte');
    await queryInterface.dropTable('insurance_exam_prices');
  }
};
