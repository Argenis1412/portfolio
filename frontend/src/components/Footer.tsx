import { Github, Linkedin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAbout } from '../hooks/useApi';
import ContactCopyButtons from './ui/ContactCopyButtons';

export default function Footer({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const { data: about } = useAbout();
  const email = about?.email || 'argenisbackend@gmail.com';
  const phone = about?.phone || '(41) 9 9510-3364';
  const githubUrl = about?.github || 'https://github.com/Argenis1412';
  const linkedinUrl = about?.linkedin || 'https://www.linkedin.com/in/argenis1412/';

  return (
    <footer className="border-t border-app-border py-6">
      <div className="home-container flex flex-wrap items-center justify-between gap-4 text-sm text-app-muted">
        <p>{t('footer.rights')}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {!compact && <a href="https://github.com/Argenis1412/portfolio" target="_blank" rel="noopener noreferrer" className="py-2 hover:text-app-primary">{t('projects.source_code')}</a>}
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2 hover:text-app-primary"><Github aria-hidden="true" className="h-4 w-4" />GitHub</a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2 hover:text-app-primary"><Linkedin aria-hidden="true" className="h-4 w-4" />LinkedIn</a>
          {!compact && <ContactCopyButtons email={email} phone={phone} />}
        </div>
      </div>
    </footer>
  );
}
