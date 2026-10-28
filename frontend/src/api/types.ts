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
  AboutSchema,
} from './schemas';

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDetailed = z.infer<typeof ProjectDetailedSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Formation = z.infer<typeof FormationSchema>;
export type PhilosophyItem = z.infer<typeof PhilosophyItemSchema>;
export type About = z.infer<typeof AboutSchema>;

export interface ContactResponse {
  traceId?: string;
  durationMs: number;
  queueStatus?: string;
  deliveryMode?: string;
  downstream?: string;
  message?: string;
}
