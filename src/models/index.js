const sequelize = require('./sequelize');

// Importer tous les modèles
const User = require('./User');
const Patient = require('./Patient');
const Consultation = require('./Consultation');
const Payment = require('./Payment');
const LabRequest = require('./LabRequest');
const LabExam = require('./LabExam');
const LabRequestExam = require('./LabRequestExam');
const LabResult = require('./LabResult');
const ImagingRequest = require('./ImagingRequest');
const ImagingExam = require('./ImagingExam');
const ImagingRequestExam = require('./ImagingRequestExam');
const Prescription = require('./Prescription');
const PrescriptionItem = require('./PrescriptionItem');
const PharmacyProduct = require('./PharmacyProduct');
const PharmacyCategory = require('./PharmacyCategory');
const PaymentItem = require('./PaymentItem');
const DoctorAssignment = require('./DoctorAssignment');
const ConsultationDossier = require('./ConsultationDossier');
const Bed = require('./Bed');
const CustomItem = require('./CustomItem');
const ConsultationPrice = require('./ConsultationPrice');

// Initialiser tous les modèles
const models = {
  User,
  Patient,
  Consultation,
  Payment,
  LabRequest,
  LabExam,
  LabRequestExam,
  LabResult,
  ImagingRequest,
  ImagingExam,
  ImagingRequestExam,
  Prescription,
  PrescriptionItem,
  PharmacyProduct,
  PharmacyCategory,
  PaymentItem,
  DoctorAssignment,
  ConsultationDossier,
  Bed,
  CustomItem,
  ConsultationPrice,
  sequelize
};

// ========== RELATIONS USER ==========
User.hasMany(Consultation, { foreignKey: 'doctorId', as: 'consultations' });
User.hasMany(LabRequest, { foreignKey: 'doctorId', as: 'labRequests' });
User.hasMany(LabRequest, { foreignKey: 'labTechnicianId', as: 'labRequestsAsTechnician' });
User.hasMany(ImagingRequest, { foreignKey: 'doctorId', as: 'imagingRequests' });
User.hasMany(ImagingRequest, { foreignKey: 'labTechnicianId', as: 'imagingRequestsAsTechnician' });
User.hasMany(Prescription, { foreignKey: 'doctorId', as: 'prescriptions' });
User.hasMany(Payment, { foreignKey: 'createdBy', as: 'payments' });
User.hasMany(LabResult, { foreignKey: 'validatedBy', as: 'labResults' });
User.hasMany(DoctorAssignment, { foreignKey: 'doctorId', as: 'doctorAssignments' });
User.hasMany(DoctorAssignment, { foreignKey: 'createdBy', as: 'createdAssignments' });
User.hasMany(ConsultationDossier, { foreignKey: 'doctorId', as: 'consultationDossiers' });
User.hasMany(ConsultationDossier, { foreignKey: 'archivedBy', as: 'archivedDossiers' });
User.hasMany(CustomItem, { foreignKey: 'doctorId', as: 'customItems' });

// ========== RELATIONS PATIENT ==========
Patient.hasMany(Consultation, { foreignKey: 'patientId', as: 'consultations' });
Patient.hasMany(LabRequest, { foreignKey: 'patientId', as: 'labRequests' });
Patient.hasMany(ImagingRequest, { foreignKey: 'patientId', as: 'imagingRequests' });
Patient.hasMany(Prescription, { foreignKey: 'patientId', as: 'prescriptions' });
Patient.hasMany(Payment, { foreignKey: 'patientId', as: 'payments' });
Patient.hasMany(DoctorAssignment, { foreignKey: 'patientId', as: 'doctorAssignments' });
Patient.hasMany(ConsultationDossier, { foreignKey: 'patientId', as: 'consultationDossiers' });
Patient.hasOne(Bed, { foreignKey: 'patientId', as: 'bed' });
Patient.hasMany(CustomItem, { foreignKey: 'patientId', as: 'customItems' });

// ========== RELATIONS CONSULTATION ==========
Consultation.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Consultation.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Consultation.hasMany(LabRequest, { foreignKey: 'consultationId', as: 'labRequests' });
Consultation.hasMany(ImagingRequest, { foreignKey: 'consultationId', as: 'imagingRequests' });
Consultation.hasMany(Prescription, { foreignKey: 'consultationId', as: 'prescriptions' });
Consultation.hasOne(ConsultationDossier, { foreignKey: 'consultationId', as: 'dossier' });
Consultation.hasMany(CustomItem, { foreignKey: 'consultationId', as: 'customItems' });

