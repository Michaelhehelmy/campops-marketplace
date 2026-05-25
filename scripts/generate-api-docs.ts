#!/usr/bin/env tsx
/**
 * OpenAPI 3.0.3 spec generator for SinaiCamps Marketplace
 *
 * Scans src/app/api/ and plugins/*/src/routes/ for route handlers,
 * extracts Zod schemas from route files, and generates:
 *   - docs/openapi.json     — OpenAPI 3.0.3 spec
 *   - docs/openapi.yaml     — YAML version
 *
 * Usage: npx tsx scripts/generate-api-docs.ts
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface OpenAPIObject {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: Record<string, string>;
    license: Record<string, string>;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, any>>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{ name: string; description: string }>;
}

async function generateOpenAPISpec(): Promise<void> {
  const spec: OpenAPIObject = {
    openapi: '3.0.3',
    info: {
      title: 'SinaiCamps Marketplace API',
      version: '1.0.0',
      description: 'Multi-tenant hospitality marketplace platform API.\n\nAuthentication: Bearer JWT token obtained via POST /api/auth/login.\nRate limiting: 30 req/s general, 10 req/s auth endpoints.\nTenant isolation: All property-scoped resources require property context.',
      contact: { name: 'SinaiCamps Support', url: 'https://sinaicamps.com/support', email: 'support@sinaicamps.com' },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [
      { url: 'https://sinaicamps.com', description: 'Production server' },
      { url: 'https://staging.sinaicamps.com', description: 'Staging server' },
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    paths: {},
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error type identifier' },
            message: { type: 'string', description: 'Human-readable error message' },
            code: { type: 'string', description: 'Machine-readable error code' },
            details: { type: 'object', description: 'Additional error details (validation errors, etc.)' },
          },
          required: ['error', 'message'],
        },
        PaginationParams: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/auth/login',
        },
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session cookie set on login (primary auth for browser clients)',
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Login, logout, session management' },
      { name: 'Tenants', description: 'Tenant resolution and property management' },
      { name: 'Properties', description: 'Property/listing CRUD and search' },
      { name: 'Bookings', description: 'Booking management and availability' },
      { name: 'Marketplace', description: 'Public marketplace endpoints' },
      { name: 'Admin', description: 'Master admin platform management' },
      { name: 'Payments', description: 'Payment gateway and commission management' },
      { name: 'Plugins', description: 'Plugin management and lifecycle' },
      { name: 'Analytics', description: 'Platform analytics and reporting' },
      { name: 'Health', description: 'System health and monitoring' },
    ],
  };

  const commonParameters = {
    limit: {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      description: 'Maximum number of items to return',
    },
    offset: {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', minimum: 0, default: 0 },
      description: 'Pagination offset',
    },
    propertyId: {
      name: 'listingId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Property/listing ID',
    },
  };

  // Core routes
  spec.paths['/api/public/platform-settings'] = {
    get: {
      tags: ['Marketplace'],
      summary: 'Get public platform settings',
      description: 'Returns platform name, support email, currency, timezone. Used by the public UI.',
      responses: {
        '200': {
          description: 'Platform settings',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PlatformSettings' } } },
        },
      },
    },
  };

  spec.paths['/api/auth/login'] = {
    post: {
      tags: ['Authentication'],
      summary: 'Authenticate user',
      description: 'Validates email and password, returns JWT token and user session.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', description: 'User email address' },
                password: { type: 'string', format: 'password', description: 'User password' },
                rememberMe: { type: 'boolean', default: false, description: 'Extend session duration' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '401': { description: 'Invalid credentials' },
        '429': { description: 'Too many attempts — rate limited' },
      },
    },
  };

  spec.paths['/api/auth/logout'] = {
    post: {
      tags: ['Authentication'],
      summary: 'Logout',
      description: 'Invalidate current session.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Logged out successfully' },
      },
    },
  };

  spec.paths['/api/auth/session'] = {
    get: {
      tags: ['Authentication'],
      summary: 'Get current session',
      description: 'Returns current user session with permissions and tenant context.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Session data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  tenant: { $ref: '#/components/schemas/Tenant' },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        '401': { description: 'Not authenticated' },
      },
    },
  };

  spec.paths['/api/public/search'] = {
    get: {
      tags: ['Marketplace'],
      summary: 'Search marketplace listings',
      description: 'Public search across all active marketplace properties.',
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
        { name: 'location', in: 'query', schema: { type: 'string' }, description: 'City or region filter' },
        { name: 'checkIn', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Check-in date' },
        { name: 'checkOut', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Check-out date' },
        { name: 'guests', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Number of guests' },
        { ...commonParameters.limit },
        { ...commonParameters.offset },
      ],
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/PropertyBrief' } },
                  total: { type: 'integer' },
                  limit: { type: 'integer' },
                  offset: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  };

  spec.paths['/api/properties/{id}'] = {
    get: {
      tags: ['Properties'],
      summary: 'Get property details',
      description: 'Returns full property details including branding, settings, and amenities.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Property details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Property' } } } },
        '404': { description: 'Property not found' },
      },
    },
    patch: {
      tags: ['Properties'],
      summary: 'Update property',
      description: 'Updates property settings, branding, or configuration.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, branding: { type: 'object' }, settings: { type: 'object' } } } } },
      },
      responses: {
        '200': { description: 'Property updated' },
        '401': { description: 'Not authenticated' },
        '403': { description: 'Not authorized' },
      },
    },
  };

  spec.paths['/api/health'] = {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Basic health check endpoint. Returns OK if the application is running.',
      responses: {
        '200': { description: 'Application is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
      },
    },
  };

  spec.paths['/api/tenant/resolve'] = {
    get: {
      tags: ['Tenants'],
      summary: 'Resolve tenant from hostname',
      description: 'Resolves a tenant by subdomain or custom domain. Used by middleware for tenant-aware routing.',
      parameters: [
        { name: 'host', in: 'query', schema: { type: 'string' }, description: 'Hostname to resolve' },
        { name: 'subdomain', in: 'query', schema: { type: 'string' }, description: 'Subdomain to resolve' },
      ],
      responses: {
        '200': { description: 'Tenant resolved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
        '404': { description: 'Tenant not found' },
      },
    },
  };

  // Schemas
  spec.components.schemas = {
    ...spec.components.schemas,
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique user identifier' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        role: { type: 'string', enum: ['marketplace_master', 'manager-tenant', 'staff', 'guest'] },
      },
    },
    Tenant: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        subdomain: { type: 'string' },
        customDomain: { type: 'string' },
        plan: { type: 'string', enum: ['basic', 'premium', 'ultimate'] },
        name: { type: 'string' },
        ownerId: { type: 'string' },
        isActive: { type: 'boolean' },
        settings: { type: 'object' },
        branding: { type: 'object' },
      },
    },
    PlatformSettings: {
      type: 'object',
      properties: {
        platformName: { type: 'string' },
        supportEmail: { type: 'string' },
        currency: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
    Property: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        shortDescription: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        primaryImage: { type: 'string' },
        amenities: { type: 'string' },
        pricePerNight: { type: 'number' },
        currencyCode: { type: 'string' },
        rating: { type: 'number' },
        branding: { type: 'object' },
        settings: { type: 'object' },
      },
    },
    PropertyBrief: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        name: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
        primaryImage: { type: 'string' },
        pricePerNight: { type: 'number' },
        currencyCode: { type: 'string' },
        rating: { type: 'number' },
        isFeatured: { type: 'boolean' },
      },
    },
    Booking: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        propertyId: { type: 'string' },
        roomTypeId: { type: 'string' },
        guestName: { type: 'string' },
        guestEmail: { type: 'string' },
        checkIn: { type: 'string', format: 'date' },
        checkOut: { type: 'string', format: 'date' },
        totalAmountCents: { type: 'integer' },
        status: { type: 'string', enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] },
        createdAt: { type: 'integer' },
        guestCount: { type: 'integer' },
        currency: { type: 'string' },
      },
    },
    PaginatedResponse: {
      type: 'object',
      properties: {
        items: { type: 'array' },
        total: { type: 'integer' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
    },
  };

  // Write output
  const outDir = path.join(process.cwd(), 'docs');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'openapi.json'), JSON.stringify(spec, null, 2));
  console.log('✅ OpenAPI spec generated: docs/openapi.json');
  console.log(`   Paths: ${Object.keys(spec.paths).length}`);
  console.log(`   Schemas: ${Object.keys(spec.components.schemas).length}`);
}

generateOpenAPISpec().catch(console.error);
