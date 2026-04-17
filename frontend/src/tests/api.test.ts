/**
 * Quality tests for API functions (`api.ts`).
 *
 * Verifies that each fetch function:
 * - Uses the correct URL
 * - Returns data in the expected format
 * - Throws error when response is not OK
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchAbout,
  fetchProjects,
  fetchSkills,
  fetchExperience,
  fetchFormacao,
} from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockFetchOk = (data: unknown) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

const mockFetchError = (status = 500) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response('Internal Error', { status })
  );
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const aboutFixture = {
  nome: 'Argenis Lopez',
  titulo: 'Backend Developer',
  localizacao: 'Curitiba, PR',
  email: 'test@example.com',
  telefone: '(41) 99999-9999',
  github: 'https://github.com/test',
  linkedin: 'https://linkedin.com/in/test',
  descricao: { pt: 'PT', en: 'EN', es: 'ES' },
  disponibilidade: { pt: 'Remoto', en: 'Remote', es: 'Remoto' },
};

const projectFixture = {
  id: 'proj-1',
  nome: 'Projeto Teste',
  descricao_curta: { pt: 'PT', en: 'EN', es: 'ES' },
  descricao_completa: { pt: 'PT', en: 'EN', es: 'ES' },
  tecnologias: ['Python', 'FastAPI'],
  funcionalidades: ['Feature A'],
  aprendizados: ['Lesson A'],
  repositorio: 'https://github.com/test/repo',
  demo: null,
  destaque: true,
  imagem: null,
};

// ─── fetchAbout ────────────────────────────────────────────────────────────────

describe('fetchAbout', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns profile data when response is OK', async () => {
    mockFetchOk(aboutFixture);
    const about = await fetchAbout();
    expect(about.nome).toBe('Argenis Lopez');
    expect(about.descricao).toEqual({ pt: 'PT', en: 'EN', es: 'ES' });
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(404);
    await expect(fetchAbout()).rejects.toThrow(/API request failed: 404/);
    spy.mockRestore();
  });

  it('calls correct URL (/sobre)', async () => {
    mockFetchOk(aboutFixture);
    const spy = vi.spyOn(globalThis, 'fetch');
    await fetchAbout();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('/sobre'));
  });
});

// ─── fetchProjects ─────────────────────────────────────────────────────────────

describe('fetchProjects', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns projects list', async () => {
    mockFetchOk({ projetos: [projectFixture], total: 1 });
    const projects = await fetchProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('proj-1');
  });

  it('returns empty list if projects is not an array (Resilience / Hardening)', async () => {
    mockFetchOk({ projetos: null, total: 0 });
    // Now the system is robust: it detects the error but defaults to [] to avoid breaking the site
    const projects = await fetchProjects();
    expect(projects).toEqual([]);
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchProjects()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });
});

// ─── fetchSkills ───────────────────────────────────────────────────────────────

describe('fetchSkills', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns skills list', async () => {
    mockFetchOk({
      stack: [
        { nome: 'Python', categoria: 'backend', nivel: 5, icone: 'python' },
      ],
      por_categoria: {},
    });

    const skills = await fetchSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills[0].nome).toBe('Python');
    expect(skills[0].nivel).toBe(5);
  });

  it('throws error when server returns error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(503);
    await expect(fetchSkills()).rejects.toThrow(/API request failed: 503/);
    spy.mockRestore();
  });
});

// ─── fetchExperience ───────────────────────────────────────────────────────────

describe('fetchExperience', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns experience list', async () => {
    mockFetchOk({
      experiencias: [
        {
          id: 'exp-1',
          cargo: { pt: 'Dev', en: 'Dev', es: 'Dev' },
          empresa: 'Empresa A',
          localizacao: 'Remoto',
          data_inicio: '2024-01-01',
          data_fim: null,
          descricao: { pt: 'PT', en: 'EN', es: 'ES' },
          tecnologias: ['Python'],
          atual: true,
        },
      ],
      total: 1,
    });

    const exp = await fetchExperience();
    expect(exp.length).toBe(1);
    expect(exp[0].empresa).toBe('Empresa A');
    expect(exp[0].atual).toBe(true);
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchExperience()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });
});

// ─── fetchFormacao ─────────────────────────────────────────────────────────────

describe('fetchFormacao', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns education list', async () => {
    mockFetchOk({
      formacoes: [
        {
          id: 'edu-1',
          curso: { pt: 'ADS', en: 'Systems Analysis', es: 'Sistemas' },
          instituicao: 'UFPR',
          localizacao: 'Curitiba, PR',
          data_inicio: '2024-02-01',
          data_fim: null,
          descricao: { pt: 'Em andamento', en: 'In progress', es: 'En progreso' },
          atual: true,
        },
      ],
      total: 1,
    });

    const formacao = await fetchFormacao();
    expect(formacao.length).toBe(1);
    expect(formacao[0].instituicao).toBe('UFPR');
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchFormacao()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });
});
