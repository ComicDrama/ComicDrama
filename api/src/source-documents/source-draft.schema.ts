import { SourceDraftKind } from '@prisma/client';

export const SOURCE_DRAFT_SCHEMA_VERSION = '1.0.0';

type JsonSchemaType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

type JsonSchema = {
  type: JsonSchemaType | JsonSchemaType[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean;
};

export type SourceDraftValidationIssue = {
  path: string;
  keyword: 'required' | 'type' | 'additionalProperties' | 'minLength';
  message: string;
  expected?: string;
  actual?: string;
};

const nullableString = (): JsonSchema => ({ type: ['string', 'null'] });
const stringArray = (): JsonSchema => ({ type: 'array', items: { type: 'string' } });

export const SOURCE_DRAFT_SCHEMAS: Record<SourceDraftKind, JsonSchema> = {
  WORLD: {
    type: 'object',
    additionalProperties: false,
    required: [
      'setting',
      'organizations',
      'terminology',
      'timeCandidates',
      'eventCandidates',
      'openQuestions',
    ],
    properties: {
      setting: nullableString(),
      organizations: stringArray(),
      terminology: stringArray(),
      timeCandidates: stringArray(),
      eventCandidates: stringArray(),
      openQuestions: stringArray(),
    },
  },
  CHARACTER: {
    type: 'object',
    additionalProperties: false,
    required: [
      'aliases',
      'role',
      'personality',
      'background',
      'appearance',
      'costume',
      'openQuestions',
    ],
    properties: {
      aliases: stringArray(),
      role: nullableString(),
      personality: nullableString(),
      background: nullableString(),
      appearance: nullableString(),
      costume: nullableString(),
      openQuestions: stringArray(),
    },
  },
  LOCATION: {
    type: 'object',
    additionalProperties: false,
    required: ['description', 'atmosphere', 'timeContext', 'openQuestions'],
    properties: {
      description: nullableString(),
      atmosphere: nullableString(),
      timeContext: nullableString(),
      openQuestions: stringArray(),
    },
  },
  PROP: {
    type: 'object',
    additionalProperties: false,
    required: [
      'category',
      'description',
      'material',
      'dimensions',
      'defaultState',
      'openQuestions',
    ],
    properties: {
      category: nullableString(),
      description: nullableString(),
      material: nullableString(),
      dimensions: nullableString(),
      defaultState: nullableString(),
      openQuestions: stringArray(),
    },
  },
};

export function validateSourceDraft(
  kind: SourceDraftKind,
  name: string,
  content: unknown,
): SourceDraftValidationIssue[] {
  const issues: SourceDraftValidationIssue[] = [];
  if (typeof name !== 'string' || name.trim().length === 0) {
    issues.push({
      path: '/name',
      keyword: 'minLength',
      message: '名称不能为空',
      expected: 'non-empty string',
      actual: typeof name,
    });
  }
  validateAgainstSchema(content, SOURCE_DRAFT_SCHEMAS[kind], '/content', issues);
  return issues;
}

function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path: string,
  issues: SourceDraftValidationIssue[],
): void {
  const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!expectedTypes.some((type) => matchesType(value, type))) {
    issues.push({
      path,
      keyword: 'type',
      message: `字段类型不正确，期望 ${expectedTypes.join(' 或 ')}`,
      expected: expectedTypes.join('|'),
      actual: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    });
    return;
  }
  if (schema.type !== 'object' && !(Array.isArray(schema.type) && schema.type.includes('object'))) {
    if (schema.type === 'array' && schema.items && Array.isArray(value)) {
      value.forEach((item, index) =>
        validateAgainstSchema(item, schema.items!, `${path}/${index}`, issues),
      );
    }
    return;
  }
  if (!isRecord(value)) return;
  for (const required of schema.required ?? []) {
    if (!(required in value)) {
      issues.push({
        path: `${path}/${required}`,
        keyword: 'required',
        message: '缺少必填字段',
      });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    const childSchema = schema.properties?.[key];
    if (!childSchema) {
      if (schema.additionalProperties === false) {
        issues.push({
          path: `${path}/${escapeJsonPointer(key)}`,
          keyword: 'additionalProperties',
          message: '不允许存在未定义字段',
        });
      }
      continue;
    }
    validateAgainstSchema(child, childSchema, `${path}/${escapeJsonPointer(key)}`, issues);
  }
}

function matchesType(value: unknown, type: JsonSchemaType): boolean {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}
