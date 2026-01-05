# Schemas Organization

This directory contains all Fastify route schemas following best practices for maintainability and reusability.

## Structure

```
schemas/
├── index.ts              # Central export for all schemas
├── admin.schemas.ts      # Common admin route schemas (sync, provider)
├── countries.schemas.ts  # Countries-specific schemas
├── health.schemas.ts     # Health check schemas
└── leagues.schemas.ts     # Leagues-specific schemas
```

## Best Practices

### 1. **Separation of Concerns**
- Schemas are separated from route files
- Each feature has its own schema file
- Common/reusable schemas are in `admin.schemas.ts`

### 2. **Naming Convention**
- File names: `{feature}.schemas.ts` (plural)
- Schema names: `{action}{Entity}{Type}Schema`
  - Example: `listCountriesQuerystringSchema`
  - Example: `getCountryResponseSchema`
  - Example: `syncBodySchema` (common)

### 3. **Organization by Feature**
- Group related schemas together
- One file per feature/domain
- Common schemas (pagination, sync, etc.) in `admin.schemas.ts`

### 4. **Reusability**
- Extract common patterns (pagination, error responses)
- Share schemas across similar routes
- Use composition for complex schemas

### 5. **Type Safety**
- Schemas match TypeScript types from `@repo/types`
- Response schemas align with API response types
- Use consistent property names

## Usage in Routes

```typescript
import {
  listCountriesQuerystringSchema,
  listCountriesResponseSchema,
} from "../../../schemas/admin/countries.schemas";

fastify.get("/countries", {
  schema: {
    querystring: listCountriesQuerystringSchema,
    response: {
      200: listCountriesResponseSchema,
    },
  },
}, handler);
```

## Schema Types

### Query String Schemas
- `list{Entity}QuerystringSchema` - For list endpoints with pagination
- `search{Entity}QuerystringSchema` - For search endpoints
- `get{Entity}QuerystringSchema` - For get by ID endpoints

### Params Schemas
- `get{Entity}ParamsSchema` - For route parameters

### Body Schemas
- `syncBodySchema` - Common sync request body
- `create{Entity}BodySchema` - For POST endpoints
- `update{Entity}BodySchema` - For PUT/PATCH endpoints

### Response Schemas
- `list{Entity}ResponseSchema` - For list endpoints
- `get{Entity}ResponseSchema` - For get by ID endpoints
- `{Entity}404ResponseSchema` - For 404 error responses
- `syncResponseSchema` - Common sync response
- `providerResponseSchema` - Common provider response

## Adding New Schemas

1. **Identify the feature** (countries, leagues, etc.)
2. **Create or update** the corresponding schema file
3. **Export** from `index.ts` for convenience
4. **Import and use** in route files

Example:
```typescript
// schemas/admin/teams.schemas.ts
export const listTeamsQuerystringSchema = { ... };

// schemas/index.ts
export * from "./teams.schemas";

// routes/admin/db/teams.route.ts
import { listTeamsQuerystringSchema } from "../../../schemas";
```

## Benefits

✅ **Maintainability**: All schemas in one place
✅ **Reusability**: Share schemas across routes
✅ **Type Safety**: Consistent with TypeScript types
✅ **Documentation**: Self-documenting API structure
✅ **Testing**: Easy to test schemas independently
✅ **OpenAPI/Swagger**: Automatic API documentation generation

