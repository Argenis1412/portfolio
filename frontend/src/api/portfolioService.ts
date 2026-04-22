/**
 * Portfolio domain fetch functions.
 * Each function is a thin wrapper over apiGet<T> with its validated schema.
 */
import { z } from 'zod';
import { apiGet } from './client';
import {
  AboutSchema,
  ProjectSchema,
  ProjectDetailedSchema,
  SkillSchema,
  ExperienceSchema,
  FormacaoSchema,
  PhilosophyItemSchema,
  MetricsSummarySchema,
} from './schemas';
import type { About, Project, ProjectDetailed, Skill, Experience, Formacao, PhilosophyItem, MetricsSummary } from './types';

// Re-export types so consumers can import from a single service file
export type { About, Project, ProjectDetailed, Skill, Experience, Formacao, PhilosophyItem, MetricsSummary };

export const fetchMetricsSummary = (chaosPreset?: string): Promise<MetricsSummary> =>
  apiGet('/metrics/summary', MetricsSummarySchema, chaosPreset);

export const fetchAbout = (): Promise<About> =>
  apiGet<About>('/sobre', AboutSchema);

export const fetchProjects = async (): Promise<Project[]> => {
  const schema = z.object({
    projetos: z.array(ProjectSchema).nullable().catch([]),
  });
  const data = await apiGet('/projetos', schema);
  return data.projetos || [];
};

export const fetchProject = (id: string): Promise<ProjectDetailed> =>
  apiGet<ProjectDetailed>(`/projetos/${id}`, ProjectDetailedSchema);

export const fetchSkills = async (): Promise<Skill[]> => {
  const schema = z.object({
    stack: z.array(SkillSchema).nullable().catch([]),
  });
  const data = await apiGet('/stack', schema);
  return data.stack || [];
};

export const fetchExperience = async (): Promise<Experience[]> => {
  const schema = z.object({
    experiencias: z.array(ExperienceSchema).nullable().catch([]),
  });
  const data = await apiGet('/experiencias', schema);
  return data.experiencias || [];
};

export const fetchFormacao = async (): Promise<Formacao[]> => {
  const schema = z.object({
    formacoes: z.array(FormacaoSchema).nullable().catch([]),
  });
  const data = await apiGet('/formacao', schema);
  return data.formacoes || [];
};

export const fetchPhilosophy = async (): Promise<PhilosophyItem[]> => {
  const schema = z.object({
    inspirations: z.array(PhilosophyItemSchema).nullable().catch([]),
  });
  const data = await apiGet('/philosophy', schema);
  return data.inspirations || [];
};
