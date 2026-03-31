import { PrismaClient, Role, TestCategory, SampleType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const staffPassword = await bcrypt.hash('Staff@123456', 12);

  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

  // ==================== USERS ====================

  const admin = await prisma.user.upsert({
    where: { email: 'admin@carediagnostics.com' },
    update: {},
    create: {
      email: 'admin@carediagnostics.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
    },
  });
  console.log('✅ Admin user:', admin.email);

  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@carediagnostics.com' },
    update: {},
    create: {
      email: 'receptionist@carediagnostics.com',
      password: staffPassword,
      firstName: 'Priya',
      lastName: 'Sharma',
      role: Role.RECEPTIONIST,
      phone: '9876543210',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
    },
  });
  console.log('✅ Receptionist user:', receptionist.email);

  const labTech = await prisma.user.upsert({
    where: { email: 'labtech@carediagnostics.com' },
    update: {},
    create: {
      email: 'labtech@carediagnostics.com',
      password: staffPassword,
      firstName: 'Rahul',
      lastName: 'Verma',
      role: Role.LAB_TECHNICIAN,
      phone: '9876543211',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
    },
  });
  console.log('✅ Lab Technician user:', labTech.email);

  const pathologist = await prisma.user.upsert({
    where: { email: 'pathologist@carediagnostics.com' },
    update: {},
    create: {
      email: 'pathologist@carediagnostics.com',
      password: staffPassword,
      firstName: 'Dr. Anjali',
      lastName: 'Gupta',
      role: Role.PATHOLOGIST,
      phone: '9876543212',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
    },
  });
  console.log('✅ Pathologist user:', pathologist.email);

  const clientPassword = await bcrypt.hash('Client@123456', 12);

  // ==================== CLIENTS ====================
  const clientsData = [
    {
      email: 'apollo@carediagnostics.com',
      firstName: 'Apollo',
      lastName: 'Hospitals',
      phone: '9800000001',
    },
    {
      email: 'maxhealth@carediagnostics.com',
      firstName: 'Max',
      lastName: 'Healthcare',
      phone: '9800000002',
    },
    {
      email: 'fortis@carediagnostics.com',
      firstName: 'Fortis',
      lastName: 'Diagnostics',
      phone: '9800000003',
    },
    {
      email: 'medanta@carediagnostics.com',
      firstName: 'Medanta',
      lastName: 'Labs',
      phone: '9800000004',
    },
    {
      email: 'narayana@carediagnostics.com',
      firstName: 'Narayana',
      lastName: 'Health',
      phone: '9800000005',
    },
  ];

  const clients: (typeof admin)[] = [];
  for (const c of clientsData) {
    const cl = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        ...c,
        password: clientPassword,
        role: Role.CLIENT,
        isActive: true,
        tenantId: DEFAULT_TENANT_ID,
      },
    });
    clients.push(cl);
    console.log(`✅ Client user: ${cl.email}`);
  }

  // ==================== PATIENTS REFERRED BY CLIENTS ====================
  const patientsByClient: {
    clientIdx: number;
    firstName: string;
    lastName: string;
    phone: string;
    gender: 'MALE' | 'FEMALE';
    dob: string;
  }[] = [
    // Apollo patients
    {
      clientIdx: 0,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '9900000001',
      gender: 'MALE',
      dob: '1985-06-15',
    },
    {
      clientIdx: 0,
      firstName: 'Sunita',
      lastName: 'Devi',
      phone: '9900000002',
      gender: 'FEMALE',
      dob: '1990-03-22',
    },
    {
      clientIdx: 0,
      firstName: 'Amit',
      lastName: 'Patel',
      phone: '9900000003',
      gender: 'MALE',
      dob: '1978-11-08',
    },
    // Max Healthcare patients
    {
      clientIdx: 1,
      firstName: 'Priya',
      lastName: 'Singh',
      phone: '9900000004',
      gender: 'FEMALE',
      dob: '1995-01-10',
    },
    {
      clientIdx: 1,
      firstName: 'Vikram',
      lastName: 'Mehta',
      phone: '9900000005',
      gender: 'MALE',
      dob: '1982-07-25',
    },
    // Fortis patients
    {
      clientIdx: 2,
      firstName: 'Anita',
      lastName: 'Gupta',
      phone: '9900000006',
      gender: 'FEMALE',
      dob: '1988-12-30',
    },
    {
      clientIdx: 2,
      firstName: 'Rahul',
      lastName: 'Joshi',
      phone: '9900000007',
      gender: 'MALE',
      dob: '1975-09-14',
    },
    {
      clientIdx: 2,
      firstName: 'Meena',
      lastName: 'Rao',
      phone: '9900000008',
      gender: 'FEMALE',
      dob: '1992-04-05',
    },
    // Medanta patients
    {
      clientIdx: 3,
      firstName: 'Suresh',
      lastName: 'Reddy',
      phone: '9900000009',
      gender: 'MALE',
      dob: '1980-02-18',
    },
    {
      clientIdx: 3,
      firstName: 'Kavita',
      lastName: 'Nair',
      phone: '9900000010',
      gender: 'FEMALE',
      dob: '1997-08-12',
    },
    // Narayana patients
    {
      clientIdx: 4,
      firstName: 'Deepak',
      lastName: 'Sharma',
      phone: '9900000011',
      gender: 'MALE',
      dob: '1983-05-20',
    },
    {
      clientIdx: 4,
      firstName: 'Rekha',
      lastName: 'Mishra',
      phone: '9900000012',
      gender: 'FEMALE',
      dob: '1991-10-03',
    },
  ];

  let mrnCounter = 1;
  for (const p of patientsByClient) {
    const mrn = `MRN-SEED-${String(mrnCounter++).padStart(4, '0')}`;
    await prisma.patient.upsert({
      where: { mrn },
      update: {},
      create: {
        tenantId: DEFAULT_TENANT_ID,
        mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        phone: p.phone,
        registeredById: admin.id,
        referredByClientId: clients[p.clientIdx].id,
      },
    });
  }
  console.log(`✅ Seeded ${patientsByClient.length} patients across ${clientsData.length} clients`);

  // ==================== TEST CATALOG ====================

  const tests = [
    // Hematology
    {
      code: 'CBC',
      name: 'Complete Blood Count',
      description:
        'Measures red blood cells, white blood cells, hemoglobin, hematocrit, and platelets',
      category: TestCategory.HEMATOLOGY,
      sampleType: SampleType.BLOOD,
      price: 350,
      turnaroundTime: '4 hours',
      department: 'Hematology',
      instructions: 'No fasting required',
    },
    {
      code: 'ESR',
      name: 'Erythrocyte Sedimentation Rate',
      description: 'Measures the rate at which red blood cells settle',
      category: TestCategory.HEMATOLOGY,
      sampleType: SampleType.BLOOD,
      price: 150,
      turnaroundTime: '2 hours',
      department: 'Hematology',
      instructions: 'No fasting required',
    },
    {
      code: 'PT-INR',
      name: 'Prothrombin Time with INR',
      description: 'Measures blood clotting time',
      category: TestCategory.HEMATOLOGY,
      sampleType: SampleType.BLOOD,
      price: 400,
      turnaroundTime: '4 hours',
      department: 'Hematology',
      instructions: 'Inform about anticoagulant medications',
    },
    {
      code: 'PBS',
      name: 'Peripheral Blood Smear',
      description: 'Microscopic examination of blood cells',
      category: TestCategory.HEMATOLOGY,
      sampleType: SampleType.BLOOD,
      price: 250,
      turnaroundTime: '6 hours',
      department: 'Hematology',
    },

    // Biochemistry
    {
      code: 'FBS',
      name: 'Fasting Blood Sugar',
      description: 'Measures blood glucose after 8-12 hours of fasting',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 100,
      turnaroundTime: '2 hours',
      department: 'Biochemistry',
      instructions: 'Requires 8-12 hours fasting',
    },
    {
      code: 'PPBS',
      name: 'Post Prandial Blood Sugar',
      description: 'Blood sugar 2 hours after meal',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 100,
      turnaroundTime: '2 hours',
      department: 'Biochemistry',
      instructions: 'Collect 2 hours after meal',
    },
    {
      code: 'HBA1C',
      name: 'Glycosylated Hemoglobin',
      description: 'Average blood sugar over 2-3 months',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 500,
      turnaroundTime: '4 hours',
      department: 'Biochemistry',
      instructions: 'No fasting required',
    },
    {
      code: 'LFT',
      name: 'Liver Function Test',
      description: 'Panel including bilirubin, ALT, AST, ALP, total protein, albumin',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 600,
      turnaroundTime: '6 hours',
      department: 'Biochemistry',
      instructions: '10-12 hours fasting recommended',
    },
    {
      code: 'KFT',
      name: 'Kidney Function Test',
      description: 'Panel including urea, creatinine, uric acid, BUN',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 500,
      turnaroundTime: '6 hours',
      department: 'Biochemistry',
      instructions: '10-12 hours fasting recommended',
    },
    {
      code: 'LIPID',
      name: 'Lipid Profile',
      description: 'Total cholesterol, HDL, LDL, triglycerides, VLDL',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 550,
      turnaroundTime: '6 hours',
      department: 'Biochemistry',
      instructions: '12 hours fasting required',
    },
    {
      code: 'TFT',
      name: 'Thyroid Function Test',
      description: 'TSH, T3, T4 levels',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 700,
      turnaroundTime: '8 hours',
      department: 'Biochemistry',
      instructions: 'Early morning sample preferred',
    },
    {
      code: 'ELECTRO',
      name: 'Serum Electrolytes',
      description: 'Sodium, potassium, chloride, bicarbonate',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 400,
      turnaroundTime: '4 hours',
      department: 'Biochemistry',
    },
    {
      code: 'VITD',
      name: 'Vitamin D (25-Hydroxy)',
      description: 'Measures 25-hydroxyvitamin D level',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 1200,
      turnaroundTime: '24 hours',
      department: 'Biochemistry',
    },
    {
      code: 'VITB12',
      name: 'Vitamin B12',
      description: 'Measures cobalamin level',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 800,
      turnaroundTime: '24 hours',
      department: 'Biochemistry',
    },
    {
      code: 'IRON',
      name: 'Iron Studies',
      description: 'Serum iron, TIBC, ferritin',
      category: TestCategory.BIOCHEMISTRY,
      sampleType: SampleType.BLOOD,
      price: 750,
      turnaroundTime: '8 hours',
      department: 'Biochemistry',
      instructions: 'Morning sample, 12 hours fasting',
    },

    // Microbiology
    {
      code: 'URINE-RE',
      name: 'Urine Routine & Microscopy',
      description: 'Physical, chemical, and microscopic examination of urine',
      category: TestCategory.MICROBIOLOGY,
      sampleType: SampleType.URINE,
      price: 150,
      turnaroundTime: '2 hours',
      department: 'Microbiology',
      instructions: 'Midstream clean-catch sample',
    },
    {
      code: 'URINE-CS',
      name: 'Urine Culture & Sensitivity',
      description: 'Bacterial culture with antibiotic sensitivity',
      category: TestCategory.MICROBIOLOGY,
      sampleType: SampleType.URINE,
      price: 500,
      turnaroundTime: '48 hours',
      department: 'Microbiology',
      instructions: 'Midstream clean-catch, before antibiotics',
    },
    {
      code: 'BLOOD-CS',
      name: 'Blood Culture & Sensitivity',
      description: 'Detects bacteria in blood',
      category: TestCategory.MICROBIOLOGY,
      sampleType: SampleType.BLOOD,
      price: 800,
      turnaroundTime: '72 hours',
      department: 'Microbiology',
      instructions: 'Collect during fever spike if possible',
    },
    {
      code: 'STOOL-RE',
      name: 'Stool Routine & Microscopy',
      description: 'Physical and microscopic examination of stool',
      category: TestCategory.MICROBIOLOGY,
      sampleType: SampleType.STOOL,
      price: 200,
      turnaroundTime: '4 hours',
      department: 'Microbiology',
      instructions: 'Fresh sample required',
    },
    {
      code: 'THROAT-CS',
      name: 'Throat Swab Culture',
      description: 'Bacterial culture from throat swab',
      category: TestCategory.MICROBIOLOGY,
      sampleType: SampleType.SWAB,
      price: 450,
      turnaroundTime: '48 hours',
      department: 'Microbiology',
    },

    // Immunology
    {
      code: 'CRP',
      name: 'C-Reactive Protein',
      description: 'Marker of inflammation',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 400,
      turnaroundTime: '4 hours',
      department: 'Immunology',
    },
    {
      code: 'RF',
      name: 'Rheumatoid Factor',
      description: 'Autoantibody associated with rheumatoid arthritis',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 350,
      turnaroundTime: '6 hours',
      department: 'Immunology',
    },
    {
      code: 'ANA',
      name: 'Anti-Nuclear Antibody',
      description: 'Screening test for autoimmune disorders',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 900,
      turnaroundTime: '24 hours',
      department: 'Immunology',
    },
    {
      code: 'HIV',
      name: 'HIV 1 & 2 Antibody',
      description: 'Screening test for HIV infection',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 350,
      turnaroundTime: '4 hours',
      department: 'Immunology',
      instructions: 'Pre-test counselling required',
    },
    {
      code: 'HBSAG',
      name: 'Hepatitis B Surface Antigen',
      description: 'Screening for hepatitis B infection',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 300,
      turnaroundTime: '4 hours',
      department: 'Immunology',
    },
    {
      code: 'WIDAL',
      name: 'Widal Test',
      description: 'Serological test for typhoid fever',
      category: TestCategory.IMMUNOLOGY,
      sampleType: SampleType.BLOOD,
      price: 250,
      turnaroundTime: '4 hours',
      department: 'Immunology',
    },

    // Pathology
    {
      code: 'BIOPSY',
      name: 'Tissue Biopsy',
      description: 'Histopathological examination of tissue',
      category: TestCategory.PATHOLOGY,
      sampleType: SampleType.TISSUE,
      price: 2000,
      turnaroundTime: '5 days',
      department: 'Pathology',
      instructions: 'Specimen in formalin',
    },
    {
      code: 'FNAC',
      name: 'Fine Needle Aspiration Cytology',
      description: 'Cytological examination of aspirated cells',
      category: TestCategory.PATHOLOGY,
      sampleType: SampleType.TISSUE,
      price: 1500,
      turnaroundTime: '3 days',
      department: 'Pathology',
    },
    {
      code: 'PAP',
      name: 'Pap Smear',
      description: 'Cervical cancer screening',
      category: TestCategory.PATHOLOGY,
      sampleType: SampleType.SWAB,
      price: 500,
      turnaroundTime: '3 days',
      department: 'Pathology',
    },

    // Molecular
    {
      code: 'COVID-RT',
      name: 'COVID-19 RT-PCR',
      description: 'SARS-CoV-2 detection by RT-PCR',
      category: TestCategory.MOLECULAR,
      sampleType: SampleType.SWAB,
      price: 500,
      turnaroundTime: '24 hours',
      department: 'Molecular Biology',
      instructions: 'Nasopharyngeal swab',
    },
    {
      code: 'DENGUE-NS1',
      name: 'Dengue NS1 Antigen',
      description: 'Early detection of dengue infection',
      category: TestCategory.MOLECULAR,
      sampleType: SampleType.BLOOD,
      price: 600,
      turnaroundTime: '4 hours',
      department: 'Molecular Biology',
    },
  ];

  for (const test of tests) {
    await prisma.test.upsert({
      where: { code: test.code },
      update: {},
      create: {
        code: test.code,
        name: test.name,
        description: test.description,
        category: test.category,
        sampleType: test.sampleType,
        price: test.price,
        turnaroundTime: test.turnaroundTime,
        department: test.department ?? null,
        instructions: test.instructions ?? null,
        tenantId: DEFAULT_TENANT_ID,
      },
    });
  }
  console.log(`✅ Seeded ${tests.length} tests in test catalog`);

  // ==================== AUDIT LOG ====================
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DATABASE_SEEDED',
      entity: 'System',
      entityId: 'seed',
      newValue: {
        users: 4,
        tests: tests.length,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log('🌱 Seeding completed successfully!');
  console.log('');
  console.log('📋 Default credentials:');
  console.log('   Admin:        admin@carediagnostics.com / Admin@123456');
  console.log('   Receptionist: receptionist@carediagnostics.com / Staff@123456');
  console.log('   Lab Tech:     labtech@carediagnostics.com / Staff@123456');
  console.log('   Pathologist:  pathologist@carediagnostics.com / Staff@123456');
  console.log('   Clients:      apollo@carediagnostics.com / Client@123456');
  console.log('                 maxhealth@carediagnostics.com / Client@123456');
  console.log('                 fortis@carediagnostics.com / Client@123456');
  console.log('                 medanta@carediagnostics.com / Client@123456');
  console.log('                 narayana@carediagnostics.com / Client@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
