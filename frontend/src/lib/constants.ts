import type {
  Role,
  VisitStatus,
  SampleStatus,
  ResultStatus,
  ReportStatus,
  InvoiceStatus,
  TestCategory,
  SampleType,
  Gender,
  PaymentMethod,
} from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  RECEPTIONIST: 'Receptionist',
  LAB_TECHNICIAN: 'Lab Technician',
  PATHOLOGIST: 'Pathologist',
  PATIENT: 'Patient',
  CLIENT: 'Client',
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  REGISTERED: 'Registered',
  SAMPLES_COLLECTED: 'Samples Collected',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  PENDING_COLLECTION: 'Pending Collection',
  COLLECTED: 'Collected',
  IN_LAB: 'In Lab',
  PROCESSED: 'Processed',
  REJECTED: 'Rejected',
};

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  PENDING: 'Pending',
  ENTERED: 'Entered',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pending',
  GENERATED: 'Generated',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const TEST_CATEGORY_LABELS: Record<TestCategory, string> = {
  HEMATOLOGY: 'Hematology',
  BIOCHEMISTRY: 'Biochemistry',
  MICROBIOLOGY: 'Microbiology',
  PATHOLOGY: 'Pathology',
  IMMUNOLOGY: 'Immunology',
  RADIOLOGY: 'Radiology',
  MOLECULAR: 'Molecular',
  OTHER: 'Other',
};

export const SAMPLE_TYPE_LABELS: Record<SampleType, string> = {
  BLOOD: 'Blood',
  URINE: 'Urine',
  STOOL: 'Stool',
  SWAB: 'Swab',
  SPUTUM: 'Sputum',
  TISSUE: 'Tissue',
  CSF: 'CSF',
  OTHER: 'Other',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  ONLINE: 'Online',
  INSURANCE: 'Insurance',
};

// Status badge color mapping
export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  REGISTERED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  SAMPLES_COLLECTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  PENDING_COLLECTION: 'bg-muted/30 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  COLLECTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IN_LAB: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  PROCESSED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const RESULT_STATUS_COLORS: Record<ResultStatus, string> = {
  PENDING: 'bg-muted/30 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  ENTERED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING: 'bg-muted/30 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  GENERATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: 'bg-muted/30 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PARTIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

// Navigation based on role
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Patients',
    href: '/dashboard/patients',
    icon: 'Users',
    roles: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Visits',
    href: '/dashboard/visits',
    icon: 'ClipboardList',
    roles: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Test Catalog',
    href: '/dashboard/tests',
    icon: 'FlaskConical',
    roles: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Test Orders',
    href: '/dashboard/test-orders',
    icon: 'FileText',
    roles: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Samples',
    href: '/dashboard/samples',
    icon: 'TestTube',
    roles: ['ADMIN', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Results',
    href: '/dashboard/results',
    icon: 'FileCheck',
    roles: ['ADMIN', 'LAB_TECHNICIAN', 'PATHOLOGIST'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: 'FileOutput',
    roles: ['ADMIN', 'LAB_TECHNICIAN', 'PATHOLOGIST', 'RECEPTIONIST'],
  },
  {
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: 'Receipt',
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  { label: 'Users', href: '/dashboard/users', icon: 'Shield', roles: ['ADMIN'] },
  { label: 'Clients', href: '/dashboard/clients', icon: 'Building', roles: ['ADMIN'] },
  { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: 'Shield', roles: ['ADMIN'] },
  { label: 'Lab Settings', href: '/dashboard/settings/lab', icon: 'Building', roles: ['ADMIN'] },
  { label: 'Billing', href: '/dashboard/settings/billing', icon: 'Receipt', roles: ['ADMIN'] },
  { label: 'My Reports', href: '/dashboard/my-reports', icon: 'FileOutput', roles: ['CLIENT'] },
  { label: 'My Patients', href: '/dashboard/my-patients', icon: 'Users', roles: ['CLIENT'] },
  {
    label: 'Test Requests',
    href: '/dashboard/test-requests',
    icon: 'ClipboardList',
    roles: ['CLIENT'],
  },
];
