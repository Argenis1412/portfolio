/**
 * Quality tests for the portfolio API service layer.
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
  fetchFormation,
  fetchPhilosophy,
} from '../api/index';

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
  name: 'Argenis Lopez',
  title: 'Backend Developer',
  location: 'Curitiba, PR',
  email: 'test@example.com',
  phone: '(41) 99999-9999',
  github: 'https://github.com/test',
  linkedin: 'https://linkedin.com/in/test',
  description: { pt: 'PT', en: 'EN', es: 'ES' },
  availability: { pt: 'Remoto', en: 'Remote', es: 'Remoto' },
};

const projectFixture = {
  id: 'proj-1',
  name: 'Projeto Teste',
  short_description: { pt: 'PT', en: 'EN', es: 'ES' },
  full_description: { pt: 'PT', en: 'EN', es: 'ES' },
  technologies: ['Python', 'FastAPI'],
  features: ['Feature A'],
  learnings: ['Lesson A'],
  repository: 'https://github.com/test/repo',
  demo: null,
  highlighted: true,
  image: null,
};

// ─── fetchAbout ────────────────────────────────────────────────────────────────

describe('fetchAbout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns profile data when response is OK', async () => {
    mockFetchOk(aboutFixture);
    const about = await fetchAbout();
    expect(about.name).toBe('Argenis Lopez');
    expect(about.description).toEqual({ pt: 'PT', en: 'EN', es: 'ES' });
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(404);
    await expect(fetchAbout()).rejects.toThrow(/API request failed: 404/);
    spy.mockRestore();
  });

  it('calls correct URL (/about)', async () => {
    mockFetchOk(aboutFixture);
    const spy = vi.spyOn(globalThis, 'fetch');
    await fetchAbout();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('/about'), expect.any(Object));
  });
});

// ─── fetchProjects ─────────────────────────────────────────────────────────────

describe('fetchProjects', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns projects list', async () => {
    mockFetchOk({ projects: [projectFixture], total: 1 });
    const projects = await fetchProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('proj-1');
  });

  it('returns empty list if projects is not an array (Resilience / Hardening)', async () => {
    mockFetchOk({ projects: null, total: 0 });
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
        { name: 'Python', category: 'backend', level: 5, icon: 'python' },
      ],
      by_category: {},
    });

    const skills = await fetchSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills[0].name).toBe('Python');
    expect(skills[0].level).toBe(5);
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
      experiences: [
        {
          id: 'exp-1',
          role: { pt: 'Dev', en: 'Dev', es: 'Dev' },
          company: 'Empresa A',
          location: 'Remoto',
          start_date: '2024-01-01',
          end_date: null,
          description: { pt: 'PT', en: 'EN', es: 'ES' },
          technologies: ['Python'],
          current: true,
        },
      ],
      total: 1,
    });

    const exp = await fetchExperience();
    expect(exp.length).toBe(1);
    expect(exp[0].company).toBe('Empresa A');
    expect(exp[0].current).toBe(true);
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchExperience()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });
});

// ─── fetchFormation ────────────────────────────────────────────────────────────

describe('fetchFormation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns education list', async () => {
    mockFetchOk({
      formations: [
        {
          id: 'edu-1',
          course: { pt: 'ADS', en: 'Systems Analysis', es: 'Sistemas' },
          institution: 'UFPR',
          location: 'Curitiba, PR',
          start_date: '2024-02-01',
          end_date: null,
          description: { pt: 'Em andamento', en: 'In progress', es: 'En progreso' },
          current: true,
        },
      ],
      total: 1,
    });

    const formation = await fetchFormation();
    expect(formation.length).toBe(1);
    expect(formation[0].institution).toBe('UFPR');
  });

  it('throws error when response is not OK', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchFormation()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });
});

// ─── fetchPhilosophy ───────────────────────────────────────────────────────────

const philosophyFixture = {
  id: 'linus-torvalds',
  name: 'Linus Torvalds',
  role: { pt: 'Criador do Linux', en: 'Creator of Linux', es: 'Creador de Linux' },
  image_url: '/images/philosophy/linus.jpg',
  description: { pt: 'PT desc', en: 'EN desc', es: 'ES desc' },
};

describe('fetchPhilosophy', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns list of philosophy inspirations', async () => {
    mockFetchOk({ inspirations: [philosophyFixture], total: 1 });
    const items = await fetchPhilosophy();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('linus-torvalds');
    expect(items[0].role.en).toBe('Creator of Linux');
  });

  it('returns empty list when inspirations is null (resilience)', async () => {
    mockFetchOk({ inspirations: null, total: 0 });
    const items = await fetchPhilosophy();
    expect(items).toEqual([]);
  });

  it('throws ApiError when the server returns a non-OK status', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchError(500);
    await expect(fetchPhilosophy()).rejects.toThrow(/API request failed: 500/);
    spy.mockRestore();
  });

  it('calls the correct endpoint (/philosophy)', async () => {
    mockFetchOk({ inspirations: [], total: 0 });
    const spy = vi.spyOn(globalThis, 'fetch');
    await fetchPhilosophy();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('/philosophy'), expect.any(Object));
  });
});
