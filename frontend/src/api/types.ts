/**
 * TypeScript types for the portfolio API.
 * All types are inferred from their corresponding Zod schemas in schemas.ts.
 */
import { z } from 'zod';
import {
  LocalizedStringSchema,
  ProjectSchema,
  ProjectDetailedSchema,
  SkillSchema,
  ExperienceSchema,
  FormationSchema,
  PhilosophyItemSchema,
  MetricsSummarySchema,
  AboutSchema,
} from './schemas';

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDetailed = z.infer<typeof ProjectDetailedSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Formation = z.infer<typeof FormationSchema>;
export type PhilosophyItem = z.infer<typeof PhilosophyItemSchema>;
export type MetricsSummary = z.infer<typeof MetricsSummarySchema>;
export type About = z.infer<typeof AboutSchema>;

// Chaos domain types (not Zod-derived — defined inline in chaosService)
export interface ChaosResponse {
  status: string;
  incident_type: string;
  elapsed_ms?: number;
  recovery_ms?: number;
  requests_sent?: number;
  requests_dropped?: number;
  error_triggered?: boolean;
  timestamp: string;
  latency_ms?: number;
  tasks_purged?: number;
}

export interface ContactResponse {
  traceId?: string;
  durationMs: number;
  queueStatus?: string;
  deliveryMode?: string;
  downstream?: string;
  message?: string;
}
