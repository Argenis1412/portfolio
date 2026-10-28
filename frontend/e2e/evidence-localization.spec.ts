import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const cases = JSON.parse(readFileSync(new URL('../../backend/data/project_case_studies.json', import.meta.url), 'utf8'));
const snapshot = readFileSync(new URL('../../backend/tests/snapshots/content.json', import.meta.url), 'utf8');
const languages = [
  { id: 'en', heading: 'Evidence', classifications: ['SOURCE-BACKED', 'REPRODUCED', 'SYNTHETIC'] },
  { id: 'pt', heading: 'Evidências', classifications: ['COM FONTE', 'REPRODUZIDA', 'SINTÉTICA'] },
  { id: 'es', heading: 'Evidencia', classifications: ['CON FUENTE', 'REPRODUCIDA', 'SINTÉTICA'] },
] as const;

for (const projectId of ['portfolio-api', 'loja-app', 'patchforge']) {
  test(`updates all evidence when switching languages for ${projectId}`, async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem('portfolio_lang', 'en'));
    await page.goto(`/projects/${projectId}`);

    for (const language of [...languages, languages[0]]) {
      await page.getByRole('combobox').selectOption(language.id);
      const evidence = page.getByRole('region', { name: language.heading, exact: true });
      await expect(evidence).toBeVisible();
      for (const item of cases[projectId].evidence) {
        const statement = evidence.getByText(item.localized_value[language.id], { exact: true });
        const card = statement.locator('..');
        await expect(statement).toBeVisible();
        await expect(card.getByText(`${item.label[language.id]} ${language.classifications[0]}`, { exact: true })).toBeVisible();
        await expect(card.getByText(item.source, { exact: false })).toBeVisible();
        if (language.id !== 'en') {
          await expect(evidence.getByText(item.value, { exact: true })).toHaveCount(0);
        }
      }
      await expect(evidence.locator('span')).toHaveText(cases[projectId].evidence.map(() => language.classifications[0]));
      await expect(page.locator('html')).toHaveAttribute('lang', language.id);
      await evidence.screenshot({ path: testInfo.outputPath(`evidence-${language.id}.png`) });
    }
  });
}

for (const localization of ['absent', 'null']) {
  test(`renders older evidence with ${localization} localization and translates classification codes`, async ({ page }) => {
    await page.route('**/api/v1/projects', async route => {
      const body = JSON.parse(snapshot).projects;
      const evidence = body.projects.find((project: { id: string }) => project.id === 'portfolio-api').case_study.evidence;
      for (const [index, item] of evidence.entries()) {
        if (localization === 'null') item.localized_value = null;
        else delete item.localized_value;
        item.classification = ['REAL', 'REPRODUCED', 'SYNTHETIC'][index];
      }
      await route.fulfill({ json: body });
    });
    await page.goto('/projects/portfolio-api');

    for (const language of languages) {
      await page.getByRole('combobox').selectOption(language.id);
      const evidence = page.getByRole('region', { name: language.heading, exact: true });
      await expect(evidence.locator('span')).toHaveText([...language.classifications]);
      for (const item of cases['portfolio-api'].evidence) {
        await expect(evidence.getByText(item.value, { exact: true })).toBeVisible();
      }
    }
  });
}
