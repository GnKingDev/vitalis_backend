const { Appointment, Patient, User, DoctorAssignment } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { enrichPatientForDisplay } = require('../utils/patientDisplayHelper');
const { Op } = require('sequelize');

/**
 * Créer un rendez-vous
 */
exports.create = async (req, res, next) => {
  try {
    const user = req.user;
    const { patientId, doctorId, appointmentAt, notes } = req.body;

    if (!patientId || !doctorId || !appointmentAt) {
      return res.status(400).json(
        errorResponse('patientId, doctorId et appointmentAt sont requis', 400)
      );
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(errorResponse('Patient non trouvé', 404));
    }
    const doctor = await User.findByPk(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json(errorResponse('Médecin non trouvé', 404));
    }

    const at = new Date(appointmentAt);
    if (isNaN(at.getTime())) {
      return res.status(400).json(errorResponse('Date/heure invalide', 400));
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentAt: at,
      status: 'scheduled',
      notes: notes || null,
      createdBy: user?.id || null
    });

    const withIncludes = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'vitalisId'] },
        { model: User, as: 'doctor', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(successResponse(withIncludes.toJSON()));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste des rendez-vous (réception / admin)
 */
exports.getAll = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, date, doctorId, status, search, patientId } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      where.appointmentAt = { [Op.gte]: d, [Op.lt]: end };
    }
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const patientWhere = {};
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      patientWhere[Op.or] = [
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
        { vitalisId: { [Op.like]: term } }
      ];
    }
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'firstName', 'lastName', 'vitalisId', 'phone'],
          required: true,
          ...(Object.keys(patientWhere).length ? { where: patientWhere } : {})
        },
        { model: User, as: 'doctor', attributes: ['id', 'name'] }
      ],
      limit: limitNum,
      offset,
      order: [['appointmentAt', 'ASC']]
    });

    const list = rows.map(r => {
      const j = r.toJSON();
      return {
        ...j,
        patient: j.patient ? enrichPatientForDisplay({ ...r.patient, toJSON: () => r.patient.toJSON() }) : j.patient
      };
    });

    res.json(paginatedResponse(
      { appointments: list },
      { page: pageNum, limit: limitNum },
      count
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste des rendez-vous du médecin connecté
 */
exports.getMyAppointments = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 50, date, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { doctorId: user.id };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      where.appointmentAt = { [Op.gte]: d, [Op.lt]: end };
    }
    if (status) where.status = status;

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'vitalisId'] },
        { model: User, as: 'doctor', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['appointmentAt', 'ASC']]
    });

    res.json(paginatedResponse(
      { appointments: rows.map(r => r.toJSON()) },
      { page: parseInt(page), limit: parseInt(limit) },
      count
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Détail d'un rendez-vous (admin ou réception)
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
        { model: DoctorAssignment, as: 'assignment', required: false }
      ]
    });

    if (!appointment) {
      return res.status(404).json(errorResponse('Rendez-vous non trouvé', 404));
    }

    const j = appointment.toJSON();
    if (j.patient) {
      j.patient = enrichPatientForDisplay(appointment.patient);
    }
    res.json(successResponse(j));
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour le statut (présent / absent)
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['present', 'absent', 'cancelled'].includes(status)) {
      return res.status(400).json(
        errorResponse('Statut invalide. Valeurs: present, absent, cancelled', 400)
      );
    }

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'vitalisId'] },
        { model: User, as: 'doctor', attributes: ['id', 'name'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json(errorResponse('Rendez-vous non trouvé', 404));
    }

    await appointment.update({ status });

    res.json(successResponse({
      id: appointment.id,
      status: appointment.status,
      appointmentAt: appointment.appointmentAt,
      patient: appointment.patient?.toJSON(),
      doctor: appointment.doctor?.toJSON()
    }, 'Statut mis à jour'));
  } catch (error) {
    next(error);
  }
};
