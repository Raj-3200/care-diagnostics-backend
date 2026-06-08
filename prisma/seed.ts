import {
  PrismaClient,
  Gender,
  InvoiceStatus,
  PaymentMethod,
  PlanTier,
  ReportStatus,
  ResultStatus,
  Role,
  SampleStatus,
  SampleType,
  TestCategory,
  VisitStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Admin@1234';

async function upsertUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
}) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      phone: data.phone,
      isActive: true,
      tenantId: TENANT_ID,
    },
    create: {
      ...data,
      tenantId: TENANT_ID,
      password,
      isActive: true,
    },
  });
}

async function upsertVisit(data: {
  visitNumber: string;
  patientId: string;
  createdById: string;
  status: VisitStatus;
  notes?: string;
}) {
  return prisma.visit.upsert({
    where: { visitNumber: data.visitNumber },
    update: {
      patientId: data.patientId,
      createdById: data.createdById,
      status: data.status,
      notes: data.notes,
      tenantId: TENANT_ID,
    },
    create: {
      ...data,
      tenantId: TENANT_ID,
    },
  });
}

async function upsertOrder(visitId: string, testId: string, notes?: string) {
  const existing = await prisma.testOrder.findFirst({
    where: { visitId, testId, deletedAt: null },
  });
  if (existing) return existing;

  return prisma.testOrder.create({
    data: {
      tenantId: TENANT_ID,
      visitId,
      testId,
      priority: 'NORMAL',
      notes,
    },
  });
}

