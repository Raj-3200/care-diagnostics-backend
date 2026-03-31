/**
 * Swagger / OpenAPI 3.0 configuration.
 * Serves interactive API docs at /api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Care Diagnostics LIMS API',
      version: '2.0.0',
      description:
        'Production-grade Laboratory Information Management System API.\n\n' +
        '## Authentication\n' +
        'Uses httpOnly cookies. Login via `POST /api/v1/auth/login` to receive cookies automatically.\n\n' +
        '## Roles\n' +
        '- **ADMIN** — Full access\n' +
        '- **RECEPTIONIST** — Patient/visit/invoice management\n' +
        '- **LAB_TECHNICIAN** — Sample/result entry\n' +
        '- **PATHOLOGIST** — Result verification, report approval\n',
      contact: { name: 'Care Diagnostics', email: 'admin@carediagnostics.com' },
    },
    servers: [{ url: `http://localhost:${env.PORT}/api/v1`, description: 'Local Development' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'httpOnly access token cookie (set by login)',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Fallback Bearer token auth',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            dateOfBirth: { type: 'string', format: 'date' },
            phone: { type: 'string' },
            email: { type: 'string' },
          },
        },
        Visit: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            visitNumber: { type: 'string' },
            status: {
              type: 'string',
              enum: ['REGISTERED', 'SAMPLES_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            },
            patientId: { type: 'string', format: 'uuid' },
          },
        },
        Test: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
          },
        },
        Sample: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            barcode: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING_COLLECTION', 'COLLECTED', 'IN_LAB', 'PROCESSED', 'REJECTED'],
            },
            sampleType: { type: 'string' },
          },
        },
        Result: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            value: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'ENTERED', 'VERIFIED', 'REJECTED'] },
            isAbnormal: { type: 'boolean' },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reportNumber: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'GENERATED', 'APPROVED', 'DISPATCHED'] },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoiceNumber: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'REFUNDED'],
            },
            netAmount: { type: 'number' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Patients', description: 'Patient management' },
      { name: 'Visits', description: 'Patient visit management' },
      { name: 'Tests', description: 'Test catalog' },
      { name: 'Test Orders', description: 'Test order management' },
      { name: 'Samples', description: 'Sample collection & tracking' },
      { name: 'Results', description: 'Test result entry & verification' },
      { name: 'Reports', description: 'Report generation & dispatch' },
      { name: 'Invoices', description: 'Billing & payments' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'AI', description: 'AI-powered analysis' },
      { name: 'Health', description: 'System health checks' },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Login successful. Sets httpOnly cookies.' } },
          security: [],
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          responses: { 200: { description: 'Current user profile' } },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description: 'Refresh token is sent via httpOnly cookie. New token pair is returned.',
          responses: { 200: { description: 'Token refreshed' } },
          security: [],
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          description: 'Revokes refresh token and clears cookies',
          responses: { 200: { description: 'Logged out' } },
        },
      },
      '/patients': {
        get: {
          tags: ['Patients'],
          summary: 'List patients',
          responses: { 200: { description: 'Paginated patient list' } },
        },
        post: {
          tags: ['Patients'],
          summary: 'Create patient',
          responses: { 201: { description: 'Patient created' } },
        },
      },
      '/patients/{id}': {
        get: {
          tags: ['Patients'],
          summary: 'Get patient by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Patient details' } },
        },
        put: {
          tags: ['Patients'],
          summary: 'Update patient',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Patient updated' } },
        },
      },
      '/visits': {
        get: {
          tags: ['Visits'],
          summary: 'List visits',
          responses: { 200: { description: 'Paginated visit list' } },
        },
        post: {
          tags: ['Visits'],
          summary: 'Create visit',
          responses: { 201: { description: 'Visit created' } },
        },
      },
      '/visits/{id}': {
        get: {
          tags: ['Visits'],
          summary: 'Get visit by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Visit details' } },
        },
      },
      '/visits/{id}/status': {
        patch: {
          tags: ['Visits'],
          summary: 'Update visit status',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Status updated' } },
        },
      },
      '/tests': {
        get: {
          tags: ['Tests'],
          summary: 'List tests',
          responses: { 200: { description: 'Test catalog' } },
        },
        post: {
          tags: ['Tests'],
          summary: 'Create test',
          responses: { 201: { description: 'Test created' } },
        },
      },
      '/samples': {
        get: {
          tags: ['Samples'],
          summary: 'List samples',
          responses: { 200: { description: 'Sample list' } },
        },
        post: {
          tags: ['Samples'],
          summary: 'Create sample',
          responses: { 201: { description: 'Sample created' } },
        },
      },
      '/samples/{id}/receive': {
        patch: {
          tags: ['Samples'],
          summary: 'Receive sample in lab',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Sample received' } },
        },
      },
      '/samples/{id}/process': {
        patch: {
          tags: ['Samples'],
          summary: 'Mark sample processed',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Sample processed' } },
        },
      },
      '/results': {
        get: {
          tags: ['Results'],
          summary: 'List results',
          responses: { 200: { description: 'Result list' } },
        },
      },
      '/results/{id}/enter': {
        patch: {
          tags: ['Results'],
          summary: 'Enter result values',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Result entered' } },
        },
      },
      '/results/{id}/verify': {
        patch: {
          tags: ['Results'],
          summary: 'Verify result',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Result verified' } },
        },
      },
      '/reports': {
        get: {
          tags: ['Reports'],
          summary: 'List reports',
          responses: { 200: { description: 'Report list' } },
        },
        post: {
          tags: ['Reports'],
          summary: 'Create report',
          responses: { 201: { description: 'Report created' } },
        },
      },
      '/reports/{id}/generate': {
        patch: {
          tags: ['Reports'],
          summary: 'Generate report',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Report generated' } },
        },
      },
      '/reports/{id}/approve': {
        patch: {
          tags: ['Reports'],
          summary: 'Approve report',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Report approved' } },
        },
      },
      '/reports/{id}/dispatch': {
        patch: {
          tags: ['Reports'],
          summary: 'Dispatch report',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Report dispatched' } },
        },
      },
      '/invoices': {
        get: {
          tags: ['Invoices'],
          summary: 'List invoices',
          responses: { 200: { description: 'Invoice list' } },
        },
        post: {
          tags: ['Invoices'],
          summary: 'Create invoice',
          responses: { 201: { description: 'Invoice created' } },
        },
      },
      '/invoices/{id}/pay': {
        patch: {
          tags: ['Invoices'],
          summary: 'Record payment',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Payment recorded' } },
        },
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List notifications',
          responses: { 200: { description: 'Notification list' } },
        },
      },
      '/notifications/unread-count': {
        get: {
          tags: ['Notifications'],
          summary: 'Get unread count',
          responses: { 200: { description: 'Unread count' } },
        },
      },
      '/ai/analyze': {
        post: {
          tags: ['AI'],
          summary: 'AI result analysis',
          responses: { 200: { description: 'AI analysis result' } },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'OK' } },
          security: [],
        },
      },
    },
  },
  apis: [], // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Care Diagnostics API Docs',
    }),
  );

  // Serve raw JSON spec
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
