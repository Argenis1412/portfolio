import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const current = JSON.parse(readFileSync(new URL('../src/tests/fixtures/metrics-d0d1cea.json', import.meta.url), 'utf8'));

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../backend/data/${name}.json`, import.meta.url), 'utf8'));
const projects = load('projects');
const cases = load('project_case_studies');
export const test = base.extend<{ network: { contact: Record<string, unknown>[]; blocked: string[] } }>({
  network: [async ({ context, baseURL }, use) => {
    const network = { contact: [] as Record<string, unknown>[], blocked: [] as string[] };
    const origin = new URL(baseURL!).origin;
    await context.route('**/*', async route => {
      const req = route.request();
      expect(req.headers()).not.toHaveProperty('x-chaos-preset');
      const url = new URL(req.url());
      if (url.pathname.startsWith('/api/v1/')) {
        const path = url.pathname.slice('/api/v1'.length);
        if (path.includes('/chaos/')) { network.blocked.push(req.url()); return route.abort(); }
        if (req.method() === 'POST' && path === '/contact') {
          network.contact.push({ ...req.postDataJSON(), idempotencyKey: req.headers()['idempotency-key'] });
          return route.fulfill({ status: 202, json: { message: 'Accepted by isolated test', queue_status: 'queued', delivery_mode: 'stream', downstream: 'fake' } });
        }
        if (req.method() !== 'GET') { network.blocked.push(req.url()); return route.abort(); }
        const data: Record<string, unknown> = {
          '/about': load('about'), '/projects': { projects }, '/stack': { stack: load('stack'), by_category: {} },
          '/experiences': { experiences: load('experiences') }, '/formation': { formations: load('formation') },
          '/philosophy': { inspirations: load('philosophy') }, '/metrics/summary': current,
        };
        if (path.startsWith('/projects/')) {
          const id = path.split('/').pop();
          const project = projects.find((item: { id: string }) => item.id === id);
          return route.fulfill({ status: project ? 200 : 404, json: project ? { ...project, case_study: cases[id!] ?? null } : { error: { message: 'Not found' } } });
        }
        if (!(path in data)) { network.blocked.push(req.url()); return route.abort(); }
        return route.fulfill({ json: data[path] });
      }
      if (url.origin !== origin || !['GET', 'HEAD'].includes(req.method())) {
        network.blocked.push(req.url());
        return route.abort();
      }
      return route.continue();
    });
    await context.routeWebSocket('**/*', socket => {
      const url = new URL(socket.url());
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      if (url.origin === origin) socket.connectToServer();
      else socket.close();
    });
    await use(network);
    expect(network.blocked.filter(url => new URL(url).pathname.includes('/chaos/'))).toEqual([]);
  }, { auto: true }],
});
export { expect };
