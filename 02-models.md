# Modèles de Données (Sequelize)

## Vue d'ensemble

Tous les modèles utilisent Sequelize ORM pour interagir avec la base de données. Chaque modèle représente une table dans la base de données.

## Liste des modèles

### 1. User (Utilisateur)

**Table**: `users`

**Champs**:
- `id` (UUID, Primary Key)
- `name` (STRING, NOT NULL)
- `email` (STRING, UNIQUE, NOT NULL)
- `password` (STRING, NOT NULL) - Hashé avec bcrypt
- `role` (ENUM: 'admin', 'reception', 'doctor', 'lab', 'pharmacy', NOT NULL)
- `department` (STRING, NULLABLE)
- `avatar` (STRING, NULLABLE) - URL de l'avatar
- `isActive` (BOOLEAN, DEFAULT true)
- `isSuspended` (BOOLEAN, DEFAULT false)
- `lastLogin` (DATE, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `hasMany` Consultation (comme doctor)
- `hasMany` LabRequest (comme doctor)
- `hasMany` ImagingRequest (comme doctor)
- `hasMany` Prescription (comme doctor)
- `hasMany` Payment (comme createdBy)

**Indexes**:
- Index unique sur `email`
- Index sur `role`

### 2. Patient (Patient)

**Table**: `patients`

**Champs**:
- `id` (UUID, Primary Key)
- `vitalisId` (STRING, UNIQUE, NOT NULL) - Format: VTL-YYYY-XXXXX
- `firstName` (STRING, NOT NULL)
- `lastName` (STRING, NOT NULL)
- `dateOfBirth` (DATE, NOT NULL)
- `gender` (ENUM: 'M', 'F', NOT NULL)
- `phone` (STRING, NOT NULL)
- `email` (STRING, NULLABLE)
- `address` (TEXT, NULLABLE)
- `emergencyContact` (STRING, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `hasMany` Consultation
- `hasMany` LabRequest
- `hasMany` ImagingRequest
- `hasMany` Prescription
- `hasMany` Payment
- `hasMany` DoctorAssignment
- `hasMany` ConsultationDossier
- `hasOne` Bed (via patientId)

**Indexes**:
- Index unique sur `vitalisId`
- Index sur `phone`
- Index sur `email`

### 3. Consultation (Consultation)

**Table**: `consultations`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `status` (ENUM: 'waiting', 'in_progress', 'completed', NOT NULL)
- `symptoms` (TEXT, NULLABLE)
- `vitals` (JSON, NULLABLE) - {temperature, bloodPressure, heartRate, weight, height}
- `diagnosis` (TEXT, NULLABLE)
- `notes` (TEXT, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` User (doctor)
- `hasMany` LabRequest
- `hasMany` ImagingRequest
- `hasMany` Prescription
- `hasOne` ConsultationDossier

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`

### 4. LabRequest (Demande de Laboratoire)

**Table**: `lab_requests`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `consultationId` (UUID, Foreign Key → consultations.id, NULLABLE)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `labTechnicianId` (UUID, Foreign Key → users.id, NULLABLE)
- `status` (ENUM: 'pending', 'sent_to_doctor', NOT NULL)
- `totalAmount` (DECIMAL(10,2), NOT NULL)
- `paymentId` (UUID, Foreign Key → payments.id, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` Consultation
- `belongsTo` User (doctor)
- `belongsTo` User (labTechnician)
- `belongsTo` Payment
- `hasMany` LabRequestExam (table de liaison)
- `hasMany` LabResult

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`
- Index sur `paymentId`

### 5. LabExam (Examen de Laboratoire - Catalogue)

**Table**: `lab_exams`

**Champs**:
- `id` (UUID, Primary Key)
- `name` (STRING, NOT NULL)
- `category` (STRING, NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL)
- `description` (TEXT, NULLABLE)
- `isActive` (BOOLEAN, DEFAULT true)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `hasMany` LabRequestExam

**Indexes**:
- Index sur `category`
- Index sur `isActive`

### 6. LabRequestExam (Table de liaison)

**Table**: `lab_request_exams`

**Champs**:
- `id` (UUID, Primary Key)
- `labRequestId` (UUID, Foreign Key → lab_requests.id, NOT NULL)
- `labExamId` (UUID, Foreign Key → lab_exams.id, NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL) - Prix au moment de la demande
- `createdAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` LabRequest
- `belongsTo` LabExam

**Indexes**:
- Index composite unique sur `[labRequestId, labExamId]`

### 7. LabResult (Résultat de Laboratoire)

**Table**: `lab_results`

**Champs**:
- `id` (UUID, Primary Key)
- `labRequestId` (UUID, Foreign Key → lab_requests.id, NOT NULL)
- `status` (ENUM: 'draft', 'validated', 'sent', NOT NULL)
- `results` (JSON, NOT NULL) - Structure des résultats
- `technicianNotes` (TEXT, NULLABLE)
- `validatedBy` (UUID, Foreign Key → users.id, NULLABLE)
- `validatedAt` (DATE, NULLABLE)
- `sentAt` (DATE, NULLABLE)
- `completedAt` (DATE, NOT NULL)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` LabRequest
- `belongsTo` User (validatedBy)

**Indexes**:
- Index sur `labRequestId`
- Index sur `status`

### 8. ImagingRequest (Demande d'Imagerie)

**Table**: `imaging_requests`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `consultationId` (UUID, Foreign Key → consultations.id, NULLABLE)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `labTechnicianId` (UUID, Foreign Key → users.id, NULLABLE)
- `status` (ENUM: 'pending', 'sent_to_doctor', NOT NULL)
- `totalAmount` (DECIMAL(10,2), NOT NULL)
- `paymentId` (UUID, Foreign Key → payments.id, NULLABLE)
- `results` (TEXT, NULLABLE) - URL ou description des résultats
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` Consultation
- `belongsTo` User (doctor)
- `belongsTo` User (labTechnician)
- `belongsTo` Payment
- `hasMany` ImagingRequestExam

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`

### 9. ImagingExam (Examen d'Imagerie - Catalogue)

**Table**: `imaging_exams`

**Champs**:
- `id` (UUID, Primary Key)
- `name` (STRING, NOT NULL)
- `category` (STRING, NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL)
- `description` (TEXT, NULLABLE)
- `isActive` (BOOLEAN, DEFAULT true)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `hasMany` ImagingRequestExam

**Indexes**:
- Index sur `category`
- Index sur `isActive`

### 10. ImagingRequestExam (Table de liaison)

**Table**: `imaging_request_exams`

**Champs**:
- `id` (UUID, Primary Key)
- `imagingRequestId` (UUID, Foreign Key → imaging_requests.id, NOT NULL)
- `imagingExamId` (UUID, Foreign Key → imaging_exams.id, NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL)
- `createdAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` ImagingRequest
- `belongsTo` ImagingExam

**Indexes**:
- Index composite unique sur `[imagingRequestId, imagingExamId]`

### 11. Prescription (Ordonnance)

**Table**: `prescriptions`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `consultationId` (UUID, Foreign Key → consultations.id, NULLABLE)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `status` (ENUM: 'draft', 'sent_to_pharmacy', 'completed', NOT NULL)
- `notes` (TEXT, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` Consultation
- `belongsTo` User (doctor)
- `hasMany` PrescriptionItem

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`

### 12. PrescriptionItem (Article d'Ordonnance)

**Table**: `prescription_items`

**Champs**:
- `id` (UUID, Primary Key)
- `prescriptionId` (UUID, Foreign Key → prescriptions.id, NOT NULL)
- `medication` (STRING, NOT NULL)
- `dosage` (STRING, NOT NULL)
- `frequency` (STRING, NOT NULL)
- `duration` (STRING, NOT NULL)
- `quantity` (STRING, NOT NULL)
- `instructions` (TEXT, NULLABLE)
- `createdAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Prescription

**Indexes**:
- Index sur `prescriptionId`

### 13. PharmacyProduct (Produit de Pharmacie)

**Table**: `pharmacy_products`

**Champs**:
- `id` (UUID, Primary Key)
- `name` (STRING, NOT NULL)
- `category` (STRING, NOT NULL)
- `price` (DECIMAL(10,2), NOT NULL)
- `stock` (INTEGER, NOT NULL, DEFAULT 0)
- `minStock` (INTEGER, NOT NULL, DEFAULT 0)
- `unit` (STRING, NOT NULL) - 'boîte', 'flacon', etc.
- `expiryDate` (DATE, NULLABLE)
- `isActive` (BOOLEAN, DEFAULT true)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `hasMany` PaymentItem (pour les paiements pharmacie)

**Indexes**:
- Index sur `category`
- Index sur `isActive`
- Index sur `stock`

### 14. Payment (Paiement)

**Table**: `payments`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `amount` (DECIMAL(10,2), NOT NULL)
- `method` (ENUM: 'cash', 'orange_money', NOT NULL)
- `status` (ENUM: 'pending', 'paid', 'cancelled', NOT NULL)
- `type` (ENUM: 'consultation', 'lab', 'imaging', 'pharmacy', NOT NULL)
- `reference` (STRING, NULLABLE) - Référence Orange Money
- `relatedId` (UUID, NULLABLE) - ID de la ressource liée (consultation, lab_request, etc.)
- `createdBy` (UUID, Foreign Key → users.id, NOT NULL)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` User (createdBy)
- `hasMany` PaymentItem (pour les paiements pharmacie)
- `hasOne` LabRequest
- `hasOne` ImagingRequest

**Indexes**:
- Index sur `patientId`
- Index sur `status`
- Index sur `type`
- Index sur `createdAt`

### 15. PaymentItem (Article de Paiement Pharmacie)

**Table**: `payment_items`

**Champs**:
- `id` (UUID, Primary Key)
- `paymentId` (UUID, Foreign Key → payments.id, NOT NULL)
- `productId` (UUID, Foreign Key → pharmacy_products.id, NOT NULL)
- `quantity` (INTEGER, NOT NULL)
- `unitPrice` (DECIMAL(10,2), NOT NULL)
- `totalPrice` (DECIMAL(10,2), NOT NULL)
- `createdAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Payment
- `belongsTo` PharmacyProduct

**Indexes**:
- Index sur `paymentId`
- Index sur `productId`

### 16. DoctorAssignment (Assignation Médecin)

**Table**: `doctor_assignments`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `paymentId` (UUID, Foreign Key → payments.id, NOT NULL)
- `status` (ENUM: 'assigned', 'in_consultation', 'completed', NOT NULL)
- `createdBy` (UUID, Foreign Key → users.id, NOT NULL)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` User (doctor)
- `belongsTo` Payment
- `belongsTo` User (createdBy)
- `hasOne` ConsultationDossier

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`

### 17. ConsultationDossier (Dossier de Consultation)

**Table**: `consultation_dossiers`

**Champs**:
- `id` (UUID, Primary Key)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `assignmentId` (UUID, Foreign Key → doctor_assignments.id, NOT NULL)
- `status` (ENUM: 'active', 'completed', 'archived', NOT NULL)
- `consultationId` (UUID, Foreign Key → consultations.id, NULLABLE)
- `completedAt` (DATE, NULLABLE)
- `archivedAt` (DATE, NULLABLE)
- `archivedBy` (UUID, Foreign Key → users.id, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient
- `belongsTo` User (doctor)
- `belongsTo` DoctorAssignment
- `belongsTo` Consultation
- `belongsTo` User (archivedBy)

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`
- Index sur `status`

### 18. Bed (Lit)

**Table**: `beds`

**Champs**:
- `id` (UUID, Primary Key)
- `number` (STRING, UNIQUE, NOT NULL)
- `type` (ENUM: 'classic', 'vip', NOT NULL)
- `additionalFee` (DECIMAL(10,2), NOT NULL, DEFAULT 0)
- `isOccupied` (BOOLEAN, DEFAULT false)
- `patientId` (UUID, Foreign Key → patients.id, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Patient

**Indexes**:
- Index unique sur `number`
- Index sur `type`
- Index sur `isOccupied`

### 19. CustomItem (Item Personnalisé - Autre)

**Table**: `custom_items`

**Champs**:
- `id` (UUID, Primary Key)
- `consultationId` (UUID, Foreign Key → consultations.id, NULLABLE)
- `patientId` (UUID, Foreign Key → patients.id, NOT NULL)
- `doctorId` (UUID, Foreign Key → users.id, NOT NULL)
- `name` (STRING, NOT NULL)
- `description` (TEXT, NULLABLE)
- `createdAt` (DATE, NOT NULL)
- `updatedAt` (DATE, NOT NULL)

**Relations**:
- `belongsTo` Consultation
- `belongsTo` Patient
- `belongsTo` User (doctor)

**Indexes**:
- Index sur `patientId`
- Index sur `doctorId`

## Relations importantes

### Relations Many-to-Many

1. **LabRequest ↔ LabExam** (via LabRequestExam)
2. **ImagingRequest ↔ ImagingExam** (via ImagingRequestExam)

### Relations One-to-Many principales

1. **Patient** → Consultations, LabRequests, ImagingRequests, Prescriptions, Payments
2. **User (Doctor)** → Consultations, LabRequests, ImagingRequests, Prescriptions
3. **Consultation** → LabRequests, ImagingRequests, Prescriptions
4. **Prescription** → PrescriptionItems
5. **Payment** → PaymentItems

## Validations au niveau modèle

Tous les modèles doivent inclure des validations Sequelize pour :
- Champs requis
- Formats (email, téléphone)
- Valeurs min/max
- Types de données
- Contraintes d'unicité

## Hooks Sequelize

Utiliser les hooks Sequelize pour :
- Génération automatique de `vitalisId` pour les patients
- Hashage des mots de passe avant création
- Mise à jour automatique des stocks lors des paiements
- Mise à jour du statut des lits lors de l'occupation
