/**
 * Testes de qualidade para as funções de API (`api.ts`).
 *
 * Verifica que cada função fetch:
 * - Usa a URL correta
 * - Retorna os dados no formato esperado
 * - Lança erro quando a resposta não é OK
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

  it('retorna os dados do perfil quando a resposta é OK', async () => {
    mockFetchOk(aboutFixture);
    const about = await fetchAbout();
    expect(about.nome).toBe('Argenis Lopez');
    expect(about.descricao).toEqual({ pt: 'PT', en: 'EN', es: 'ES' });
  });

  it('lança erro quando a resposta não é OK', async () => {
    mockFetchError(404);
    await expect(fetchAbout()).rejects.toThrow(/API request failed: 404/);
  });

  it('chama a URL correta (/sobre)', async () => {
    mockFetchOk(aboutFixture);
    const spy = vi.spyOn(globalThis, 'fetch');
    await fetchAbout();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('/sobre'));
  });
});

// ─── fetchProjects ─────────────────────────────────────────────────────────────

describe('fetchProjects', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna lista de projetos', async () => {
    mockFetchOk({ projetos: [projectFixture], total: 1 });
    const projects = await fetchProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('proj-1');
  });

  it('retorna lista vazia se projetos não é array (Resiliência / Hardening)', async () => {
    mockFetchOk({ projetos: null, total: 0 });
    // Agora o sistema é robusto: detecta o erro mas falha para [] para não quebrar o site
    const projects = await fetchProjects();
    expect(projects).toEqual([]);
  });

  it('lança erro quando a resposta não é OK', async () => {
    mockFetchError(500);
    await expect(fetchProjects()).rejects.toThrow(/API request failed: 500/);
  });
});

// ─── fetchSkills ───────────────────────────────────────────────────────────────

describe('fetchSkills', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna lista de habilidades', async () => {
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

  it('lança erro quando o servidor retorna erro', async () => {
    mockFetchError(503);
    await expect(fetchSkills()).rejects.toThrow(/API request failed: 503/);
  });
});

// ─── fetchExperience ───────────────────────────────────────────────────────────

describe('fetchExperience', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna lista de experiências', async () => {
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

  it('lança erro quando a resposta não é OK', async () => {
    mockFetchError(500);
    await expect(fetchExperience()).rejects.toThrow(/API request failed: 500/);
  });
});

// ─── fetchFormacao ─────────────────────────────────────────────────────────────

describe('fetchFormacao', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retorna lista de formações', async () => {
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

  it('lança erro quando a resposta não é OK', async () => {
    mockFetchError(500);
    await expect(fetchFormacao()).rejects.toThrow(/API request failed: 500/);
  });
});
