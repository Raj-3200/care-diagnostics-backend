-- Prevent duplicate active orders for the same visit and test.
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_orders_visit_test_active
ON test_orders (visit_id, test_id)
WHERE deleted_at IS NULL;

-- Speed up active test-order lookups by visit in workflow APIs.
CREATE INDEX IF NOT EXISTS idx_test_orders_visit_active_created
ON test_orders (visit_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Speed up report listing and status dashboards.
CREATE INDEX IF NOT EXISTS idx_reports_status_active_created
ON reports (status, created_at DESC)
WHERE deleted_at IS NULL;

-- Speed up pending/verification worklists for result processing.
CREATE INDEX IF NOT EXISTS idx_results_status_active_updated
ON results (status, updated_at DESC)
WHERE deleted_at IS NULL;
