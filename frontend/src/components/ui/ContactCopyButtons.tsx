import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function ContactCopyButtons({ email, phone }: { email: string; phone: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null);

  const copy = async (channel: 'email' | 'phone') => {
    await navigator.clipboard.writeText(channel === 'email' ? email : phone);
    setCopied(channel);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-app-muted">
      {(['email', 'phone'] as const).map(channel => (
        <button key={channel} type="button" onClick={() => void copy(channel)} aria-label={t(`footer.copy_${channel}`)} title={t(`footer.copy_${channel}`)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 py-2 hover:text-app-primary">
          {copied === channel ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          {t(`footer.copy_${channel}`)}
        </button>
      ))}
      <span role="status" className="sr-only">{copied ? t('footer.copied') : ''}</span>
    </div>
  );
}
