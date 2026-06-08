// ==================== ENUMS ====================

export type Role =
  | 'ADMIN'
  | 'RECEPTIONIST'
  | 'LAB_TECHNICIAN'
  | 'PATHOLOGIST'
  | 'PATIENT'
  | 'CLIENT';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type VisitStatus =
  | 'REGISTERED'
  | 'SAMPLES_COLLECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type SampleStatus = 'PENDING_COLLECTION' | 'COLLECTED' | 'IN_LAB' | 'PROCESSED' | 'REJECTED';
export type ResultStatus = 'PENDING' | 'ENTERED' | 'VERIFIED' | 'REJECTED';
export type ReportStatus = 'PENDING' | 'GENERATED' | 'APPROVED' | 'DISPATCHED';
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'ONLINE' | 'INSURANCE';
export type SampleType =
  | 'BLOOD'
  | 'URINE'
  | 'STOOL'
  | 'SWAB'
  | 'SPUTUM'
  | 'TISSUE'
  | 'CSF'
  | 'OTHER';
export type TestCategory =
  | 'HEMATOLOGY'
  | 'BIOCHEMISTRY'
  | 'MICROBIOLOGY'
  | 'PATHOLOGY'
  | 'IMMUNOLOGY'
  | 'RADIOLOGY'
  | 'MOLECULAR'
  | 'OTHER';
export type PlanTier = 'FREE' | 'BASIC' | 'PRO';

// ==================== API RESPONSE ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ==================== MODELS ====================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  referredByClientId?: string;
  referredByClient?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  registeredBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  visitNumber: string;
  patientId: string;
  status: VisitStatus;
  notes?: string;
  patient?: Patient;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  testOrders?: TestOrder[];
  invoice?: Invoice;
  report?: Report;
  createdAt: string;
  updatedAt: string;
}

export interface Test {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: TestCategory;
  sampleType: SampleType;
  price: number | string;
  turnaroundTime: string;
  isActive: boolean;
  department?: string;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestOrder {
  id: string;
  visitId: string;
  testId: string;
  priority: string;
  notes?: string;
  visit?: Visit;
  test?: Test;
  sample?: Sample;
  result?: Result;
  createdAt: string;
  updatedAt: string;
}

export interface Sample {
  id: string;
  testOrderId: string;
  barcode: string;
  sampleType: SampleType;
  status: SampleStatus;
  collectedAt?: string;
  collectedById?: string;
  rejectionReason?: string;
  notes?: string;
  testOrder?: TestOrder;
  collectedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
}

export interface Result {
  id: string;
  testOrderId: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  remarks?: string;
  status: ResultStatus;
  enteredById?: string;
  enteredAt?: string;
  verifiedById?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  testOrder?: TestOrder;
  enteredBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  verifiedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  visitId: string;
  reportNumber: string;
  status: ReportStatus;
  fileUrl?: string;
  generatedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  notes?: string;
  visit?: Visit;
  approvedBy?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  visitId: string;
  invoiceNumber: string;
  totalAmount: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  netAmount: number | string;
  paidAmount: number | string;
  dueAmount: number | string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  visit?: Visit;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
}

export interface LabSettings {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  planTier: PlanTier;
  settings?: {
    reportPrefix?: string;
    invoicePrefix?: string;
    [key: string]: unknown;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== AUTH ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ==================== CLIENT ====================

export interface ClientReport {
  id: string;
  clientId: string;
  patientId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  client?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  createdAt: string;
  updatedAt: string;
}
