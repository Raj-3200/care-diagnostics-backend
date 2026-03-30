import * as patientRepository from './patient.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { PaginationParams } from '../../shared/types/common.types.js';
import { prisma } from '../../config/database.js';
import { CONSTANTS } from '../../config/constants.js';
import { generateMRN } from '../../shared/utils/generateMRN.js';
import { CreatePatientInput, UpdatePatientInput } from './patient.validators.js';
import { env } from '../../config/env.js';

/**
 * Register a new patient with auto-generated MRN
 *
 * This is a critical operation in the LIMS workflow:
 * - Called by receptionist at patient intake
 * - Must check for duplicates (phone, email if provided)
 * - Generates unique MRN
 * - Creates audit trail for compliance
 */
export const registerPatient = async (data: CreatePatientInput, registeredByUserId: string) => {
  // Check for existing patient with same phone
  const existingByPhone = await prisma.patient.findFirst({
    where: { phone: data.phone, deletedAt: null },
  });

  if (existingByPhone) {
    throw new ConflictError('Patient with this phone number already exists');
  }

  // Check for existing patient with same email (if provided)
  if (data.email) {
    const existingByEmail = await prisma.patient.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (existingByEmail) {
      throw new ConflictError('Patient with this email already exists');
    }
  }

  // Generate unique MRN
  const mrn = await generateMRN();

  // Create patient
  const patient = await patientRepository.create({
    ...data,
    tenantId: env.DEFAULT_TENANT_ID,
    mrn,
    dateOfBirth: new Date(data.dateOfBirth),
    registeredById: registeredByUserId,
    email: data.email || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    pincode: data.pincode || null,
    bloodGroup: data.bloodGroup || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: registeredByUserId,
      action: CONSTANTS.AUDIT_ACTIONS.PATIENT_CREATED,
      entity: 'Patient',
      entityId: patient.id,
      newValue: {
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
      },
    },
  });

  return patient;
};

/**
 * Get patient by ID with all relationships
 */
export const getPatientById = async (patientId: string) => {
  const patient = await patientRepository.findById(patientId);

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return patient;
};

/**
 * Get patient by MRN
 */
export const getPatientByMRN = async (mrn: string) => {
  const patient = await patientRepository.findByMRN(mrn);

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return patient;
};

/**
 * Search patients with pagination
 * Receptionist can search for patients by name, MRN, phone, or email
 */
export const searchPatients = async (
  pagination: PaginationParams,
  filters?: { searchTerm?: string },
) => {
  return patientRepository.findAll(pagination, filters);
};

/**
 * Update patient information
 * Only certain fields can be updated (demographics, emergency contact)
 * MRN is immutable for audit trail integrity
 */
export const updatePatient = async (
  patientId: string,
  data: UpdatePatientInput,
  updatedByUserId: string,
  _skipAudit = false, // For specific scenarios where audit is not needed
) => {
  // Verify patient exists
  const existingPatient = await patientRepository.findById(patientId);
  if (!existingPatient) {
    throw new NotFoundError('Patient not found');
  }

  // Check for phone duplication if phone is being updated
  if (data.phone && data.phone !== existingPatient.phone) {
    const patientWithPhone = await prisma.patient.findFirst({
      where: { phone: data.phone, deletedAt: null, id: { not: patientId } },
    });

    if (patientWithPhone) {
      throw new ConflictError('Phone number already registered to another patient');
    }
  }

  // Check for email duplication if email is being updated
  if (data.email && data.email !== existingPatient.email) {
    const patientWithEmail = await prisma.patient.findFirst({
      where: { email: data.email, deletedAt: null, id: { not: patientId } },
    });

    if (patientWithEmail) {
      throw new ConflictError('Email already registered to another patient');
    }
  }

  // Prepare update data (convert dateOfBirth if provided)
  const updateData: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: UpdatePatientInput['gender'];
    phone?: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    bloodGroup?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  } = { ...data, dateOfBirth: undefined };
  if (data.dateOfBirth) {
    updateData.dateOfBirth = new Date(data.dateOfBirth);
  }

  // Update patient
  const updatedPatient = await patientRepository.update(patientId, updateData);

  // Create audit log
  if (!_skipAudit) {
    await prisma.auditLog.create({
      data: {
        userId: updatedByUserId,
        action: CONSTANTS.AUDIT_ACTIONS.PATIENT_UPDATED,
        entity: 'Patient',
        entityId: patientId,
        oldValue: existingPatient,
        newValue: updatedPatient,
      },
    });
  }

  return updatedPatient;
};

/**
 * Soft delete patient record
 * In medical systems, actual deletion is never done—only soft delete with audit trail
 */
export const deletePatient = async (patientId: string, deletedByUserId: string) => {
  // Verify patient exists
  const existingPatient = await patientRepository.findById(patientId);
  if (!existingPatient) {
    throw new NotFoundError('Patient not found');
  }

  // Check if patient has active visits (cannot delete if visits exist)
  const activeVisits = await prisma.visit.count({
    where: { patientId, deletedAt: null },
  });

  if (activeVisits > 0) {
    throw new ConflictError(
      'Cannot delete patient with active visits. Please close or cancel all visits first.',
    );
  }

  // Soft delete
  await patientRepository.softDelete(patientId);

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: deletedByUserId,
      action: CONSTANTS.AUDIT_ACTIONS.PATIENT_DELETED,
      entity: 'Patient',
      entityId: patientId,
      oldValue: { mrn: existingPatient.mrn, firstName: existingPatient.firstName },
    },
  });
};
