import { useLanguage } from '../context/LanguageContext';

type HiringSectionName = 'proof' | 'principles';

export default function HiringSections({ section }: { section: HiringSectionName }) {
  const { t } = useLanguage();
  return <section className="mx-auto max-w-6xl px-4 py-16">
    <p className="text-xs font-mono uppercase tracking-[0.22em] text-app-primary">{t(`home.${section}.eyebrow`)}</p>
    <h2 className="mt-3 text-3xl text-app-text md:text-4xl">{t(`home.${section}.title`)}</h2>
    <p className="mt-4 max-w-3xl text-app-muted">{t(`home.${section}.body`)}</p>
  </section>;
}
