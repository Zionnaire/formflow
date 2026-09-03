import { groq } from '../config/groq.js';
import { env } from '../config/env.js';
import { logger } from '../Middlewares/logger.js';
import { ApiError } from '../Utils/errors.js';
import type { PositionedText } from './pdfText.service.js';
import type { FieldDefinition, FormSection, FieldType, PartyRole } from '../Types/index.js';

const FIELD_TYPES: FieldType[] = [
  'text',
  'date',
  'checkbox',
  'rating_grid',
  'long_text_ruled',
  'signature',
  'stamp',
  'computed',
];
const PARTY_ROLES: PartyRole[] = ['owner', 'field_supervisor', 'university_supervisor', 'hod', 'guardian', 'multi'];

const FIELD_TYPE_GUIDE = `
Field type vocabulary — classify every fillable area as exactly one of:
- "text": a single-line input (name, ID number, short answer).
- "date": a date input.
- "checkbox": a single yes/no toggle box.
- "rating_grid": a table with criteria rows and rating columns (e.g. Excellent/Very Good/Good/Fair/Poor)
  — one field per table, with gridCriteria = the row labels and gridOptions = the column labels.
- "long_text_ruled": a block of consecutive ruled/blank lines meant for handwritten paragraphs
  under a heading — set ruledLineCount to roughly how many ruled lines are in the block. If there
  is instructional text printed just under the heading (e.g. "Provide a brief overview of your
  internship, including the name of the organization…"), capture it verbatim in helpText — do not
  invent it if none is present.
- "signature": a signature line or box.
- "stamp": an official stamp/seal area — not digitally fillable, include it so the UI can flag it,
  but it never gets a value.
- "computed": a value derived from other fields (e.g. a total score) — set computeFrom to the
  field ids it derives from. Only use this for fields that are clearly a sum/total of others.
`;

const EXTRACT_FIELDS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'submit_form_fields',
    description: 'Submit the extracted field schema and party sections for this PDF form.',
    parameters: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          description:
            'Distinct parties who fill out different parts of this form. If the whole form is filled by one person, return a single section with role "owner" spanning every page.',
          items: {
            type: 'object',
            properties: {
              sectionId: { type: 'string', description: 'Short stable id, e.g. "A" or "owner".' },
              label: { type: 'string', description: "Human-readable section name, e.g. \"Student's Report\"." },
              role: { type: 'string', enum: PARTY_ROLES },
              pageRange: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
                description: '[firstPage, lastPage], 1-indexed, inclusive.',
              },
            },
            required: ['sectionId', 'label', 'role', 'pageRange'],
          },
        },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Short stable id, e.g. "firstName" or "section_b_row_2".' },
              type: { type: 'string', enum: FIELD_TYPES },
              label: { type: 'string' },
              sectionId: { type: 'string', description: 'Must match one of the sections above.' },
              page: { type: 'number', description: '1-indexed page this field appears on.' },
              coordinates: {
                type: 'object',
                description:
                  'Position as a FRACTION of page width/height (0 to 1), origin top-left — estimate from the nearby text item coordinates provided, placing the input just after/below its label.',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
                required: ['x', 'y', 'width', 'height'],
              },
              required: { type: 'boolean' },
              helpText: {
                type: 'string',
                description:
                  'Instructional sentence(s) printed under this field\'s heading in the source PDF, verbatim — omit if there is none. Most relevant for long_text_ruled fields.',
              },
              ruledLineCount: { type: 'number' },
              gridCriteria: { type: 'array', items: { type: 'string' } },
              gridOptions: { type: 'array', items: { type: 'string' } },
              computeFrom: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'type', 'label', 'sectionId', 'page', 'coordinates', 'required'],
          },
        },
      },
      required: ['sections', 'fields'],
    },
  },
};

const AUTO_FILL_TOOL = {
  type: 'function' as const,
  function: {
    name: 'submit_field_values',
    description: 'Submit the best-guess value for each field, mapped from the profile.',
    parameters: {
      type: 'object',
      properties: {
        mapping: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fieldId: { type: 'string' },
              value: { type: 'string', description: 'Leave empty string if nothing in the profile matches.' },
            },
            required: ['fieldId', 'value'],
          },
        },
      },
      required: ['mapping'],
    },
  },
};