// ========== RELATIONS PAYMENT ==========
Payment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Payment.hasOne(LabRequest, { foreignKey: 'paymentId', as: 'labRequest' });
Payment.hasOne(ImagingRequest, { foreignKey: 'paymentId', as: 'imagingRequest' });
Payment.hasMany(PaymentItem, { foreignKey: 'paymentId', as: 'items' });
Payment.hasMany(DoctorAssignment, { foreignKey: 'paymentId', as: 'doctorAssignments' });

// ========== RELATIONS LAB REQUEST ==========
LabRequest.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
LabRequest.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });
LabRequest.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
LabRequest.belongsTo(User, { foreignKey: 'labTechnicianId', as: 'labTechnician' });
LabRequest.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
LabRequest.hasMany(LabRequestExam, { foreignKey: 'labRequestId', as: 'exams' });
LabRequest.hasMany(LabResult, { foreignKey: 'labRequestId', as: 'results' });

// ========== RELATIONS LAB EXAM ==========
LabExam.hasMany(LabRequestExam, { foreignKey: 'labExamId', as: 'labRequestExams' });

// ========== RELATIONS LAB REQUEST EXAM ==========
LabRequestExam.belongsTo(LabRequest, { foreignKey: 'labRequestId', as: 'labRequest' });
LabRequestExam.belongsTo(LabExam, { foreignKey: 'labExamId', as: 'labExam' });

// ========== RELATIONS LAB RESULT ==========
LabResult.belongsTo(LabRequest, { foreignKey: 'labRequestId', as: 'labRequest' });
LabResult.belongsTo(User, { foreignKey: 'validatedBy', as: 'validator' });

// ========== RELATIONS IMAGING REQUEST ==========
ImagingRequest.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
ImagingRequest.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });
ImagingRequest.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
ImagingRequest.belongsTo(User, { foreignKey: 'labTechnicianId', as: 'labTechnician' });
ImagingRequest.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
ImagingRequest.hasMany(ImagingRequestExam, { foreignKey: 'imagingRequestId', as: 'exams' });

// ========== RELATIONS IMAGING EXAM ==========
ImagingExam.hasMany(ImagingRequestExam, { foreignKey: 'imagingExamId', as: 'imagingRequestExams' });

// ========== RELATIONS IMAGING REQUEST EXAM ==========
ImagingRequestExam.belongsTo(ImagingRequest, { foreignKey: 'imagingRequestId', as: 'imagingRequest' });
ImagingRequestExam.belongsTo(ImagingExam, { foreignKey: 'imagingExamId', as: 'imagingExam' });

// ========== RELATIONS PRESCRIPTION ==========
Prescription.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Prescription.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });
Prescription.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescriptionId', as: 'items' });

// ========== RELATIONS PRESCRIPTION ITEM ==========
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescriptionId', as: 'prescription' });

// ========== RELATIONS PHARMACY CATEGORY ==========
PharmacyCategory.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PharmacyCategory.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
// Note: La relation avec PharmacyProduct utilise le champ 'category' (STRING) au lieu de 'categoryId'
// PharmacyCategory.hasMany(PharmacyProduct, { foreignKey: 'categoryId', as: 'products' });

// ========== RELATIONS PHARMACY PRODUCT ==========
// Note: PharmacyProduct utilise 'category' (STRING) au lieu d'une relation avec PharmacyCategory
// PharmacyProduct.belongsTo(PharmacyCategory, { foreignKey: 'categoryId', as: 'category' });
PharmacyProduct.hasMany(PaymentItem, { foreignKey: 'productId', as: 'paymentItems' });

// ========== RELATIONS PAYMENT ITEM ==========
PaymentItem.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
PaymentItem.belongsTo(PharmacyProduct, { foreignKey: 'productId', as: 'product' });

// ========== RELATIONS DOCTOR ASSIGNMENT ==========
DoctorAssignment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
DoctorAssignment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
DoctorAssignment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
DoctorAssignment.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
DoctorAssignment.hasOne(ConsultationDossier, { foreignKey: 'assignmentId', as: 'dossier' });

// ========== RELATIONS CONSULTATION DOSSIER ==========
ConsultationDossier.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
ConsultationDossier.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
ConsultationDossier.belongsTo(User, { foreignKey: 'archivedBy', as: 'archivedByUser' });
ConsultationDossier.belongsTo(DoctorAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
ConsultationDossier.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });

// ========== RELATIONS BED ==========
Bed.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Bed.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Bed.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// ========== RELATIONS CUSTOM ITEM ==========
CustomItem.belongsTo(Consultation, { foreignKey: 'consultationId', as: 'consultation' });
CustomItem.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
CustomItem.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

// ========== RELATIONS CONSULTATION PRICE ==========
ConsultationPrice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
ConsultationPrice.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

module.exports = models;