async function main() {
  const lab = await prisma.tenant.upsert({
    where: { slug: 'care-diagnostics' },
    update: {
      name: 'Care Diagnostics',
      address: '14 MG Road, Bengaluru, Karnataka',
      phone: '+91 98765 43210',
      email: 'admin@carediagnostics.com',
      logoUrl: '/logo.png',
      planTier: PlanTier.PRO,
      isActive: true,
      settings: {
        reportPrefix: 'RPT',
        invoicePrefix: 'INV',
        planTier: 'PRO',
      },
    },
    create: {
      id: TENANT_ID,
      name: 'Care Diagnostics',
      slug: 'care-diagnostics',
      address: '14 MG Road, Bengaluru, Karnataka',
      phone: '+91 98765 43210',
      email: 'admin@carediagnostics.com',
      logoUrl: '/logo.png',
      planTier: PlanTier.PRO,
      settings: {
        reportPrefix: 'RPT',
        invoicePrefix: 'INV',
        planTier: 'PRO',
      },
      isActive: true,
    },
  });

  const [admin, receptionist, technician, pathologist] = await Promise.all([
    upsertUser({
      email: 'admin@carediagnostics.com',
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      phone: '9876543200',
    }),
    upsertUser({
      email: 'reception@carediagnostics.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      role: Role.RECEPTIONIST,
      phone: '9876543201',
    }),
    upsertUser({
      email: 'tech@carediagnostics.com',
      firstName: 'Rahul',
      lastName: 'Verma',
      role: Role.LAB_TECHNICIAN,
      phone: '9876543202',
    }),
    upsertUser({
      email: 'doctor@carediagnostics.com',
      firstName: 'Dr. Anjali',
      lastName: 'Gupta',
      role: Role.PATHOLOGIST,
      phone: '9876543203',
    }),
  ]);

  const patientsData = [
    ['CD-2026-00001', 'Aarav', 'Mehta', '1990-04-12', Gender.MALE, '9876543210'],
    ['CD-2026-00002', 'Isha', 'Nair', '1986-09-23', Gender.FEMALE, '9876543211'],
    ['CD-2026-00003', 'Kabir', 'Rao', '1978-02-03', Gender.MALE, '9876543212'],
    ['CD-2026-00004', 'Meera', 'Kapoor', '1995-12-18', Gender.FEMALE, '9876543213'],
    ['CD-2026-00005', 'Rohan', 'Das', '2001-06-30', Gender.MALE, '9876543214'],
  ] as const;

  const patients = await Promise.all(
    patientsData.map(([mrn, firstName, lastName, dob, gender, phone]) =>
      prisma.patient.upsert({
        where: { mrn },
        update: {
          firstName,
          lastName,
          dateOfBirth: new Date(dob),
          gender,
          phone,
          tenantId: TENANT_ID,
          registeredById: receptionist.id,
        },
        create: {
          tenantId: TENANT_ID,
          mrn,
          firstName,
          lastName,
          dateOfBirth: new Date(dob),
          gender,
          phone,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          address: 'Bengaluru, Karnataka',
          bloodGroup: 'O+',
          registeredById: receptionist.id,
        },
      }),
    ),
  );

  const testsData = [
    ['CBC', 'Complete Blood Count', TestCategory.HEMATOLOGY, SampleType.BLOOD, '350', '24 hours'],
    ['LFT', 'Liver Function Test', TestCategory.BIOCHEMISTRY, SampleType.BLOOD, '700', '24 hours'],
    ['KFT', 'Kidney Function Test', TestCategory.BIOCHEMISTRY, SampleType.BLOOD, '650', '24 hours'],
    ['HBA1C', 'HbA1c', TestCategory.BIOCHEMISTRY, SampleType.BLOOD, '500', '24 hours'],
    ['TSH', 'Thyroid Stimulating Hormone', TestCategory.IMMUNOLOGY, SampleType.BLOOD, '450', '24 hours'],
    ['URM', 'Urine Routine Microscopy', TestCategory.PATHOLOGY, SampleType.URINE, '250', '12 hours'],
    ['BGRP', 'Blood Group', TestCategory.HEMATOLOGY, SampleType.BLOOD, '200', '6 hours'],
    ['LIPID', 'Lipid Profile', TestCategory.BIOCHEMISTRY, SampleType.BLOOD, '800', '24 hours'],
    ['CRP', 'C-Reactive Protein', TestCategory.IMMUNOLOGY, SampleType.BLOOD, '600', '24 hours'],
    ['WIDAL', 'Widal Test', TestCategory.MICROBIOLOGY, SampleType.BLOOD, '450', '24 hours'],
  ] as const;

  const tests = await Promise.all(
    testsData.map(([code, name, category, sampleType, price, turnaroundTime]) =>
      prisma.test.upsert({
        where: { code },
        update: {
          name,
          category,
          sampleType,
          price,
          turnaroundTime,
          isActive: true,
          tenantId: TENANT_ID,
        },
        create: {
          tenantId: TENANT_ID,
          code,
          name,
          category,
          sampleType,
          price,
          turnaroundTime,
          isActive: true,
          department: category,
          description: `${name} diagnostic test`,
        },
      }),
    ),
  );

  const visits = await Promise.all([
    upsertVisit({
      visitNumber: 'CD-VIS-20260608-0001',
      patientId: patients[0].id,
      createdById: receptionist.id,
      status: VisitStatus.COMPLETED,
      notes: 'Routine annual checkup',
    }),
    upsertVisit({
      visitNumber: 'CD-VIS-20260608-0002',
      patientId: patients[1].id,
      createdById: receptionist.id,
      status: VisitStatus.IN_PROGRESS,
      notes: 'Fever evaluation',
    }),
    upsertVisit({
      visitNumber: 'CD-VIS-20260608-0003',
      patientId: patients[2].id,
      createdById: receptionist.id,
      status: VisitStatus.SAMPLES_COLLECTED,
      notes: 'Diabetes follow-up',
    }),
  ]);

  const orders = await Promise.all([
    upsertOrder(visits[0].id, tests[0].id, 'CBC ordered'),
    upsertOrder(visits[1].id, tests[8].id, 'CRP ordered'),
    upsertOrder(visits[2].id, tests[3].id, 'HbA1c ordered'),
  ]);

  const samples = await Promise.all(
    orders.map((order, index) =>
      prisma.sample.upsert({
        where: { testOrderId: order.id },
        update: {
          status: index === 2 ? SampleStatus.COLLECTED : SampleStatus.PROCESSED,
          collectedAt: new Date(),
          collectedById: technician.id,
          tenantId: TENANT_ID,
        },
        create: {
          tenantId: TENANT_ID,
          testOrderId: order.id,
          barcode: `SMP-20260608-${String(index + 1).padStart(4, '0')}`,
          sampleType: tests[index === 1 ? 8 : index === 2 ? 3 : 0].sampleType,
          status: index === 2 ? SampleStatus.COLLECTED : SampleStatus.PROCESSED,
          collectedAt: new Date(),
          collectedById: technician.id,
        },
      }),
    ),
  );

  await Promise.all([
    prisma.result.upsert({
      where: { testOrderId: orders[0].id },
      update: {
        value: '13.6',
        unit: 'g/dL',
        referenceRange: '12-16',
        isAbnormal: false,
        status: ResultStatus.VERIFIED,
        enteredById: technician.id,
        enteredAt: new Date(),
        verifiedById: pathologist.id,
        verifiedAt: new Date(),
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        testOrderId: orders[0].id,
        value: '13.6',
        unit: 'g/dL',
        referenceRange: '12-16',
        isAbnormal: false,
        status: ResultStatus.VERIFIED,
        enteredById: technician.id,
        enteredAt: new Date(),
        verifiedById: pathologist.id,
        verifiedAt: new Date(),
      },
    }),
    prisma.result.upsert({
      where: { testOrderId: orders[1].id },
      update: {
        value: '98',
        unit: 'mg/L',
        referenceRange: '<10',
        isAbnormal: true,
        status: ResultStatus.VERIFIED,
        remarks: 'CRITICAL: urgent clinical attention required',
        enteredById: technician.id,
        enteredAt: new Date(),
        verifiedById: pathologist.id,
        verifiedAt: new Date(),
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        testOrderId: orders[1].id,
        value: '98',
        unit: 'mg/L',
        referenceRange: '<10',
        isAbnormal: true,
        status: ResultStatus.VERIFIED,
        remarks: 'CRITICAL: urgent clinical attention required',
        enteredById: technician.id,
        enteredAt: new Date(),
        verifiedById: pathologist.id,
        verifiedAt: new Date(),
      },
    }),
    prisma.result.upsert({
      where: { testOrderId: orders[2].id },
      update: {
        value: '7.8',
        unit: '%',
        referenceRange: '<5.7',
        isAbnormal: true,
        status: ResultStatus.ENTERED,
        enteredById: technician.id,
        enteredAt: new Date(),
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        testOrderId: orders[2].id,
        value: '7.8',
        unit: '%',
        referenceRange: '<5.7',
        isAbnormal: true,
        status: ResultStatus.ENTERED,
        enteredById: technician.id,
        enteredAt: new Date(),
      },
    }),
  ]);

  await Promise.all([
    prisma.report.upsert({
      where: { visitId: visits[0].id },
      update: {
        reportNumber: 'RPT-2026-00001',
        status: ReportStatus.DISPATCHED,
        generatedAt: new Date(),
        approvedById: pathologist.id,
        approvedAt: new Date(),
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        visitId: visits[0].id,
        reportNumber: 'RPT-2026-00001',
        status: ReportStatus.DISPATCHED,
        generatedAt: new Date(),
        approvedById: pathologist.id,
        approvedAt: new Date(),
      },
    }),
    prisma.report.upsert({
      where: { visitId: visits[1].id },
      update: {
        reportNumber: 'RPT-2026-00002',
        status: ReportStatus.PENDING,
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        visitId: visits[1].id,
        reportNumber: 'RPT-2026-00002',
        status: ReportStatus.PENDING,
      },
    }),
  ]);

  await Promise.all([
    prisma.invoice.upsert({
      where: { visitId: visits[0].id },
      update: {
        invoiceNumber: 'INV-2026-00001',
        totalAmount: '350',
        discountAmount: '0',
        taxAmount: '0',
        netAmount: '350',
        paidAmount: '350',
        dueAmount: '0',
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.UPI,
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        visitId: visits[0].id,
        invoiceNumber: 'INV-2026-00001',
        totalAmount: '350',
        discountAmount: '0',
        taxAmount: '0',
        netAmount: '350',
        paidAmount: '350',
        dueAmount: '0',
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.UPI,
      },
    }),
    prisma.invoice.upsert({
      where: { visitId: visits[1].id },
      update: {
        invoiceNumber: 'INV-2026-00002',
        totalAmount: '600',
        discountAmount: '0',
        taxAmount: '0',
        netAmount: '600',
        paidAmount: '0',
        dueAmount: '600',
        status: InvoiceStatus.PENDING,
        tenantId: TENANT_ID,
      },
      create: {
        tenantId: TENANT_ID,
        visitId: visits[1].id,
        invoiceNumber: 'INV-2026-00002',
        totalAmount: '600',
        discountAmount: '0',
        taxAmount: '0',
        netAmount: '600',
        paidAmount: '0',
        dueAmount: '600',
        status: InvoiceStatus.PENDING,
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_COMPLETED',
      entity: 'Tenant',
      entityId: lab.id,
      newValue: {
        patients: patients.length,
        tests: tests.length,
        visits: visits.length,
        samples: samples.length,
      },
    },
  });

  console.log('Seed completed.');
  console.log(`Admin: ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`Receptionist: ${receptionist.email} / ${DEMO_PASSWORD}`);
  console.log(`Technician: ${technician.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
