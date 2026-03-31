import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import type { Role, Prisma } from '@prisma/client';
import type {
  AiIntent,
  AiConversationState,
  AiChatResponse,
  TaskStepDefinition,
} from './ai.types.js';
import { v4 as uuid } from 'uuid';
import { eventBus, EVENTS } from '../../core/event-bus.js';

// ════════════════════════════════════════════════════════════════════════════════
//  CARE DIAGNOSTICS — Enterprise AI Assistant Service
//  Guided, task-oriented, step-based workflow operator
// ════════════════════════════════════════════════════════════════════════════════

// ─── In-Memory Conversation Store ──────────────────────────────────────────────
interface Conversation {
  id: string;
  userId: string;
  userRole: Role;
  state: AiConversationState;
  history: { role: 'user' | 'assistant'; content: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const conversations = new Map<string, Conversation>();

// Cleanup conversations older than 30 minutes
setInterval(
  () => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [id, conv] of conversations) {
      if (conv.updatedAt.getTime() < cutoff) conversations.delete(id);
    }
  },
  5 * 60 * 1000,
);

// ─── Anthropic Client ──────────────────────────────────────────────────────────
let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// ─── Default empty state ───────────────────────────────────────────────────────
function emptyState(): AiConversationState {
  return {
    intent: null,
    currentStep: 0,
    totalSteps: 0,
    payload: {},
    awaitingConfirmation: false,
    completed: false,
    stepLabels: [],
  };
}

// ─── System Prompt (STRICT enterprise task operator — NOT a chatbot) ──────────
const SYSTEM_PROMPT = `You are the Care Diagnostics LIMS System Operator — a strict, task-oriented AI embedded in a production healthcare Laboratory Information Management System.

IDENTITY RULES (ABSOLUTE — NO EXCEPTIONS):
- You are a SYSTEM OPERATOR. You are NOT a chatbot, not a general AI assistant, not a conversational agent.
- You NEVER engage in casual conversation, small talk, jokes, or off-topic discussion.
- You NEVER use casual phrases like "Sure!", "Of course!", "Happy to help!", "Great question!", "No problem!", "Absolutely!".
- You NEVER respond to non-LIMS topics. If asked, respond ONLY with: "That is outside the scope of this system. I operate exclusively within the Care Diagnostics LIMS."
- You NEVER provide medical advice, diagnoses, or clinical interpretation of test results.
- You NEVER access the database directly — all data operations are executed via structured system workflows.
- You NEVER perform any action without explicit user confirmation.
- Your tone is ALWAYS: calm, neutral, precise, professional — like enterprise software documentation.

YOUR SCOPE (ONLY these topics — nothing else):
1. LIMS modules: Patient Management, Visit Management, Test Catalog, Test Orders, Sample Management, Result Entry, Report Generation, Invoice & Billing, User Management, Audit Logging, Dashboard
2. Laboratory workflow: Registration → Visit → Test Order → Sample Collection → Processing → Result Entry → Verification → Report → Approval → Dispatch → Invoice → Payment
3. System navigation and page routes
4. User roles (ADMIN, RECEPTIONIST, LAB_TECHNICIAN, PATHOLOGIST, PATIENT) and their permissions
5. Field requirements, validation rules, and status flows

SYSTEM KNOWLEDGE:

**Navigation:** Dashboard: /dashboard | Patients: /dashboard/patients | Visits: /dashboard/visits | Tests: /dashboard/tests | Test Orders: /dashboard/test-orders | Samples: /dashboard/samples | Results: /dashboard/results | Reports: /dashboard/reports | Invoices: /dashboard/invoices | Users: /dashboard/users

**Required Patient Fields:** First Name, Last Name, Date of Birth, Gender, Phone, Street Address, City, State, Pincode
**Optional Patient Fields:** Email, Blood Group, Emergency Contact

**Visit requires:** A registered patient (identified by MRN or search)
**Invoice requires:** A visit with at least one test order

RESPONSE FORMAT (MANDATORY):
- Use **bold** for key terms and section headers.
- Use bullet points (•) for lists.
- Use numbered steps for procedures.
- Be concise and structured. No unnecessary prose or filler.
- EVERY response MUST end with available actions formatted as:
  "**Available actions:** Register a patient • Create a visit • Add tests • Generate invoice • Search records • Check report status"
- If the user wants to perform an action, tell them the exact command phrase to use (e.g., "Say **Register a patient** to begin the guided workflow.").
- NEVER tell the user to use forms on the page — the AI workflow IS the guided interface.

CURRENT USER CONTEXT will be provided with each message.`;

// ════════════════════════════════════════════════════════════════════════════════
//  TASK STEP DEFINITIONS — Strict, validated, complete
// ════════════════════════════════════════════════════════════════════════════════

