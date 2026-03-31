/**
 * Hooks de React Query para todos los endpoints de la API.
 * Proveen caché automático, estados de carga/error y revalidación.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchAbout,
  fetchProjects,
  fetchSkills,
  fetchExperience,
  fetchFormacao,
  postContact,
} from '../api';


// Claves de query centralizadas para evitar errores de tipeo
export const queryKeys = {
  about: ['about'] as const,
  projects: ['projects'] as const,
  skills: ['skills'] as const,
  experience: ['experience'] as const,
  formacao: ['formacao'] as const,
};

export function useAbout() {
  return useQuery({
    queryKey: queryKeys.about,
    queryFn: fetchAbout,
    staleTime: 5 * 60 * 1000, // 5 minutos
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
    staleTime: 10 * 60 * 1000, // 10 minutos (datos más estáticos)
  });
}

export function useExperience() {
  return useQuery({
    queryKey: queryKeys.experience,
    queryFn: fetchExperience,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFormacao() {
  return useQuery({
    queryKey: queryKeys.formacao,
    queryFn: fetchFormacao,
    staleTime: 10 * 60 * 1000,
  });
}

export function useContactMutation() {
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: Parameters<typeof postContact>[0], idempotencyKey: string }) => 
      postContact(data, idempotencyKey),
  });
}


