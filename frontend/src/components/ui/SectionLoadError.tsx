import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function SectionLoadError() {
  const { t } = useLanguage();

  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-12 px-4 text-center">
      <p className="text-app-muted text-sm max-w-sm leading-relaxed">
        {t('section.load_error')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-app-primary/10 border border-app-primary/30 text-app-primary text-sm font-medium hover:bg-app-primary/20 transition-colors"
      >
        <RefreshCw aria-hidden="true" className="w-4 h-4" />
        {t('section.reload')}
      </button>
    </div>
  );
}
