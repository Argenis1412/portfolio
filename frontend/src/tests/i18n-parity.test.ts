import { describe, it, expect } from 'vitest';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import pt from '../i18n/pt.json';

const languages = { en, es, pt } as Record<string, Record<string, string>>;

function missingKeys(
  reference: string[],
  target: Record<string, string>,
): string[] {
  return reference.filter((k) => !(k in target));
}

describe('i18n parity', () => {
  const enKeys = Object.keys(en);
  const allLangs = Object.entries(languages);

  it('all languages have the same number of keys', () => {
    for (const [lang, dict] of allLangs) {
      expect(Object.keys(dict).length, `${lang} key count`).toBe(
        enKeys.length,
      );
    }
  });

  it.each(['es', 'pt'] as const)(
    '%s contains every key from en',
    (lang) => {
      const missing = missingKeys(enKeys, languages[lang]);
      expect(missing, `keys missing in ${lang}`).toEqual([]);
    },
  );

  it.each(['es', 'pt'] as const)(
    '%s has no extra keys absent from en',
    (lang) => {
      const extra = missingKeys(Object.keys(languages[lang]), en);
      expect(extra, `extra keys in ${lang}`).toEqual([]);
    },
  );
});
