import type { Report, TestOrder } from '@/types';

export interface DiagnosticWorkflow {
  total: number;
  collected: number;
  processed: number;
  entered: number;
  verified: number;
  reportReady: boolean;
  reason: string;
  nextLabel: string;
  nextHref: string;
}

export function getDiagnosticWorkflow(testOrders: TestOrder[] = []): DiagnosticWorkflow {
  const total = testOrders.length;

  const collected = testOrders.filter(
    (order) => order.sample && order.sample.status !== 'PENDING_COLLECTION' && order.sample.status !== 'REJECTED',
  ).length;
  const processed = testOrders.filter((order) => order.sample?.status === 'PROCESSED').length;
  const entered = testOrders.filter(
    (order) =>
      order.result &&
      order.result.status !== 'PENDING' &&
      order.result.status !== 'REJECTED' &&
      order.result.value?.trim(),
  ).length;
  const verified = testOrders.filter(
    (order) => order.result?.status === 'VERIFIED' && order.result.value?.trim(),
  ).length;

  const base = { total, collected, processed, entered, verified };

  if (total === 0) {
    return {
      ...base,
      reportReady: false,
      reason: 'Order tests before creating a report.',
      nextLabel: 'Open Test Orders',
      nextHref: '/dashboard/test-orders',
    };
  }

  if (testOrders.some((order) => order.sample?.status === 'REJECTED')) {
    return {
      ...base,
      reportReady: false,
      reason: 'Resolve rejected samples before reporting.',
      nextLabel: 'Open Samples',
      nextHref: '/dashboard/samples',
    };
  }

  if (collected < total) {
    return {
      ...base,
      reportReady: false,
      reason: `Collect all samples first (${collected}/${total} collected).`,
      nextLabel: 'Open Samples',
      nextHref: '/dashboard/samples',
    };
  }

  if (processed < total) {
    return {
      ...base,
      reportReady: false,
      reason: `Receive and process all samples first (${processed}/${total} processed).`,
      nextLabel: 'Open Samples',
      nextHref: '/dashboard/samples',
    };
  }

  if (testOrders.some((order) => order.result?.status === 'REJECTED')) {
    return {
      ...base,
      reportReady: false,
      reason: 'Resolve rejected results before reporting.',
      nextLabel: 'Open Results',
      nextHref: '/dashboard/results',
    };
  }

  if (entered < total) {
    return {
      ...base,
      reportReady: false,
      reason: `Enter results for all tests first (${entered}/${total} entered).`,
      nextLabel: 'Open Results',
      nextHref: '/dashboard/results',
    };
  }

  if (verified < total) {
    return {
      ...base,
      reportReady: false,
      reason: `Verify all results first (${verified}/${total} verified).`,
      nextLabel: 'Open Results',
      nextHref: '/dashboard/results',
    };
  }

  return {
    ...base,
    reportReady: true,
    reason: 'All results are verified.',
    nextLabel: 'Generate Report',
    nextHref: '/dashboard/reports',
  };
}

export function canDownloadReport(report: Report): boolean {
  return (
    (report.status === 'APPROVED' || report.status === 'DISPATCHED') &&
    getDiagnosticWorkflow(report.visit?.testOrders ?? []).reportReady
  );
}