const DRAFT_WRITEUP_TOOL = {
  type: 'function' as const,
  function: {
    name: 'submit_writeup_drafts',
    description: 'Submit a starter draft paragraph for each long-form write-up field.',
    parameters: {
      type: 'object',
      properties: {
        drafts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fieldId: { type: 'string' },
              value: {
                type: 'string',
                description:
                  'A short draft paragraph in first person, built only from the known facts provided. Use a bracketed placeholder like "[describe your specific tasks here]" for anything specific you were not given — never invent facts. Leave empty string if you have nothing to build from.',
              },
            },
            required: ['fieldId', 'value'],
          },
        },
      },
      required: ['drafts'],
    },
  },
};

export interface ExtractedSchema {
  sections: FormSection[];
  fields: FieldDefinition[];
}

/**
 * Groq's chat models are text-only, so the PDF is first flattened to positioned text
 * (pdfText.service.ts) rather than sent as a document/image.
 *
 * The free/on-demand tier caps openai/gpt-oss-120b (and every other tool-calling-capable
 * model) at 8,000 tokens PER REQUEST total (prompt + max_tokens) — not a rolling per-minute
 * budget you can wait out. maxTokens defaults conservatively low to leave room for the prompt;
 * raise GROQ_MODEL's tier (see https://console.groq.com/settings/billing) before raising this.
 */
async function callTool<T>(
  toolName: string,
  tools: Array<typeof EXTRACT_FIELDS_TOOL | typeof AUTO_FILL_TOOL | typeof DRAFT_WRITEUP_TOOL>,
  prompt: string,
  maxTokens = 3000,
): Promise<T> {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(503, 'The AI pipeline is not configured — GROQ_API_KEY is missing', 'NOT_IMPLEMENTED');
  }

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: env.GROQ_MODEL,
      max_tokens: maxTokens,
      tools,
      tool_choice: { type: 'function', function: { name: toolName } },
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 413 || status === 429) {
      throw new ApiError(413, 'This form is too large for the current Groq plan/tier to process in one request', 'VALIDATION_ERROR');
    }
    throw err;
  }

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== toolName) {
    throw new ApiError(502, 'Groq did not return the expected structured tool call', 'INTERNAL_ERROR');
  }

  try {
    return JSON.parse(toolCall.function.arguments) as T;
  } catch {
    throw new ApiError(502, 'Groq returned malformed JSON in its tool call', 'INTERNAL_ERROR');
  }
}

/**
 * Above this many text items in one call, the prompt + a full field-schema response for that
 * many fields risks blowing past Groq's 8,000-token-per-request ceiling (confirmed against a
 * real 13-page, 174-item form: one shot truncated mid-JSON). Batching by page range keeps each
 * call's input small regardless of document length, at the cost of one call per batch.
 */
const MAX_ITEMS_PER_BATCH = 40;

interface PageBatch {
  pageRange: [number, number];
  items: PositionedText[];
}

function batchByPageRange(items: PositionedText[], pageCount: number): PageBatch[] {
  const batches: PageBatch[] = [];
  let current: PositionedText[] = [];
  let batchStartPage = 1;

  for (let page = 1; page <= pageCount; page++) {
    const pageItems = items.filter((i) => i.page === page);
    if (current.length > 0 && current.length + pageItems.length > MAX_ITEMS_PER_BATCH) {
      batches.push({ pageRange: [batchStartPage, page - 1], items: current });
      current = [];
      batchStartPage = page;
    }
    current.push(...pageItems);
  }
  if (current.length > 0 || batches.length === 0) {
    batches.push({ pageRange: [batchStartPage, pageCount], items: current });
  }
  return batches;
}

/** Batch-local sectionId -> canonical sectionId, merging same-role sections across batches and widening their pageRange. */
function mergeIntoCanonicalSections(canonicalByRole: Map<PartyRole, FormSection>, batchSections: FormSection[]): Map<string, string> {
  const localToCanonical = new Map<string, string>();

  for (const section of batchSections) {
    const existing = canonicalByRole.get(section.role);
    if (existing) {
      existing.pageRange = [Math.min(existing.pageRange[0], section.pageRange[0]), Math.max(existing.pageRange[1], section.pageRange[1])];
      localToCanonical.set(section.sectionId, existing.sectionId);
    } else {
      canonicalByRole.set(section.role, section);
      localToCanonical.set(section.sectionId, section.sectionId);
    }
  }

  return localToCanonical;
}

