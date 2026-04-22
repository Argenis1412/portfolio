/**
 * Zod validation schemas for the portfolio API.
 * Kept in sync with the backend Pydantic models.
 */
import { z } from 'zod';

export const LocalizedStringSchema = z.object({
  pt: z.string(),
  en: z.string(),
  es: z.string(),
});

// Summary schema (used in list endpoints)
export const ProjectSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao_curta: LocalizedStringSchema,
  descricao_completa: LocalizedStringSchema.optional(),
  tecnologias: z.array(z.string()),
  funcionalidades: z.array(z.string()).optional().default([]),
  aprendizados: z.array(z.string()).optional().default([]),
  destaque: z.boolean(),
  repositorio: z.string().nullable(),
  demo: z.string().nullable(),
  imagem: z.string().nullable(),
});

// Detail schema (used in single-project endpoints)
export const ProjectDetailedSchema = ProjectSchema.extend({
  descricao_completa: LocalizedStringSchema,
  funcionalidades: z.array(z.string()),
  aprendizados: z.array(z.string()),
});

export const SkillSchema = z.object({
  nome: z.string(),
  categoria: z.string(),
  nivel: z.number(),
  icone: z.string().nullable(),
});

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

export const PhilosophyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: LocalizedStringSchema,
  image_url: z.string(),
  description: LocalizedStringSchema,
});

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
  retries_1h: z.number().int().default(0),
  last_incident: z.string().default('none'),
  last_incident_ago: z.string().default('none'),
  // Sub-system status
  worker_status: z.enum(['ok', 'delayed']).default('ok'),
  queue_backlog: z.number().int().default(0),
  cache_status: z.enum(['direct', 'serving']).default('direct'),
  cache_ttl_s: z.number().int().default(0),
  active_path: z.enum(['sync', 'async', 'fallback']).default('sync'),
  // State machine lifecycle
  system_lifecycle: z.enum(['NORMAL', 'DEGRADED', 'RECOVERING', 'STABLE']).default('NORMAL'),
});

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
