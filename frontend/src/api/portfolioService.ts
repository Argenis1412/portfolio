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
  FormationSchema,
  PhilosophyItemSchema,
  MetricsSummarySchema,
} from './schemas';
import type { About, Project, ProjectDetailed, Skill, Experience, Formation, PhilosophyItem, MetricsSummary } from './types';

// Re-export types so consumers can import from a single service file
export type { About, Project, ProjectDetailed, Skill, Experience, Formation, PhilosophyItem, MetricsSummary };

export const fetchMetricsSummary = (chaosPreset?: string): Promise<MetricsSummary> =>
  apiGet('/metrics/summary', MetricsSummarySchema, chaosPreset);

export const fetchAbout = (): Promise<About> =>
  apiGet<About>('/about', AboutSchema);

export const fetchProjects = async (): Promise<Project[]> => {
  const schema = z.object({
    projects: z.array(ProjectSchema).nullable().catch([]),
  });
  const data = await apiGet('/projects', schema);
  return data.projects || [];
};

export const fetchProject = (id: string): Promise<ProjectDetailed> =>
  apiGet<ProjectDetailed>(`/projects/${id}`, ProjectDetailedSchema);

export const fetchSkills = async (): Promise<Skill[]> => {
  const schema = z.object({
    by_category: z.record(z.string(), z.array(SkillSchema)).nullable().catch({}),
    stack: z.array(SkillSchema).nullable().catch([]),
  });
  const data = await apiGet('/stack', schema);
  return data.stack || [];
};

export const fetchExperience = async (): Promise<Experience[]> => {
  const schema = z.object({
    experiences: z.array(ExperienceSchema).nullable().catch([]),
  });
  const data = await apiGet('/experiences', schema);
  return data.experiences || [];
};

export const fetchFormation = async (): Promise<Formation[]> => {
  const schema = z.object({
    formations: z.array(FormationSchema).nullable().catch([]),
  });
  const data = await apiGet('/formation', schema);
  return data.formations || [];
};

export const fetchPhilosophy = async (): Promise<PhilosophyItem[]> => {
  const schema = z.object({
    inspirations: z.array(PhilosophyItemSchema).nullable().catch([]),
  });
  const data = await apiGet('/philosophy', schema);
  return data.inspirations || [];
};
