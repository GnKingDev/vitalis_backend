const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  appointmentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date et heure du rendez-vous'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'present', 'absent', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'doctor_assignments',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  indexes: [
    { fields: ['patientId'] },
    { fields: ['doctorId'] },
    { fields: ['appointmentAt'] },
    { fields: ['status'] },
    { fields: ['assignmentId'] }
  ]
});

module.exports = Appointment;