function getTaskSteps(intent: AiIntent): TaskStepDefinition[] {
  switch (intent) {
    case 'CREATE_PATIENT':
      return [
        {
          field: 'firstName',
          label: 'First Name',
          question: "Please enter the patient's **first name**.",
          hint: 'Example: Rahul',
          validate: (v) => {
            if (v.length < 2) return 'First name must be at least 2 characters.';
            if (!/^[a-zA-Z\s'-]+$/.test(v))
              return 'First name may only contain letters, spaces, hyphens, and apostrophes.';
            return null;
          },
        },
        {
          field: 'lastName',
          label: 'Last Name',
          question: "Please enter the patient's **last name**.",
          hint: 'Example: Sharma',
          validate: (v) => {
            if (v.length < 2) return 'Last name must be at least 2 characters.';
            if (!/^[a-zA-Z\s'-]+$/.test(v))
              return 'Last name may only contain letters, spaces, hyphens, and apostrophes.';
            return null;
          },
        },
        {
          field: 'dateOfBirth',
          label: 'Date of Birth',
          question: "Please enter the patient's **date of birth**.",
          hint: 'Format: YYYY-MM-DD (e.g., 1990-05-15)',
          validate: (v) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
              return 'Please use the format YYYY-MM-DD (e.g., 1990-05-15).';
            const date = new Date(v);
            if (isNaN(date.getTime()))
              return 'That is not a valid date. Please check and try again.';
            if (date > new Date()) return 'Date of birth cannot be in the future.';
            const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            if (age > 150) return 'Please enter a realistic date of birth.';
            return null;
          },
        },
        {
          field: 'gender',
          label: 'Gender',
          question: "Please specify the patient's **gender**.",
          hint: 'Options: Male, Female, or Other',
          validate: (v) => {
            if (!['male', 'female', 'other'].includes(v.toLowerCase().trim()))
              return 'Please enter one of: Male, Female, or Other.';
            return null;
          },
        },
        {
          field: 'phone',
          label: 'Phone',
          question: "Please enter the patient's **phone number**.",
          hint: 'Must be a valid 10-digit number (e.g., 9876543210)',
          validate: (v) => {
            const digits = v.replace(/[\s\-+()]/g, '');
            if (!/^\d{10,15}$/.test(digits))
              return 'Phone number must contain 10–15 digits. Remove any letters or special characters.';
            return null;
          },
        },
        {
          field: 'address',
          label: 'Address',
          question: "Please enter the patient's **street address**.",
          hint: 'Example: 42, MG Road, Near City Hospital',
          validate: (v) => {
            if (v.length < 5)
              return 'Address must be at least 5 characters. Please provide the full street address.';
            return null;
          },
        },
        {
          field: 'city',
          label: 'City',
          question: "Please enter the patient's **city**.",
          hint: 'Example: Mumbai',
          validate: (v) => {
            if (v.length < 2) return 'City name must be at least 2 characters.';
            return null;
          },
        },
        {
          field: 'state',
          label: 'State',
          question: "Please enter the patient's **state**.",
          hint: 'Example: Maharashtra',
          validate: (v) => {
            if (v.length < 2) return 'State name must be at least 2 characters.';
            return null;
          },
        },
        {
          field: 'pincode',
          label: 'Pincode',
          question: "Please enter the patient's **pincode**.",
          hint: 'Must be a 6-digit number (e.g., 400001)',
          validate: (v) => {
            if (!/^\d{6}$/.test(v.trim())) return 'Pincode must be exactly 6 digits.';
            return null;
          },
        },
        {
          field: 'email',
          label: 'Email (Optional)',
          question: "Please enter the patient's **email address**.",
          hint: 'Type "skip" if not available',
          validate: (v) => {
            if (v.toLowerCase().trim() === 'skip' || v.trim() === '') return null;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
              return 'Please enter a valid email address, or type "skip" to proceed without one.';
            return null;
          },
        },
      ];

    case 'CREATE_VISIT':
      return [
        {
          field: 'patientIdentifier',
          label: 'Patient',
          question: "Please provide the **patient MRN** or the **patient's full name** to look up.",
          hint: 'Example: CD-2026-00001 or "Rahul Sharma"',
          validate: (v) => {
            if (v.length < 2)
              return 'Please enter a valid MRN or patient name (at least 2 characters).';
            return null;
          },
        },
        {
          field: 'notes',
          label: 'Visit Notes',
          question: 'Would you like to add any **clinical notes** for this visit?',
          hint: 'Type "skip" if no notes are needed',
          validate: () => null,
        },
      ];

    case 'ADD_TESTS':
      return [
        {
          field: 'visitIdentifier',
          label: 'Visit',
          question: 'Please provide the **Visit Number** to add tests to.',
          hint: 'Example: V-2026-00001',
          validate: (v) => {
            if (v.length < 2) return 'Please enter a valid visit number.';
            return null;
          },
        },
        {
          field: 'testSearch',
          label: 'Test Search',
          question:
            'Enter the **test name**, **test code**, or **category** to search for available tests.',
          hint: 'Example: "CBC" or "Hematology" or "Blood Glucose"',
          validate: (v) => {
            if (v.length < 2) return 'Search term must be at least 2 characters.';
            return null;
          },
        },
      ];

    case 'GENERATE_INVOICE':
      return [
        {
          field: 'visitIdentifier',
          label: 'Visit',
          question: 'Please provide the **Visit Number** to generate an invoice for.',
          hint: 'Example: V-2026-00001',
          validate: (v) => {
            if (v.length < 2) return 'Please enter a valid visit number.';
            return null;
          },
        },
      ];

    case 'CHECK_REPORT_STATUS':
      return [
        {
          field: 'identifier',
          label: 'Identifier',
          question: 'Please provide the **Report Number**, **Visit Number**, or **Patient MRN**.',
          hint: 'Example: RPT-2026-00001, V-2026-00001, or CD-2026-00001',
          validate: (v) => {
            if (v.length < 2) return 'Please enter a valid identifier.';
            return null;
          },
        },
      ];

    case 'SEARCH_PATIENT':
      return [
        {
          field: 'searchTerm',
          label: 'Search Term',
          question: 'Enter the **patient name**, **MRN**, or **phone number** to search for.',
          hint: 'Example: "Rahul Sharma" or "CD-2026-00001" or "9876543210"',
          validate: (v) => {
            if (v.length < 2) return 'Search term must be at least 2 characters.';
            return null;
          },
        },
      ];

    case 'SEARCH_VISIT':
      return [
        {
          field: 'searchTerm',
          label: 'Search Term',
          question: 'Enter a **visit number** or **patient MRN** to look up.',
          hint: 'Example: V-2026-00001 or CD-2026-00001',
          validate: (v) => {
            if (v.length < 2) return 'Search term must be at least 2 characters.';
            return null;
          },
        },
      ];

    default:
      return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  ACTION EXECUTORS — Backend API orchestration (DB operations)
// ════════════════════════════════════════════════════════════════════════════════

async function executeAction(
  intent: AiIntent,
  payload: Record<string, unknown>,
  userId: string,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    switch (intent) {
      case 'CREATE_PATIENT': {
        const gender = (payload.gender as string).toUpperCase();
        const emailVal = payload.email as string;
        const email = emailVal && emailVal.toLowerCase() !== 'skip' ? emailVal.trim() : null;

        const patient = await prisma.patient.create({
          data: {
            tenantId: env.DEFAULT_TENANT_ID,
            mrn: `CD-${new Date().getFullYear()}-${String(await getNextMRNSequence()).padStart(5, '0')}`,
            firstName: (payload.firstName as string).trim(),
            lastName: (payload.lastName as string).trim(),
            dateOfBirth: new Date(payload.dateOfBirth as string),
            gender: gender as 'MALE' | 'FEMALE' | 'OTHER',
            phone: (payload.phone as string).replace(/[\s\-+()]/g, ''),
            email,
            address: (payload.address as string).trim(),
            city: (payload.city as string).trim(),
            state: (payload.state as string).trim(),
            pincode: (payload.pincode as string).trim(),
            registeredById: userId,
          },
        });

        await logAudit(userId, 'PATIENT_REGISTERED', 'Patient', patient.id, null, patient);

        // Emit domain event for real-time updates
        eventBus
          .emit({
            type: EVENTS.VISIT_CREATED,
            tenantId: env.DEFAULT_TENANT_ID,
            entity: 'Patient',
            entityId: patient.id,
            userId,
            payload: {
              mrn: patient.mrn,
              name: `${patient.firstName} ${patient.lastName}`,
              source: 'ai-assistant',
            },
          })
          .catch((err) => console.error('[EventBus] ai patient.created emit failed:', err));

        return {
          success: true,
          message: [
            '**Patient registered successfully.**',
            '',
            `• **MRN:** ${patient.mrn}`,
            `• **Name:** ${patient.firstName} ${patient.lastName}`,
            `• **Date of Birth:** ${String(payload.dateOfBirth)}`,
            `• **Gender:** ${patient.gender}`,
            `• **Phone:** ${patient.phone}`,
            `• **Address:** ${patient.address}, ${patient.city}, ${patient.state} — ${patient.pincode}`,
            email ? `• **Email:** ${email}` : '',
            '',
            'The patient is now available in the system.',
          ]
            .filter(Boolean)
            .join('\n'),
          data: patient,
        };
      }

      case 'CREATE_VISIT': {
        const identifier = (payload.patientIdentifier as string).trim();
        const patient = await prisma.patient.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { mrn: { equals: identifier, mode: 'insensitive' } },
              { firstName: { contains: identifier, mode: 'insensitive' } },
              { lastName: { contains: identifier, mode: 'insensitive' } },
              { phone: { contains: identifier } },
            ],
          },
        });

        if (!patient) {
          return {
            success: false,
            message: `No patient found matching **"${identifier}"**. Please verify the MRN or name and try again.`,
          };
        }

        const visitNumber = `V-${new Date().getFullYear()}-${String(await getNextVisitSequence()).padStart(5, '0')}`;
        const notesVal = payload.notes as string;
        const notes = notesVal && notesVal.toLowerCase() !== 'skip' ? notesVal.trim() : null;

        const visit = await prisma.visit.create({
          data: {
            tenantId: env.DEFAULT_TENANT_ID,
            visitNumber,
            patientId: patient.id,
            status: 'REGISTERED',
            notes,
            createdById: userId,
          },
          include: { patient: true },
        });

        await logAudit(userId, 'VISIT_CREATED', 'Visit', visit.id, null, visit);

        // Emit domain event
        eventBus
          .emit({
            type: EVENTS.VISIT_CREATED,
            tenantId: env.DEFAULT_TENANT_ID,
            entity: 'Visit',
            entityId: visit.id,
            userId,
            payload: {
              visitNumber: visit.visitNumber,
              patientId: patient.id,
              source: 'ai-assistant',
            },
          })
          .catch((err) => console.error('[EventBus] ai visit.created emit failed:', err));

        return {
          success: true,
          message: [
            '**Visit created successfully.**',
            '',
            `• **Visit Number:** ${visit.visitNumber}`,
            `• **Patient:** ${patient.firstName} ${patient.lastName} (${patient.mrn})`,
            `• **Status:** REGISTERED`,
            notes ? `• **Notes:** ${notes}` : '',
            '',
            'You may now add test orders to this visit.',
          ]
            .filter(Boolean)
            .join('\n'),
          data: visit,
        };
      }

      case 'SEARCH_PATIENT': {
        const term = (payload.searchTerm as string).trim();
        const patients = await prisma.patient.findMany({
          where: {
            deletedAt: null,
            OR: [
              { mrn: { contains: term, mode: 'insensitive' } },
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term } },
            ],
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        if (patients.length === 0) {
          return {
            success: true,
            message: `No patients found matching **"${term}"**. Please verify the search criteria.`,
          };
        }

        const list = patients
          .map(
            (p, i) =>
              `${i + 1}. **${p.firstName} ${p.lastName}** — MRN: ${p.mrn} | Phone: ${p.phone}${p.city ? ` | ${p.city}` : ''}`,
          )
          .join('\n');

        return {
          success: true,
          message: `**Found ${patients.length} patient(s):**\n\n${list}`,
          data: patients,
        };
      }

      case 'SEARCH_VISIT': {
        const term = (payload.searchTerm as string).trim();
        const visits = await prisma.visit.findMany({
          where: {
            deletedAt: null,
            OR: [
              { visitNumber: { contains: term, mode: 'insensitive' } },
              { patient: { mrn: { contains: term, mode: 'insensitive' } } },
            ],
          },
          include: { patient: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        if (visits.length === 0) {
          return {
            success: true,
            message: `No visits found matching **"${term}"**. Please verify the search criteria.`,
          };
        }

        const list = visits
          .map(
            (v, i) =>
              `${i + 1}. **${v.visitNumber}** — Patient: ${v.patient.firstName} ${v.patient.lastName} (${v.patient.mrn}) | Status: ${v.status}`,
          )
          .join('\n');

        return {
          success: true,
          message: `**Found ${visits.length} visit(s):**\n\n${list}`,
          data: visits,
        };
      }

      case 'CHECK_REPORT_STATUS': {
        const id = (payload.identifier as string).trim();
        const report = await prisma.report.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { reportNumber: { contains: id, mode: 'insensitive' } },
              { visit: { visitNumber: { contains: id, mode: 'insensitive' } } },
              { visit: { patient: { mrn: { contains: id, mode: 'insensitive' } } } },
            ],
          },
          include: {
            visit: { include: { patient: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!report) {
          // Check if the identifier matches a patient or visit that simply has no reports yet
          const matchedPatient = await prisma.patient.findFirst({
            where: {
              deletedAt: null,
              OR: [
                { mrn: { contains: id, mode: 'insensitive' } },
                { firstName: { contains: id, mode: 'insensitive' } },
                { lastName: { contains: id, mode: 'insensitive' } },
              ],
            },
            select: { mrn: true, firstName: true, lastName: true },
          });
          const matchedVisit = await prisma.visit.findFirst({
            where: { deletedAt: null, visitNumber: { contains: id, mode: 'insensitive' } },
            include: { patient: { select: { mrn: true, firstName: true, lastName: true } } },
          });

          if (matchedPatient) {
            return {
              success: true,
              message: [
                `Patient **${matchedPatient.firstName} ${matchedPatient.lastName}** (${matchedPatient.mrn}) was found, but **no reports exist** for this patient yet.`,
                '',
                'Reports are generated after: Visit → Test Orders → Sample Collection → Processing → Result Entry → Verification → Report Generation.',
                '',
                'Please ensure all preceding steps are completed before checking for a report.',
              ].join('\n'),
            };
          }
          if (matchedVisit) {
            return {
              success: true,
              message: [
                `Visit **${matchedVisit.visitNumber}** (Patient: ${matchedVisit.patient.firstName} ${matchedVisit.patient.lastName}) was found, but **no report has been generated** for this visit yet.`,
                '',
                'A report is generated only after all test results are verified by a Pathologist.',
              ].join('\n'),
            };
          }

          return {
            success: true,
            message: `No patient, visit, or report found matching **"${id}"**. Please verify the identifier and try again.`,
          };
        }

        return {
          success: true,
          message: [
            '**Report found:**',
            '',
            `• **Report #:** ${report.reportNumber}`,
            `• **Visit:** ${report.visit.visitNumber}`,
            `• **Patient:** ${report.visit.patient.firstName} ${report.visit.patient.lastName} (${report.visit.patient.mrn})`,
            `• **Status:** ${report.status}`,
            report.approvedBy
              ? `• **Approved by:** Dr. ${report.approvedBy.firstName} ${report.approvedBy.lastName}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
          data: report,
        };
      }

      case 'ADD_TESTS': {
        const visitIdent = (payload.visitIdentifier as string).trim();
        const testSearch = (payload.testSearch as string).trim();

        const targetVisit = await prisma.visit.findFirst({
          where: {
            deletedAt: null,
            OR: [{ visitNumber: { equals: visitIdent, mode: 'insensitive' } }, { id: visitIdent }],
          },
          include: { patient: true, testOrders: { include: { test: true } } },
        });

        if (!targetVisit) {
          return {
            success: false,
            message: `No visit found matching **"${visitIdent}"**. Please verify the visit number.`,
          };
        }

        if (targetVisit.status === 'CANCELLED' || targetVisit.status === 'COMPLETED') {
          return {
            success: false,
            message: `Visit **${targetVisit.visitNumber}** has status **${targetVisit.status}** and cannot accept new test orders.`,
          };
        }

        const matchingTests = await prisma.test.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            OR: [
              { name: { contains: testSearch, mode: 'insensitive' } },
              { code: { contains: testSearch, mode: 'insensitive' } },
              { category: { equals: testSearch.toUpperCase() as never } },
            ],
          },
          take: 10,
        });

        if (matchingTests.length === 0) {
          return {
            success: false,
            message: `No active tests found matching **"${testSearch}"**. Please try a different name, code, or category.`,
          };
        }

        const existingTestIds = new Set(targetVisit.testOrders.map((to) => to.testId));
        const availableTests = matchingTests.filter((t) => !existingTestIds.has(t.id));

        if (availableTests.length === 0) {
          return {
            success: false,
            message: `All tests matching **"${testSearch}"** are already ordered for visit **${targetVisit.visitNumber}**.`,
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const created: any[] = [];
        for (const test of availableTests) {
          const testOrder = await prisma.testOrder.create({
            data: {
              tenantId: env.DEFAULT_TENANT_ID,
              visitId: targetVisit.id,
              testId: test.id,
              priority: 'NORMAL',
            },
            include: { test: true },
          });
          created.push(testOrder);
        }

        await logAudit(userId, 'TESTS_ADDED', 'Visit', targetVisit.id, null, {
          testOrders: created,
        });

        const testList = created
          .map(
            (to, i) =>
              `${i + 1}. **${to.test.name}** (${to.test.code}) — ₹${to.test.price.toString()}`,
          )
          .join('\n');

        return {
          success: true,
          message: [
            `**Tests added to visit ${targetVisit.visitNumber}** (${targetVisit.patient.firstName} ${targetVisit.patient.lastName}):`,
            '',
            testList,
            '',
            `**Total tests added:** ${created.length}`,
          ].join('\n'),
          data: created,
        };
      }

      case 'GENERATE_INVOICE': {
        const visitIdent = (payload.visitIdentifier as string).trim();
        const visit = await prisma.visit.findFirst({
          where: {
            deletedAt: null,
            OR: [{ visitNumber: { equals: visitIdent, mode: 'insensitive' } }, { id: visitIdent }],
          },
          include: {
            patient: true,
            testOrders: { include: { test: true } },
            invoice: true,
          },
        });

        if (!visit) {
          return {
            success: false,
            message: `No visit found matching **"${visitIdent}"**. Please verify the visit number.`,
          };
        }

        if (visit.invoice) {
          return {
            success: true,
            message: [
              '**An invoice already exists for this visit:**',
              '',
              `• **Invoice #:** ${visit.invoice.invoiceNumber}`,
              `• **Net Amount:** ₹${visit.invoice.netAmount.toString()}`,
              `• **Status:** ${visit.invoice.status}`,
            ].join('\n'),
            data: visit.invoice,
          };
        }

        if (visit.testOrders.length === 0) {
          return {
            success: false,
            message: `Visit **${visit.visitNumber}** has no test orders. Please add tests before generating an invoice.`,
          };
        }

        const totalAmount = visit.testOrders.reduce((sum, to) => sum + Number(to.test.price), 0);
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(await getNextInvoiceSequence()).padStart(5, '0')}`;

        const invoice = await prisma.invoice.create({
          data: {
            tenantId: env.DEFAULT_TENANT_ID,
            invoiceNumber,
            visitId: visit.id,
            totalAmount,
            discountAmount: 0,
            taxAmount: 0,
            netAmount: totalAmount,
            paidAmount: 0,
            dueAmount: totalAmount,
            status: 'PENDING',
          },
        });

        await logAudit(userId, 'INVOICE_CREATED', 'Invoice', invoice.id, null, invoice);

        return {
          success: true,
          message: [
            '**Invoice generated successfully.**',
            '',
            `• **Invoice #:** ${invoice.invoiceNumber}`,
            `• **Patient:** ${visit.patient.firstName} ${visit.patient.lastName} (${visit.patient.mrn})`,
            `• **Visit:** ${visit.visitNumber}`,
            `• **Total Amount:** ₹${totalAmount}`,
            `• **Status:** PENDING`,
          ].join('\n'),
          data: invoice,
        };
      }

      default:
        return { success: false, message: 'This action is not supported by the AI assistant.' };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`[AI] Action execution error (${intent}):`, error);
    return {
      success: false,
      message: `Action failed: ${message}. Please try again or contact support.`,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════════

async function getNextMRNSequence(): Promise<number> {
  const count = await prisma.patient.count();
  return count + 1;
}

async function getNextVisitSequence(): Promise<number> {
  const count = await prisma.visit.count();
  return count + 1;
}

async function getNextInvoiceSequence(): Promise<number> {
  const count = await prisma.invoice.count();
  return count + 1;
}

async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      oldValue: oldValue
        ? (JSON.parse(JSON.stringify(oldValue)) as Prisma.InputJsonValue)
        : undefined,
      newValue: newValue
        ? (JSON.parse(JSON.stringify(newValue)) as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

// ─── Intent Detection (broad matching — catches all natural phrasings) ─────────
function detectIntentFast(message: string): AiIntent | null {
  const lower = message.toLowerCase().trim();

  // Patient creation — "register a patient", "I want to create a patient", "can you add a new patient?", etc.
  if (
    /\bpatient\b/.test(lower) &&
    /\b(create|register|new|add|enroll|admit|entry|onboard)\b/.test(lower)
  )
    return 'CREATE_PATIENT';
  if (/\bpatient\s*(registration|creation|onboarding|entry)\b/.test(lower)) return 'CREATE_PATIENT';

  // Visit creation
  if (/\bvisit\b/.test(lower) && /\b(create|open|start|new|begin|make|initiate)\b/.test(lower))
    return 'CREATE_VISIT';

  // Add tests
  if (/\btest/.test(lower) && /\b(add|book|order|request|new|place)\b/.test(lower))
    return 'ADD_TESTS';

  // Generate invoice
  if (/\binvoice\b/.test(lower) && /\b(generate|create|make|prepare|new|raise)\b/.test(lower))
    return 'GENERATE_INVOICE';
  if (/\bbill(ing)?\b/.test(lower) && /\b(generate|create|make|prepare|new)\b/.test(lower))
    return 'GENERATE_INVOICE';

  // Search patient
  if (
    /\bpatient\b/.test(lower) &&
    /\b(find|search|look\s?up|locate|fetch|get|list|check|view)\b/.test(lower)
  )
    return 'SEARCH_PATIENT';

  // Search visit
  if (
    /\bvisit\b/.test(lower) &&
    /\b(find|search|look\s?up|locate|fetch|get|list|check|view)\b/.test(lower)
  )
    return 'SEARCH_VISIT';

  // Report status
  if (/\breport/.test(lower) && /\b(check|track|status|find|where|view|get|look)\b/.test(lower))
    return 'CHECK_REPORT_STATUS';

  // Navigation
  if (
    /\b(go\s?to|navigate|take\s+me|open|show\s+me|show)\b/.test(lower) &&
    /\b(dashboard|patient|visit|test|sample|result|report|invoice|billing|user)\b/.test(lower)
  )
    return 'NAVIGATE';
  if (/^(go\s?to|navigate\s+to|take\s+me\s+to|open)\s+/i.test(lower)) return 'NAVIGATE';

  return null;
}

// ─── Navigation ────────────────────────────────────────────────────────────────
function getNavigationResponse(message: string): string | null {
  const lower = message.toLowerCase();
  const routes: Record<string, { label: string; route: string }> = {
    dashboard: { label: 'Dashboard', route: '/dashboard' },
    patient: { label: 'Patients', route: '/dashboard/patients' },
    visit: { label: 'Visits', route: '/dashboard/visits' },
    'test catalog': { label: 'Test Catalog', route: '/dashboard/tests' },
    'test order': { label: 'Test Orders', route: '/dashboard/test-orders' },
    sample: { label: 'Samples', route: '/dashboard/samples' },
    result: { label: 'Results', route: '/dashboard/results' },
    report: { label: 'Reports', route: '/dashboard/reports' },
    invoice: { label: 'Invoices', route: '/dashboard/invoices' },
    billing: { label: 'Invoices', route: '/dashboard/invoices' },
    user: { label: 'Users', route: '/dashboard/users' },
  };

  for (const [keyword, { label, route }] of Object.entries(routes)) {
    if (lower.includes(keyword)) {
      return `Navigating you to **${label}**.\n\n→ **${route}**`;
    }
  }
  return null;
}

// ─── Claude for knowledge questions ────────────────────────────────────────────
async function askClaude(
  history: { role: 'user' | 'assistant'; content: string }[],
  userRole: string,
): Promise<string> {
  const client = getClient();
  if (!client) {
    return getBuiltInResponse(history[history.length - 1]?.content || '');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `${SYSTEM_PROMPT}\n\nCurrent user role: ${userRole}\n\nSTRICT RESPONSE RULES:\n- Answer ONLY about the Care Diagnostics LIMS system. Nothing else.\n- If the topic is outside LIMS, respond: "That is outside the scope of this system. I operate exclusively within the Care Diagnostics LIMS."\n- Do NOT be conversational. Be structured, factual, and directive.\n- NEVER use casual language ("Sure!", "Of course!", "Happy to help!", "Great question!").\n- Always end with available system actions.\n- If the user wants to perform an action, tell them the exact command to type.`,
      messages: history.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return (
      textBlock?.text ||
      'I was unable to process that request. Please try again or rephrase your question.'
    );
  } catch (error) {
    console.error('[AI] Claude API error:', error);
    return getBuiltInResponse(history[history.length - 1]?.content || '');
  }
}

// ─── Built-in knowledge base (fallback when no API key) ───────────────────────
function getBuiltInResponse(message: string): string {
  const lower = message.toLowerCase();

  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)/.test(lower)) {
    return [
      '**Care Diagnostics LIMS — System Operator**',
      '',
      'This system performs guided operations and answers LIMS-specific questions only.',
      '',
      '**Available Actions:**',
      '• **"Register a patient"** — Guided registration with full validation',
      '• **"Create a visit"** — Open a new patient visit',
      '• **"Add tests"** — Order laboratory tests for a visit',
      '• **"Generate invoice"** — Create a billing invoice',
      '• **"Search patient"** — Look up patient records',
      '• **"Check report status"** — Track report progress',
      '• **"Go to [section]"** — Navigate to a system module',
      '',
      'State your request to begin.',
    ].join('\n');
  }

  if (
    lower.includes('workflow') ||
    lower.includes('process') ||
    lower.includes('how does it work') ||
    lower.includes('how does the system work')
  ) {
    return [
      '**Care Diagnostics LIMS — Complete Workflow**',
      '',
      'The system follows a structured, end-to-end laboratory workflow:',
      '',
      '1. **Patient Registration** — Receptionist registers a patient with full demographic data',
      '2. **Visit Creation** — A visit is opened for the patient encounter',
      '3. **Test Ordering** — Required laboratory tests are ordered for the visit',
      '4. **Sample Collection** — Lab Technician collects biological specimens (barcode-tracked)',
      '5. **Sample Processing** — Specimens are processed in the laboratory',
      '6. **Result Entry** — Lab Technician enters numerical/qualitative test results',
      '7. **Result Verification** — Pathologist reviews and verifies (or rejects) results',
      '8. **Report Generation** — System compiles all verified results into a PDF report',
      '9. **Report Approval** — Pathologist reviews and approves the final report',
      '10. **Report Dispatch** — Approved report is dispatched to the patient',
      '11. **Invoice Generation** — Invoice is generated based on ordered tests',
      '12. **Payment Collection** — Payment is recorded with method tracking',
      '',
      'Each stage has status tracking visible across the system dashboard.',
    ].join('\n');
  }

  if (lower.includes('role') || lower.includes('permission') || lower.includes('access')) {
    return [
      '**User Roles & Permissions**',
      '',
      '| Role | Capabilities |',
      '|------|-------------|',
      '| **ADMIN** | Full system access — manage users, tests, all operations |',
      '| **RECEPTIONIST** | Register patients, create visits, order tests, generate invoices |',
      '| **LAB_TECHNICIAN** | Collect samples, enter results, manage test orders |',
      '| **PATHOLOGIST** | Verify results, approve reports, view all data |',
      '| **PATIENT** | View-only access to own records |',
      '',
      'User management is available at **/dashboard/users** (Admin only).',
    ].join('\n');
  }

  if (lower.includes('patient')) {
    return [
      '**Patient Management**',
      '',
      'The Patient module handles all patient demographic records.',
      '',
      '**Required Fields:** First Name, Last Name, Date of Birth, Gender, Phone, Address (street, city, state, pincode)',
      '**Optional Fields:** Email, Blood Group, Emergency Contact',
      '',
      '**Features:**',
      '• Auto-generated MRN in format **CD-YYYY-XXXXX**',
      '• Search by name, MRN, or phone number',
      '• Full edit and soft-delete capability',
      '• Patient visit history',
      '',
      'To register a new patient, say **"Register a patient"** and I will guide you through each required field.',
      '',
      'Navigate to: **/dashboard/patients**',
    ].join('\n');
  }

  if (lower.includes('visit')) {
    return [
      '**Visit Management**',
      '',
      'Each patient encounter is tracked as a Visit with a unique number (**V-YYYY-XXXXX**).',
      '',
      '**Status Flow:** REGISTERED → SAMPLES_COLLECTED → IN_PROGRESS → COMPLETED (or CANCELLED)',
      '',
      '**Features:**',
      '• Linked to a registered patient',
      '• Associate test orders, samples, results, reports, and invoices',
      '• Clinical notes tracking',
      '',
      'To create a visit, say **"Create a visit"**.',
      '',
      'Navigate to: **/dashboard/visits**',
    ].join('\n');
  }

  if (lower.includes('test')) {
    return [
      '**Test Catalog & Test Orders**',
      '',
      '**Test Catalog** — Manage available lab tests with code, name, category, sample type, price, turnaround time, department, and instructions.',
      '',
      '**Categories:** HEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY, PATHOLOGY, IMMUNOLOGY, RADIOLOGY, MOLECULAR, OTHER',
      '**Sample Types:** BLOOD, URINE, STOOL, SWAB, SPUTUM, TISSUE, CSF, OTHER',
      '',
      'Tests are ordered per visit. To add tests to a visit, say **"Add tests"**.',
      '',
      'Navigate to: **/dashboard/tests** | **/dashboard/test-orders**',
    ].join('\n');
  }

  if (lower.includes('sample')) {
    return [
      '**Sample Management**',
      '',
      '**Status Flow:** PENDING_COLLECTION → COLLECTED → IN_LAB → PROCESSED (or REJECTED)',
      '',
      '• Auto-generated unique barcodes for specimen tracking',
      '• Records collector, collection time, and sample type',
      '• Rejection reasons tracked for quality control',
      '',
      'Navigate to: **/dashboard/samples**',
    ].join('\n');
  }

  if (lower.includes('result')) {
    return [
      '**Result Entry & Verification**',
      '',
      '**Status Flow:** PENDING → ENTERED → VERIFIED (or REJECTED)',
      '',
      '• Lab Technicians enter values with units and reference ranges',
      '• Abnormal results are flagged automatically',
      '• Pathologists verify or reject with remarks',
      '• Rejected results can be re-entered',
      '',
      'Navigate to: **/dashboard/results**',
    ].join('\n');
  }

  if (lower.includes('report')) {
    return [
      '**Report Generation & Approval**',
      '',
      '**Status Flow:** PENDING → GENERATED → APPROVED → DISPATCHED',
      '',
      '• PDF reports compiled from verified results',
      '• Pathologist approval required before dispatch',
      '• Download and track dispatch status',
      '',
      'To check a report status, say **"Check report status"**.',
      '',
      'Navigate to: **/dashboard/reports**',
    ].join('\n');
  }

  if (lower.includes('invoice') || lower.includes('billing') || lower.includes('payment')) {
    return [
      '**Invoice & Billing**',
      '',
      '**Status Flow:** PENDING → PARTIAL → PAID (or CANCELLED / REFUNDED)',
      '',
      '• Auto-generated invoice numbers: **INV-YYYY-XXXXX**',
      '• Calculated from test order prices',
      '• Payment methods: Cash, Card, UPI, Online, Insurance',
      '• Discount and tax support',
      '',
      'To generate an invoice, say **"Generate invoice"**.',
      '',
      'Navigate to: **/dashboard/invoices**',
    ].join('\n');
  }

  if (
    lower.includes('navigate') ||
    lower.includes('where') ||
    lower.includes('go to') ||
    lower.includes('section')
  ) {
    return [
      '**System Navigation**',
      '',
      '• **Dashboard** — /dashboard',
      '• **Patients** — /dashboard/patients',
      '• **Visits** — /dashboard/visits',
      '• **Test Catalog** — /dashboard/tests',
      '• **Test Orders** — /dashboard/test-orders',
      '• **Samples** — /dashboard/samples',
      '• **Results** — /dashboard/results',
      '• **Reports** — /dashboard/reports',
      '• **Invoices** — /dashboard/invoices',
      '• **Users** — /dashboard/users (Admin only)',
      '',
      'Say **"Go to [section]"** to navigate directly.',
    ].join('\n');
  }

  // Default — unrecognized or off-topic input
  return [
    '**Care Diagnostics LIMS — System Operator**',
    '',
    'That input was not recognized as a LIMS-related query.',
    '',
    'I assist exclusively with Care Diagnostics LIMS operations. Available actions:',
    '',
    '• **"Register a patient"** — Guided patient registration with validation',
    '• **"Create a visit"** — Open a new patient visit',
    '• **"Add tests"** — Order laboratory tests for a visit',
    '• **"Generate invoice"** — Create a billing invoice',
    '• **"Search patient"** — Look up patient records',
    '• **"Check report status"** — Track report progress',
    '• **"Go to [section]"** — Navigate to a system module',
    '',
    'State your request to begin.',
  ].join('\n');
}

// ─── Confirmation Summary Builder ──────────────────────────────────────────────
function buildConfirmationSummary(intent: AiIntent, payload: Record<string, unknown>): string {
  switch (intent) {
    case 'CREATE_PATIENT': {
      const emailVal = payload.email as string;
      const email = emailVal && emailVal.toLowerCase() !== 'skip' ? emailVal : null;
      return [
        '**Please review the patient details below:**',
        '',
        `• **Name:** ${String(payload.firstName)} ${String(payload.lastName)}`,
        `• **Date of Birth:** ${String(payload.dateOfBirth)}`,
        `• **Gender:** ${(payload.gender as string).charAt(0).toUpperCase() + (payload.gender as string).slice(1).toLowerCase()}`,
        `• **Phone:** ${String(payload.phone)}`,
        `• **Address:** ${String(payload.address)}, ${String(payload.city)}, ${String(payload.state)} — ${String(payload.pincode)}`,
        email ? `• **Email:** ${email}` : '• **Email:** Not provided',
        '',
        '⚠️ **This action will create a permanent patient record in the system.**',
        '',
        'Please confirm: **Yes** to proceed or **No** to start over.',
      ].join('\n');
    }

    case 'CREATE_VISIT':
      return [
        '**Please review the visit details:**',
        '',
        `• **Patient:** ${String(payload.patientIdentifier)}`,
        `• **Notes:** ${!payload.notes || (payload.notes as string).toLowerCase() === 'skip' ? '(None)' : String(payload.notes)}`,
        '',
        '⚠️ **This action will create a new visit record.**',
        '',
        'Please confirm: **Yes** to proceed or **No** to start over.',
      ].join('\n');

    case 'ADD_TESTS':
      return [
        '**Please review the test order:**',
        '',
        `• **Visit:** ${String(payload.visitIdentifier)}`,
        `• **Test Search:** ${String(payload.testSearch)}`,
        '',
        'I will find matching tests and add them to the visit.',
        '',
        '⚠️ **This action will create test orders.**',
        '',
        'Please confirm: **Yes** to proceed or **No** to start over.',
      ].join('\n');

    case 'GENERATE_INVOICE':
      return [
        '**Please review the invoice request:**',
        '',
        `• **Visit:** ${String(payload.visitIdentifier)}`,
        '',
        '⚠️ **This action will generate a billing invoice.**',
        '',
        'Please confirm: **Yes** to proceed or **No** to start over.',
      ].join('\n');

    case 'SEARCH_PATIENT':
      return `I will search for patients matching: **${String(payload.searchTerm)}**`;

    case 'SEARCH_VISIT':
      return `I will search for visits matching: **${String(payload.searchTerm)}**`;

    case 'CHECK_REPORT_STATUS':
      return `I will look up the report status for: **${String(payload.identifier)}**`;

    default:
      return `Ready to execute: **${intent}**. Please confirm.`;
  }
}

// ─── Role permissions ──────────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, Role[]> = {
  CREATE_PATIENT: ['ADMIN', 'RECEPTIONIST'],
  CREATE_VISIT: ['ADMIN', 'RECEPTIONIST'],
  ADD_TESTS: ['ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN'],
  GENERATE_INVOICE: ['ADMIN', 'RECEPTIONIST'],
};

// ─── Intent labels ─────────────────────────────────────────────────────────────
const INTENT_LABELS: Record<string, string> = {
  CREATE_PATIENT: 'Patient Registration',
  CREATE_VISIT: 'Visit Creation',
  ADD_TESTS: 'Add Test Orders',
  GENERATE_INVOICE: 'Invoice Generation',
  CHECK_REPORT_STATUS: 'Report Status Check',
  SEARCH_PATIENT: 'Patient Search',
  SEARCH_VISIT: 'Visit Search',
};

// ════════════════════════════════════════════════════════════════════════════════
//  MAIN CHAT HANDLER
// ════════════════════════════════════════════════════════════════════════════════

export async function handleChat(
  message: string,
  userId: string,
  userRole: Role,
  conversationId?: string,
): Promise<AiChatResponse> {
  // ── Get or create conversation ─────────────────────────────────────────────
  let conversation: Conversation;

  if (conversationId && conversations.has(conversationId)) {
    conversation = conversations.get(conversationId)!;
  } else {
    const id = uuid();
    conversation = {
      id,
      userId,
      userRole,
      state: emptyState(),
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversations.set(id, conversation);
  }

  conversation.updatedAt = new Date();
  conversation.history.push({ role: 'user', content: message });

  const trimmed = message.trim().toLowerCase();

  // ── 1. CANCELLATION — always respected ─────────────────────────────────────
  if (['cancel', 'stop', 'abort', 'nevermind', 'never mind', 'quit', 'exit'].includes(trimmed)) {
    conversation.state = emptyState();
    const reply = 'Task cancelled. No changes were made.\n\nHow may I assist you?';
    conversation.history.push({ role: 'assistant', content: reply });
    return {
      message: reply,
      conversationId: conversation.id,
      state: conversation.state,
      messageType: 'system',
      suggestions: ['Register a patient', 'Create a visit', 'Search patient'],
    };
  }

  // ── 2. CONFIRMATION — awaiting yes/no ──────────────────────────────────────
  if (conversation.state.awaitingConfirmation) {
    if (['yes', 'y', 'confirm', 'proceed', 'go ahead', 'do it'].includes(trimmed)) {
      const result = await executeAction(
        conversation.state.intent!,
        conversation.state.payload,
        userId,
      );

      const icon = result.success ? '✅' : '❌';
      const reply = `${icon} ${result.message}`;
      conversation.history.push({ role: 'assistant', content: reply });

      // Reset for next task
      conversation.state = emptyState();

      return {
        message: reply,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'result',
        suggestions: ['Register a patient', 'Create a visit', 'Search patient'],
      };
    } else if (['no', 'n', 'back', 'change', 'edit', 'modify', 'redo'].includes(trimmed)) {
      // Restart the same flow from step 1
      const steps = getTaskSteps(conversation.state.intent!);
      conversation.state.currentStep = 0;
      conversation.state.payload = {};
      conversation.state.awaitingConfirmation = false;

      const step = steps[0];
      const reply = [
        "Understood. Let's start over.",
        '',
        `**${INTENT_LABELS[conversation.state.intent!] || 'Task'} — Step 1 of ${steps.length}: ${step.label}**`,
        '',
        step.question,
        step.hint ? `\n_${step.hint}_` : '',
      ]
        .filter(Boolean)
        .join('\n');

      conversation.history.push({ role: 'assistant', content: reply });

      return {
        message: reply,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'step',
      };
    } else {
      // Invalid response during confirmation
      const reply =
        'Please respond with **Yes** to confirm or **No** to start over. You may also type **cancel** to abort.';
      conversation.history.push({ role: 'assistant', content: reply });
      return {
        message: reply,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'validation_error',
      };
    }
  }

  // ── 3. ACTIVE TASK FLOW — collect and validate field data ──────────────────
  if (
    conversation.state.intent &&
    !conversation.state.awaitingConfirmation &&
    !conversation.state.completed
  ) {
    const steps = getTaskSteps(conversation.state.intent);

    if (steps.length > 0 && conversation.state.currentStep < steps.length) {
      const currentStep = steps[conversation.state.currentStep];
      const inputValue = message.trim();

      // Validate
      const validationError = currentStep.validate(inputValue);
      if (validationError) {
        const reply = [
          `⚠️ **Validation Error:** ${validationError}`,
          '',
          `**${INTENT_LABELS[conversation.state.intent] || 'Task'} — Step ${conversation.state.currentStep + 1} of ${steps.length}: ${currentStep.label}**`,
          '',
          currentStep.question,
          currentStep.hint ? `\n_${currentStep.hint}_` : '',
        ]
          .filter(Boolean)
          .join('\n');

        conversation.history.push({ role: 'assistant', content: reply });
        return {
          message: reply,
          conversationId: conversation.id,
          state: conversation.state,
          messageType: 'validation_error',
        };
      }

      // Store validated value
      conversation.state.payload[currentStep.field] = inputValue;
      conversation.state.currentStep++;

      // More steps remain — ask next question
      if (conversation.state.currentStep < steps.length) {
        const nextStep = steps[conversation.state.currentStep];
        const reply = [
          `**${INTENT_LABELS[conversation.state.intent] || 'Task'} — Step ${conversation.state.currentStep + 1} of ${steps.length}: ${nextStep.label}**`,
          '',
          nextStep.question,
          nextStep.hint ? `\n_${nextStep.hint}_` : '',
        ]
          .filter(Boolean)
          .join('\n');

        conversation.history.push({ role: 'assistant', content: reply });
        return {
          message: reply,
          conversationId: conversation.id,
          state: conversation.state,
          messageType: 'step',
        };
      }

      // All steps collected — for search/read-only intents, execute immediately
      const readOnlyIntents: AiIntent[] = ['SEARCH_PATIENT', 'SEARCH_VISIT', 'CHECK_REPORT_STATUS'];
      if (readOnlyIntents.includes(conversation.state.intent)) {
        const result = await executeAction(
          conversation.state.intent,
          conversation.state.payload,
          userId,
        );

        const icon = result.success ? '✅' : '❌';
        const reply = `${icon} ${result.message}`;
        conversation.history.push({ role: 'assistant', content: reply });

        conversation.state = emptyState();
        return {
          message: reply,
          conversationId: conversation.id,
          state: conversation.state,
          messageType: 'result',
          suggestions: ['Search patient', 'Create a visit', 'Register a patient'],
        };
      }

      // Write intents — show confirmation summary
      conversation.state.awaitingConfirmation = true;
      const summary = buildConfirmationSummary(
        conversation.state.intent,
        conversation.state.payload,
      );
      conversation.history.push({ role: 'assistant', content: summary });

      return {
        message: summary,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'confirmation',
      };
    }
  }

  // ── 4. INTENT DETECTION — start a new workflow ─────────────────────────────
  const detectedIntent = detectIntentFast(message);

  if (detectedIntent) {
    // Navigation — immediate response
    if (detectedIntent === 'NAVIGATE') {
      const nav = getNavigationResponse(message);
      const reply =
        nav ||
        [
          'Where would you like to navigate? Available sections:',
          '',
          '• Dashboard • Patients • Visits • Tests',
          '• Test Orders • Samples • Results • Reports',
          '• Invoices • Users',
        ].join('\n');

      conversation.history.push({ role: 'assistant', content: reply });
      return {
        message: reply,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'navigation',
        suggestions: ['Go to Patients', 'Go to Visits', 'Go to Reports', 'Go to Invoices'],
      };
    }

    // Check role permission for write intents
    const allowedRoles = ROLE_PERMISSIONS[detectedIntent];
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      const reply = `Your current role (**${userRole}**) does not have permission to perform this action. Please contact a system administrator if you believe this is an error.`;
      conversation.history.push({ role: 'assistant', content: reply });
      return {
        message: reply,
        conversationId: conversation.id,
        state: conversation.state,
        messageType: 'error',
      };
    }

    // Start the task flow
    const steps = getTaskSteps(detectedIntent);
    const stepLabels = steps.map((s) => s.label);

    conversation.state = {
      intent: detectedIntent,
      currentStep: 0,
      totalSteps: steps.length,
      payload: {},
      awaitingConfirmation: false,
      completed: false,
      stepLabels,
    };

    const firstStep = steps[0];
    const taskLabel = INTENT_LABELS[detectedIntent] || detectedIntent;

    const reply = [
      `**${taskLabel}**`,
      '',
      `I will guide you through this process step by step. All required information will be collected and validated before any action is taken.`,
      '',
      `**Step 1 of ${steps.length}: ${firstStep.label}**`,
      '',
      firstStep.question,
      firstStep.hint ? `\n_${firstStep.hint}_` : '',
      '',
      '_Type **cancel** at any time to abort._',
    ]
      .filter(Boolean)
      .join('\n');

    conversation.history.push({ role: 'assistant', content: reply });
    return {
      message: reply,
      conversationId: conversation.id,
      state: conversation.state,
      messageType: 'step',
    };
  }

  // ── 5. GREETING / ACKNOWLEDGMENT — structured, not conversational ──────────
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\b/i.test(trimmed)) {
    const greeting = [
      '**Care Diagnostics LIMS — System Operator**',
      '',
      'This system performs guided operations and answers LIMS-specific questions only.',
      '',
      '**Available Actions:**',
      '• **"Register a patient"** — Guided registration with full validation',
      '• **"Create a visit"** — Open a new patient visit',
      '• **"Add tests"** — Order laboratory tests for a visit',
      '• **"Generate invoice"** — Create a billing invoice',
      '• **"Search patient"** — Look up patient records',
      '• **"Check report status"** — Track report progress',
      '• **"Go to [section]"** — Navigate to a system module',
      '',
      'State your request to begin.',
    ].join('\n');
    conversation.history.push({ role: 'assistant', content: greeting });
    return {
      message: greeting,
      conversationId: conversation.id,
      state: conversation.state,
      messageType: 'system',
      suggestions: [
        'Register a patient',
        'Create a visit',
        'Search patient',
        'Check report status',
      ],
    };
  }

  // ── 6. ACKNOWLEDGMENTS — brief, redirect to actions ─────────────────────────
  if (
    /^(thanks|thank\s*you|ok|okay|sure|great|got\s*it|cool|nice|alright|understood)\b/i.test(
      trimmed,
    )
  ) {
    const ack =
      'Acknowledged. State your next request, or choose from the available actions:\n\n• **Register a patient** • **Create a visit** • **Add tests** • **Generate invoice** • **Search patient** • **Check report status**';
    conversation.history.push({ role: 'assistant', content: ack });
    return {
      message: ack,
      conversationId: conversation.id,
      state: conversation.state,
      messageType: 'system',
      suggestions: [
        'Register a patient',
        'Create a visit',
        'Search patient',
        'Check report status',
      ],
    };
  }

  // ── 7. LIMS KNOWLEDGE QUESTIONS — Claude or built-in (system topics only) ───
  const reply = await askClaude(conversation.history, userRole);
  conversation.history.push({ role: 'assistant', content: reply });

  return {
    message: reply,
    conversationId: conversation.id,
    state: conversation.state,
    messageType: 'info',
    suggestions: ['Register a patient', 'Create a visit', 'Search patient', 'Check report status'],
  };
}

// ════════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export function getConversation(conversationId: string): Conversation | undefined {
  return conversations.get(conversationId);
}

export function resetConversation(conversationId: string): void {
  conversations.delete(conversationId);
}
