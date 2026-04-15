import { z } from 'zod';

// ===================================================
// Esquemas de Validación (Sincronizados con Backend)
// ===================================================

export const LocalizedStringSchema = z.object({
  pt: z.string(),
  en: z.string(),
  es: z.string(),
});

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

// Esquema para listagem (Resumo)
export const ProjectSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao_curta: LocalizedStringSchema,
  descricao_completa: LocalizedStringSchema.optional(),
  tecnologias: z.array(z.string()),
  destaque: z.boolean(),
  repositorio: z.string().nullable(),
  demo: z.string().nullable(),
  imagem: z.string().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Esquema para detalhes (Detalhado)
export const ProjectDetailedSchema = ProjectSchema.extend({
  descricao_completa: LocalizedStringSchema,
  funcionalidades: z.array(z.string()),
  aprendizados: z.array(z.string()),
});

export type ProjectDetailed = z.infer<typeof ProjectDetailedSchema>;

export const SkillSchema = z.object({
  nome: z.string(),
  categoria: z.string(),
  nivel: z.number(),
  icone: z.string().nullable(),
});

export type Skill = z.infer<typeof SkillSchema>;

export const ExperienceSchema = z.object({
  id: z.string(),
  cargo: LocalizedStringSchema,
  empresa: z.string(),
  localizacao: z.string(),
  data_inicio: z.string(),
  data_fim: z.string().nullable(),
  descricao: LocalizedStringSchema,
  tecnologias: z.array(z.string()),
  atual: z.boolean(),
});

export type Experience = z.infer<typeof ExperienceSchema>;

export const FormacaoSchema = z.object({
  id: z.string(),
  curso: LocalizedStringSchema,
  instituicao: z.string(),
  localizacao: z.string(),
  data_inicio: z.string(),
  data_fim: z.string().nullable(),
  descricao: LocalizedStringSchema,
  atual: z.boolean(),
});

export type Formacao = z.infer<typeof FormacaoSchema>;

export const MetricsSummarySchema = z.object({
  p95_ms: z.number().int(),
  p95_status: z.enum(['healthy', 'degraded']),
  requests_24h: z.number().int(),
  error_rate: z.number(),
  error_rate_pct: z.string(),
  error_rate_status: z.enum(['stable', 'warning', 'investigating']),
  system_status: z.enum(['operational', 'degraded', 'down']),
  uptime: z.string(),
  window: z.string(),
  timestamp: z.string(),
});

export type MetricsSummary = z.infer<typeof MetricsSummarySchema>;

export const AboutSchema = z.object({
  nome: z.string(),
  titulo: z.string(),
  localizacao: z.string(),
  email: z.string(),
  telefone: z.string(),
  github: z.string(),
  linkedin: z.string(),
  descricao: LocalizedStringSchema,
  disponibilidade: LocalizedStringSchema,
});

export type About = z.infer<typeof AboutSchema>;

// ===================================================
// Cliente de API Centralizado con Validación Zod
// ===================================================

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '');

function buildApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  traceId?: string;
  constructor(status: number, message: string, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
    this.name = 'ApiError';
  }
}

async function apiGet<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(buildApiUrl(path));

  // Parse body first so we can extract trace_id from it on error
  const rawData = await res.json().catch(() => null);

  // Fallback chain: response header → body field → undefined
  const traceId: string | undefined =
    res.headers.get('x-trace-id') ??
    (rawData as Record<string, unknown>)?.trace_id as string | undefined ??
    undefined;

  if (!res.ok) {
    console.error('[API ERROR]', { traceId, status: res.status, endpoint: path });
    throw new ApiError(
      res.status,
      `API request failed: ${res.status} ${res.statusText} (${path})`,
      traceId,
    );
  }

  // Validación con Zod
  const result = schema.safeParse(rawData);

  if (!result.success) {
    console.error(`[Zod Error] Critical contract violation in ${path}:`, result.error.format());
    throw new Error(`Schema validation failed for ${path}`);
  }

  return result.data;
}

// ===================================================
// Funciones de Fetch (Consumidor Estricto y Resiliente)
// ===================================================

export const fetchMetricsSummary = (): Promise<MetricsSummary> =>
  apiGet('/metrics/summary', MetricsSummarySchema);

export const fetchAbout = (): Promise<About> =>
  apiGet<About>('/sobre', AboutSchema);

export const fetchProjects = async (): Promise<Project[]> => {
  const schema = z.object({ 
    projetos: z.array(ProjectSchema).nullable().catch([]) 
  });
  const data = await apiGet('/projetos', schema);
  return data.projetos || [];
};

export const fetchProject = (id: string): Promise<ProjectDetailed> =>
  apiGet<ProjectDetailed>(`/projetos/${id}`, ProjectDetailedSchema);

export const fetchSkills = async (): Promise<Skill[]> => {
  const schema = z.object({ 
    stack: z.array(SkillSchema).nullable().catch([]) 
  });
  const data = await apiGet('/stack', schema);
  return data.stack || [];
};

export const fetchExperience = async (): Promise<Experience[]> => {
  const schema = z.object({ 
    experiencias: z.array(ExperienceSchema).nullable().catch([]) 
  });
  const data = await apiGet('/experiencias', schema);
  return data.experiencias || [];
};

export const fetchFormacao = async (): Promise<Formacao[]> => {
  const schema = z.object({ 
    formacoes: z.array(FormacaoSchema).nullable().catch([]) 
  });
  const data = await apiGet('/formacao', schema);
  return data.formacoes || [];
};

// ===================================================
// Mutaciones (POST/PUT/DELETE)
// ===================================================

export async function postContact(data: {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  website: string; // Honeypot
  fax: string;     // Honeypot
}, idempotencyKey: string): Promise<{traceId?: string, durationMs: number}> {
  const apiUrl = buildApiUrl('/contato');

  const start = performance.now();
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(data),
  });
  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    let errTrace: string | undefined = res.headers.get('x-trace-id') ?? undefined;
    if (!errTrace) {
        const rawData = await res.json().catch(() => null);
        errTrace = (rawData as Record<string, unknown>)?.trace_id as string | undefined;
    }
    throw new ApiError(res.status, `Failed to submit contact form: ${res.status}`, errTrace);
  }

  const rawData = await res.json().catch(() => null);
  const traceId: string | undefined =
    res.headers.get('x-trace-id') ??
    (rawData as Record<string, unknown>)?.trace_id as string | undefined ??
    undefined;

  return { traceId, durationMs };
}
