-- ============================================================
-- Production Upgrade Migration
-- Adds: RefreshToken table, Permission system, EventLog,
--        Notification tracking, performance indexes, 
--        multi-tenancy support (tenant_id)
-- ============================================================

-- 1. Tenant / Lab support (multi-tenancy)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed a default tenant for existing data
INSERT INTO tenants (id, name, slug, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Care Diagnostics', 'care-diagnostics', 'admin@carediagnostics.com')
ON CONFLICT (slug) DO NOTHING;

-- Add tenant_id to all core tables (nullable first for migration safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE test_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE samples ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill existing data to default tenant
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE patients SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE visits SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE test_orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE samples SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE results SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE reports SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE tests SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Now make tenant_id NOT NULL
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE visits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE test_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE samples ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE results ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tests ALTER COLUMN tenant_id SET NOT NULL;

-- Tenant isolation indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visits_tenant ON visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_orders_tenant ON test_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_samples_tenant ON samples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_results_tenant ON results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tests_tenant ON tests(tenant_id);

-- 2. Refresh Token table (secure token rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(500),
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- 3. Permission system (RBAC + PBAC)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role, tenant_id);

-- Seed default permissions
INSERT INTO permissions (code, name, module, description) VALUES
  -- Patient
  ('patient.create', 'Create Patient', 'patient', 'Register new patients'),
  ('patient.read', 'View Patient', 'patient', 'View patient details'),
  ('patient.update', 'Update Patient', 'patient', 'Update patient demographics'),
  ('patient.delete', 'Delete Patient', 'patient', 'Soft-delete patient records'),
  -- Visit
  ('visit.create', 'Create Visit', 'visit', 'Register new visits'),
  ('visit.read', 'View Visit', 'visit', 'View visit details'),
  ('visit.update', 'Update Visit', 'visit', 'Modify visit data'),
  ('visit.delete', 'Delete Visit', 'visit', 'Soft-delete visits'),
  ('visit.status', 'Change Visit Status', 'visit', 'Transition visit status'),
  -- Test
  ('test.create', 'Create Test', 'test', 'Add test definitions'),
  ('test.read', 'View Test', 'test', 'View test catalog'),
  ('test.update', 'Update Test', 'test', 'Modify test definitions'),
  ('test.delete', 'Delete Test', 'test', 'Remove test definitions'),
  -- Test Order
  ('testorder.create', 'Create Test Order', 'testorder', 'Order tests for visits'),
  ('testorder.read', 'View Test Order', 'testorder', 'View test orders'),
  ('testorder.update', 'Update Test Order', 'testorder', 'Modify test orders'),
  ('testorder.delete', 'Cancel Test Order', 'testorder', 'Cancel test orders'),
  -- Sample
  ('sample.create', 'Create Sample', 'sample', 'Initialize sample collection'),
  ('sample.read', 'View Sample', 'sample', 'View sample details'),
  ('sample.collect', 'Collect Sample', 'sample', 'Record sample collection'),
  ('sample.receive', 'Receive in Lab', 'sample', 'Mark sample received in lab'),
  ('sample.process', 'Process Sample', 'sample', 'Mark sample as processed'),
  ('sample.reject', 'Reject Sample', 'sample', 'Reject a sample'),
  -- Result
  ('result.create', 'Create Result', 'result', 'Initialize result entry'),
  ('result.read', 'View Result', 'result', 'View result details'),
  ('result.enter', 'Enter Result', 'result', 'Enter result values'),
  ('result.verify', 'Verify Result', 'result', 'Approve/verify results'),
  ('result.reject', 'Reject Result', 'result', 'Reject entered results'),
  -- Report
  ('report.create', 'Create Report', 'report', 'Initialize report'),
  ('report.read', 'View Report', 'report', 'View report details'),
  ('report.generate', 'Generate Report', 'report', 'Generate report PDF'),
  ('report.approve', 'Approve Report', 'report', 'Approve final report'),
  ('report.dispatch', 'Dispatch Report', 'report', 'Mark report as dispatched'),
  ('report.delete', 'Delete Report', 'report', 'Remove pending report'),
  -- Invoice
  ('invoice.create', 'Create Invoice', 'invoice', 'Generate invoices'),
  ('invoice.read', 'View Invoice', 'invoice', 'View invoice details'),
  ('invoice.payment', 'Record Payment', 'invoice', 'Record invoice payments'),
  ('invoice.discount', 'Apply Discount', 'invoice', 'Apply discounts'),
  ('invoice.cancel', 'Cancel Invoice', 'invoice', 'Cancel invoices'),
  ('invoice.refund', 'Refund Invoice', 'invoice', 'Process refunds'),
  ('invoice.delete', 'Delete Invoice', 'invoice', 'Remove pending invoices'),
  -- User
  ('user.create', 'Create User', 'user', 'Add staff users'),
  ('user.read', 'View User', 'user', 'View user details'),
  ('user.update', 'Update User', 'user', 'Modify user data'),
  ('user.delete', 'Delete User', 'user', 'Deactivate users'),
  -- AI
  ('ai.chat', 'Use AI Assistant', 'ai', 'Access AI workflow assistant'),
  -- Dashboard
  ('dashboard.view', 'View Dashboard', 'dashboard', 'Access dashboard stats')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles for default tenant
-- ADMIN gets everything
INSERT INTO role_permissions (role, permission_id, tenant_id)
SELECT 'ADMIN', p.id, '00000000-0000-0000-0000-000000000001'
FROM permissions p
ON CONFLICT DO NOTHING;

-- RECEPTIONIST
INSERT INTO role_permissions (role, permission_id, tenant_id)
SELECT 'RECEPTIONIST', p.id, '00000000-0000-0000-0000-000000000001'
FROM permissions p
WHERE p.code IN (
  'patient.create', 'patient.read', 'patient.update',
  'visit.create', 'visit.read', 'visit.update', 'visit.status',
  'test.read',
  'testorder.create', 'testorder.read', 'testorder.update', 'testorder.delete',
  'sample.read',
  'result.read',
  'report.read', 'report.dispatch',
  'invoice.create', 'invoice.read', 'invoice.payment', 'invoice.discount',
  'ai.chat', 'dashboard.view'
)
ON CONFLICT DO NOTHING;

-- LAB_TECHNICIAN
INSERT INTO role_permissions (role, permission_id, tenant_id)
SELECT 'LAB_TECHNICIAN', p.id, '00000000-0000-0000-0000-000000000001'
FROM permissions p
WHERE p.code IN (
  'patient.read',
  'visit.read', 'visit.status',
  'test.read',
  'testorder.create', 'testorder.read',
  'sample.create', 'sample.read', 'sample.collect', 'sample.receive', 'sample.process', 'sample.reject',
  'result.create', 'result.read', 'result.enter',
  'report.create', 'report.read', 'report.generate',
  'ai.chat', 'dashboard.view'
)
ON CONFLICT DO NOTHING;

-- PATHOLOGIST
INSERT INTO role_permissions (role, permission_id, tenant_id)
SELECT 'PATHOLOGIST', p.id, '00000000-0000-0000-0000-000000000001'
FROM permissions p
WHERE p.code IN (
  'patient.read',
  'visit.read',
  'test.read',
  'testorder.read',
  'sample.read',
  'result.read', 'result.verify', 'result.reject',
  'report.read', 'report.approve',
  'ai.chat', 'dashboard.view'
)
ON CONFLICT DO NOTHING;

-- 4. Event Log (event-driven system)
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_unprocessed ON event_logs(event_type, created_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_event_logs_entity ON event_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_tenant ON event_logs(tenant_id);

-- 5. Notification tracking
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success', 'urgent'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity VARCHAR(100),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

-- 6. Additional performance indexes

-- Fast patient search (active only)
CREATE INDEX IF NOT EXISTS idx_patients_active_name ON patients(first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone) WHERE deleted_at IS NULL;

-- Visit date lookup
CREATE INDEX IF NOT EXISTS idx_visits_created_active ON visits(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visits_status_active ON visits(status) WHERE deleted_at IS NULL;

-- Sample workflow queues
CREATE INDEX IF NOT EXISTS idx_samples_status_active ON samples(status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_samples_collected_by ON samples(collected_by_id) WHERE deleted_at IS NULL;

-- Result workflow queues
CREATE INDEX IF NOT EXISTS idx_results_status_active ON results(status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_results_entered_by ON results(entered_by_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_results_verified_by ON results(verified_by_id) WHERE deleted_at IS NULL;

-- Invoice tracking
CREATE INDEX IF NOT EXISTS idx_invoices_status_active ON invoices(status) WHERE deleted_at IS NULL;

-- Audit log performance  
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_time ON audit_logs(entity, entity_id, created_at DESC);

-- Users active lookup
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
