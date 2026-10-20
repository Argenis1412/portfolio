/**
 * React Query hooks for all API endpoints.
 * Provide automatic caching, loading/error states, and revalidation.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchMetricsSummary,
  fetchAbout,
  fetchProjects,
  fetchSkills,
  fetchExperience,
  fetchFormation,
  fetchPhilosophy,
} from '../api/portfolioService';
import { postContact } from '../api/contactService';


// Centralized query keys to avoid typos
export const queryKeys = {
  about: ['about'] as const,
  projects: ['projects'] as const,
  skills: ['skills'] as const,
  experience: ['experience'] as const,
  formation: ['formation'] as const,
  philosophy: ['philosophy'] as const,
};

export function useAbout() {
  return useQuery({
    queryKey: queryKeys.about,
    queryFn: fetchAbout,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: queryKeys.skills,
    queryFn: fetchSkills,
    staleTime: 10 * 60 * 1000, // 10 minutes (static data)
  });
}

export function useExperience() {
  return useQuery({
    queryKey: queryKeys.experience,
    queryFn: fetchExperience,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFormation() {
  return useQuery({
    queryKey: queryKeys.formation,
    queryFn: fetchFormation,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePhilosophy() {
  return useQuery({
    queryKey: queryKeys.philosophy,
    queryFn: fetchPhilosophy,
    staleTime: 60 * 60 * 1000, // 1 hour caching for static philosophy data
  });
}

export function useContactMutation() {
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: Parameters<typeof postContact>[0], idempotencyKey: string }) =>
      postContact(data, idempotencyKey),
  });
}

export function useMetricsSummary() {
  return useQuery({
    queryKey: ['metrics-summary'],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const onAbort = () => controller.abort(signal.reason);
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort);
      try {
        return await fetchMetricsSummary(controller.signal);
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', onAbort);
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    gcTime: 60_000,
    retry: 3,
    retryDelay: count => Math.min(1_000 * 2 ** count, 4_000),
  });
}
