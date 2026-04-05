import { motion, AnimatePresence } from 'framer-motion';
import { Github, Linkedin, Code2, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAbout } from '../hooks/useApi';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.712 1.585 5.703 1.585h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Footer() {
  const { t } = useLanguage();
  const { data: about } = useAbout();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    const email = about?.email || 'argenislopez28708256@gmail.com';
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = about?.telefone || '(41) 9 9510-3364';
    navigator.clipboard.writeText(phone);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  const githubUrl = about?.github || "https://github.com/Argenis1412";
  const linkedinUrl = about?.linkedin || "https://www.linkedin.com/in/argenis1412/";

  return (
    <footer className="w-full bg-transparent border-t border-app-border py-12 mt-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 text-center">
        
        {/* Contact Badges - Highly valued by recruiters */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-10">
          
          {/* Email Copy Badge */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyEmail}
            className="group flex items-center gap-3 px-5 py-2.5 bg-app-surface border border-app-border rounded-2xl hover:border-app-primary transition-all duration-300 shadow-sm relative overflow-hidden w-full max-w-[320px] md:w-auto"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-app-primary/10 text-app-primary group-hover:bg-app-primary group-hover:text-white transition-colors duration-300 flex-shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-app-muted font-bold leading-none mb-1">Email</p>
              <p className="text-xs font-semibold text-app-text truncate">{about?.email || 'argenislopez28708256@gmail.com'}</p>
            </div>
            <div className="ml-2 pl-3 border-l border-app-border flex items-center justify-center flex-shrink-0">
              <AnimatePresence mode="wait">
                {copiedEmail ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Copy className="w-4 h-4 text-app-muted group-hover:text-app-primary transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

          {/* WhatsApp Copy Badge */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyWhatsApp}
            className="group flex items-center gap-3 px-5 py-2.5 bg-app-surface border border-app-border rounded-2xl hover:border-[#25D366] transition-all duration-300 shadow-sm relative overflow-hidden w-full max-w-[320px] md:w-auto"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors duration-300 flex-shrink-0">
              <WhatsAppIcon className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-app-muted font-bold leading-none mb-1">WhatsApp</p>
              <p className="text-xs font-semibold text-app-text truncate">{about?.telefone || '(41) 9 9510-3364'}</p>
            </div>
            <div className="ml-2 pl-3 border-l border-app-border flex items-center justify-center flex-shrink-0">
              <AnimatePresence mode="wait">
                {copiedWhatsApp ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Check className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Copy className="w-4 h-4 text-app-muted group-hover:text-[#25D366] transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        </div>

        <div className="flex items-center justify-center space-x-6 mb-8">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-app-muted hover:text-app-primary transition-colors">
            <span className="sr-only">GitHub</span>
            <Github className="h-6 w-6" />
          </a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-app-muted hover:text-app-primary transition-colors">
            <span className="sr-only">LinkedIn</span>
            <Linkedin className="h-6 w-6" />
          </a>
          <a href="https://github.com/Argenis1412/portfolio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-app-muted hover:text-app-primary transition-colors px-4 py-1.5 bg-app-surface-hover rounded-full text-[10px] font-bold uppercase tracking-widest border border-app-border">
            <Code2 className="w-3 h-3" />
            <span>Source Code</span>
          </a>
        </div>
        
        <p className="text-xs text-app-muted font-medium tracking-wide">
          {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