function ensureUniqueId(id: string, seen: Set<string>): string {
  if (!seen.has(id)) {
    seen.add(id);
    return id;
  }
  let suffix = 2;
  while (seen.has(`${id}_${suffix}`)) suffix++;
  const unique = `${id}_${suffix}`;
  seen.add(unique);
  return unique;
}

export async function extractFieldsFromPdf(items: PositionedText[], pageCount: number, title: string): Promise<ExtractedSchema> {
  const batches = batchByPageRange(items, pageCount);
  logger.info({ title, pageCount, itemCount: items.length, batchCount: batches.length }, 'Extracting fields from PDF');

  const canonicalByRole = new Map<PartyRole, FormSection>();
  const fields: FieldDefinition[] = [];
  const seenFieldIds = new Set<string>();

  for (const batch of batches) {
    const layout = batch.items.map((i) => ({ page: i.page, text: i.text, x: round(i.x), y: round(i.y) }));
    const isOnlyBatch = batches.length === 1;

    const prompt = `This form is titled "${title}" and has ${pageCount} page(s) total.${
      isOnlyBatch ? '' : ` You are looking at pages ${batch.pageRange[0]}-${batch.pageRange[1]} only, out of the full document.`
    } Below is every text run extracted from ${isOnlyBatch ? 'the PDF' : 'these pages'}, with its page number and position as a fraction of page width (x) and height (y), origin top-left.\n\n${JSON.stringify(layout)}\n\nUsing this layout, identify every fillable field a person would need to complete on ${isOnlyBatch ? 'this form' : 'these pages'}.\n${FIELD_TYPE_GUIDE}\nIf a section (a distinct party's part of the form) appears here, include it in "sections" with the page range you can see for it in this excerpt — even if it continues beyond these pages. Call submit_form_fields with the result.`;

    const input = await callTool<{ sections?: unknown; fields?: unknown }>('submit_form_fields', [EXTRACT_FIELDS_TOOL], prompt, 4000);

    const batchSections = sanitizeSections(input.sections);
    const localToCanonical = mergeIntoCanonicalSections(canonicalByRole, batchSections);
    const batchFields = sanitizeFields(input.fields, batchSections);

    for (const field of batchFields) {
      fields.push({
        ...field,
        id: ensureUniqueId(field.id, seenFieldIds),
        sectionId: localToCanonical.get(field.sectionId) ?? field.sectionId,
      });
    }
  }

  if (canonicalByRole.size === 0) {
    canonicalByRole.set('owner', { sectionId: 'owner', label: 'Applicant', role: 'owner', pageRange: [1, pageCount] });
  }

  if (fields.length === 0) {
    logger.warn({ title }, 'Groq extracted zero fields from PDF');
  }

  return { sections: [...canonicalByRole.values()], fields };
}

/** Fuzzy-maps a user's profile onto a template's field labels (brief section 8, step 2). */
export async function mapProfileToFields(
  profile: Record<string, unknown>,
  fields: Array<{ id: string; label: string; type: FieldType }>,
): Promise<Record<string, string>> {
  if (fields.length === 0) return {};

  const prompt = `Student profile:\n${JSON.stringify(profile, null, 2)}\n\nForm fields needing a value:\n${JSON.stringify(fields, null, 2)}\n\nMatch each field to the closest profile value by meaning, not just exact label text (e.g. "Student's Full Name" -> profile.fullName). Only map a field when a profile value genuinely represents that same fact — e.g. profile.department is the student's academic department, never a stand-in for an internship organization, employer, or address, even when nothing else fits. Leave value as an empty string rather than guessing from an unrelated field. Call submit_field_values.`;

  const input = await callTool<{ mapping?: Array<{ fieldId?: unknown; value?: unknown }> }>(
    'submit_field_values',
    [AUTO_FILL_TOOL],
    prompt,
  );

  const result: Record<string, string> = {};
  for (const entry of input.mapping ?? []) {
    if (typeof entry.fieldId === 'string' && typeof entry.value === 'string' && entry.value.trim()) {
      result[entry.fieldId] = entry.value;
    }
  }
  return result;
}

/**
 * Drafts a starting paragraph for each long-form write-up field (Introduction, Duties, Challenges, …),
 * grounded only in facts already known about this submission — never fabricates specifics it wasn't
 * given. Distinct from mapProfileToFields: that fuzzy-matches existing profile values 1:1 onto simple
 * text/date fields, this generates new prose the student is expected to review and personalize before
 * submitting.
 */
