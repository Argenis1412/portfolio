import { Copy, Check, Github, Linkedin } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAbout } from '../hooks/useApi';

export default function Footer() {
  const { t } = useLanguage();
  const { data: about } = useAbout();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const email = about?.email || 'argenisbackend@gmail.com';
  const phone = about?.phone || '(41) 9 9510-3364';
  const githubUrl = about?.github || 'https://github.com/Argenis1412';
  const linkedinUrl = about?.linkedin || 'https://www.linkedin.com/in/argenis1412/';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };



  return (
    <footer className="border-t border-app-border py-6">
      <div className="home-container flex flex-wrap items-center justify-between gap-4 text-sm text-app-muted">
        <p>{t('footer.rights')}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="https://github.com/Argenis1412/portfolio" target="_blank" rel="noopener noreferrer" className="py-2 hover:text-app-primary">{t('projects.source_code')}</a>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2 hover:text-app-primary"><Github aria-hidden="true" className="h-4 w-4" />GitHub</a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2 hover:text-app-primary"><Linkedin aria-hidden="true" className="h-4 w-4" />LinkedIn</a>
          <button onClick={handleCopyEmail} className="inline-flex items-center gap-2 py-2 hover:text-app-primary">
            {copiedEmail ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{t('footer.copy_email')}
          </button>
          <button onClick={handleCopyWhatsApp} className="inline-flex items-center gap-2 py-2 hover:text-app-primary">
            {copiedWhatsApp ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{t('footer.copy_phone')}
          </button>
          <span role="status" className="sr-only">{copiedEmail || copiedWhatsApp ? t('footer.copied') : ''}</span>
        </div>
      </div>
    </footer>
  );
}
