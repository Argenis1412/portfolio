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

export const CaseStudyEvidenceSchema = z.object({
  label: LocalizedStringSchema,
  value: z.string().max(160),
  localized_value: LocalizedStringSchema.nullish(),
  classification: z.enum(['REAL', 'REPRODUCED', 'SYNTHETIC']),
  source: z.string().max(240),
});

export const ProjectCaseStudySchema = z.object({
  problem: LocalizedStringSchema,
  constraints: LocalizedStringSchema,
  solution: LocalizedStringSchema,
  architecture: LocalizedStringSchema,
  testing: LocalizedStringSchema,
  reliability: LocalizedStringSchema,
  impact: LocalizedStringSchema,
  evidence: z.array(CaseStudyEvidenceSchema).default([]),
});

// Summary schema (used in list endpoints)
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  short_description: LocalizedStringSchema,
  full_description: LocalizedStringSchema.optional(),
  technologies: z.array(z.string()),
  features: z.array(z.string()).optional().default([]),
  learnings: z.array(z.string()).optional().default([]),
  highlighted: z.boolean(),
  repository: z.string().nullable(),
  demo: z.string().nullable(),
  image: z.string().nullable(),
  case_study: ProjectCaseStudySchema.nullable().optional(),
});

// Detail schema (used in single-project endpoints)
export const ProjectDetailedSchema = ProjectSchema.extend({
  full_description: LocalizedStringSchema,
  features: z.array(z.string()),
  learnings: z.array(z.string()),
});

export const SkillSchema = z.object({
  name: z.string(),
  category: z.string(),
  level: z.number(),
  icon: z.string().nullable(),
});

export const ExperienceSchema = z.object({
  id: z.string(),
  role: LocalizedStringSchema,
  company: z.string(),
  location: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  description: LocalizedStringSchema,
  technologies: z.array(z.string()),
  current: z.boolean(),
});

export const FormationSchema = z.object({
  id: z.string(),
  course: LocalizedStringSchema,
  institution: z.string(),
  location: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  description: LocalizedStringSchema,
  current: z.boolean(),
});

export const PhilosophyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: LocalizedStringSchema,
  image_url: z.string(),
  description: LocalizedStringSchema,
});

export const AboutSchema = z.object({
  name: z.string(),
  title: z.string(),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  github: z.string(),
  linkedin: z.string(),
  description: LocalizedStringSchema,
  availability: LocalizedStringSchema,
});