export async function draftWriteups(
  knownFacts: Record<string, unknown>,
  fields: Array<{ id: string; label: string; helpText?: string; ruledLineCount?: number }>,
): Promise<Record<string, string>> {
  if (fields.length === 0) return {};

  const prompt = `Known facts about this student and their internship:\n${JSON.stringify(knownFacts, null, 2)}\n\nWrite-up fields needing a starter draft:\n${JSON.stringify(
    fields,
    null,
    2,
  )}\n\nFor each field, write a short first-person draft paragraph a student could start from, sized to roughly its ruledLineCount (about 10-12 words per ruled line). Ground every sentence only in the known facts above and the field's own helpText instructions — for any specific detail you were not given (e.g. exact tasks performed, specific lessons learned), write a clear bracketed placeholder like "[name the specific tools or systems you used]" instead of inventing one. Call submit_writeup_drafts.`;

  const input = await callTool<{ drafts?: Array<{ fieldId?: unknown; value?: unknown }> }>(
    'submit_writeup_drafts',
    [DRAFT_WRITEUP_TOOL],
    prompt,
    Math.min(6000, 1000 + fields.length * 400),
  );

  const result: Record<string, string> = {};
  for (const entry of input.drafts ?? []) {
    if (typeof entry.fieldId === 'string' && typeof entry.value === 'string' && entry.value.trim()) {
      result[entry.fieldId] = entry.value;
    }
  }
  return result;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** No fallback here deliberately — an empty batch (e.g. a cover page with nothing to fill) should
 *  contribute nothing, not a spurious placeholder section. extractFieldsFromPdf applies the
 *  "ensure at least one section" fallback once, after merging every batch. */
function sanitizeSections(raw: unknown): FormSection[] {
  if (!Array.isArray(raw)) return [];

  const sections: FormSection[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const s = entry as Record<string, unknown>;
    if (
      typeof s['sectionId'] === 'string' &&
      typeof s['label'] === 'string' &&
      typeof s['role'] === 'string' &&
      PARTY_ROLES.includes(s['role'] as PartyRole) &&
      Array.isArray(s['pageRange']) &&
      s['pageRange'].length === 2
    ) {
      sections.push({
        sectionId: s['sectionId'],
        label: s['label'],
        role: s['role'] as PartyRole,
        pageRange: [Number(s['pageRange'][0]), Number(s['pageRange'][1])],
      });
    }
  }
  return sections;
}

function sanitizeFields(raw: unknown, sections: FormSection[]): FieldDefinition[] {
  if (!Array.isArray(raw)) return [];
  const validSectionIds = new Set(sections.map((s) => s.sectionId));
  const fields: FieldDefinition[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const f = entry as Record<string, unknown>;
    const coords = f['coordinates'] as Record<string, unknown> | undefined;

    if (
      typeof f['id'] === 'string' &&
      typeof f['type'] === 'string' &&
      FIELD_TYPES.includes(f['type'] as FieldType) &&
      typeof f['label'] === 'string' &&
      typeof f['sectionId'] === 'string' &&
      validSectionIds.has(f['sectionId']) &&
      typeof f['page'] === 'number' &&
      coords &&
      typeof coords['x'] === 'number' &&
      typeof coords['y'] === 'number' &&
      typeof coords['width'] === 'number' &&
      typeof coords['height'] === 'number'
    ) {
      fields.push({
        id: f['id'],
        type: f['type'] as FieldType,
        label: f['label'],
        sectionId: f['sectionId'],
        page: f['page'],
        coordinates: {
          x: coords['x'] as number,
          y: coords['y'] as number,
          width: coords['width'] as number,
          height: coords['height'] as number,
        },
        required: Boolean(f['required']),
        ...(typeof f['helpText'] === 'string' && f['helpText'].trim() ? { helpText: f['helpText'] } : {}),
        ...(typeof f['ruledLineCount'] === 'number' ? { ruledLineCount: f['ruledLineCount'] } : {}),
        ...(Array.isArray(f['gridCriteria']) ? { gridCriteria: f['gridCriteria'] as string[] } : {}),
        ...(Array.isArray(f['gridOptions']) ? { gridOptions: f['gridOptions'] as string[] } : {}),
        ...(Array.isArray(f['computeFrom']) ? { computeFrom: f['computeFrom'] as string[] } : {}),
      });
    }
  }
  return fields;
}
