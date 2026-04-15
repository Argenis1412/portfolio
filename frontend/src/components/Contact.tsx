import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAbout, useContactMutation } from '../hooks/useApi';
import { ApiError } from '../api';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.041 3.712 1.585 5.703 1.585h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Contact() {
  const { t, language } = useLanguage();
  const { data: about } = useAbout();
  const { mutate, isPending: isMutating, isSuccess: mutationSuccess, error: mutationError } = useContactMutation();
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    assunto: '',
    mensagem: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [traceResult, setTraceResult] = useState<{ traceId?: string; durationMs: number } | null>(null);
  
  const getNewKey = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };
 
  const [idempotencyKey, setIdempotencyKey] = useState<string>(getNewKey);
 
  const generateNewKey = () => {
    setIdempotencyKey(getNewKey());
  };
 
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'name_required';
    if (!formData.email.trim()) {
      newErrors.email = 'email_required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'email_invalid';
    }
    if (!formData.mensagem.trim()) {
      newErrors.mensagem = 'message_required';
    } else if (formData.mensagem.length < 10) {
      newErrors.mensagem = 'message_too_short';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setErrors({});
    
    const dataToSend = {
      ...formData,
      assunto: formData.assunto.trim() || t('contact.subject_default') || 'Contato via Portfólio',
      website: (document.getElementById('hp_website') as HTMLInputElement)?.value || '',
      fax: (document.getElementById('hp_fax') as HTMLInputElement)?.value || ''
    };
    
    mutate(
      { data: dataToSend, idempotencyKey },
      {
        onSuccess: (result) => {
          setTraceResult(result);
          setFormData({ nome: '', email: '', assunto: '', mensagem: '' });
          generateNewKey();
          // We intentionally leave the form disabled and show the trace result
          // so the user can observe the engineering evidence.
        },
        onError: (error: unknown) => {
          setTraceResult(null);
          if (error instanceof ApiError) {
            if (error.status === 429) {
              setErrors({ submit: 'contact.error.rate_limit' });
            } else if (error.message.includes('DUPLICATE') || error.status === 409 || error.status === 400) {
              setErrors({ submit: 'contact.error.duplicate' });
            } else {
              setErrors({ submit: 'contact.error.generic' });
            }
          } else {
            setErrors({ submit: 'contact.error.generic' });
          }
          generateNewKey();
        }
      }
    );
  };

  const handleWhatsApp = () => {
    if (!about?.telefone) return;
    const cleanNumber = about.telefone.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = language === 'es' 
      ? '¡Hola Argenis! Vi tu portafolio y me gustaría hablar contigo.'
      : language === 'en'
      ? 'Hello Argenis! I saw your portfolio and would like to talk!'
      : 'Olá Argenis! Vi seu portfólio e gostaria de conversar!';
    window.open(
      `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const status = isMutating ? 'loading' : (mutationSuccess ? 'success' : (mutationError || errors.submit ? 'error' : 'idle'));

  return (
    <section id="contato" className="py-16 max-w-4xl mx-auto px-4 relative group overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-app-primary/5 dark:bg-app-primary/10 rounded-full blur-[120px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center text-app-text tracking-widest uppercase">
            {t('contact.title')}
        </h2>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-8 md:p-12 border border-app-border hover:border-app-primary/50 hover:shadow-[0_0_40px_rgba(212,163,115,0.15)] transition-all duration-500"
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
            <input type="text" name="website" id="hp_website" aria-label="Website" style={{ position: 'absolute', left: '-5000px' }} tabIndex={-1} autoComplete="off" />
            <input type="text" name="fax" id="hp_fax" aria-label="Fax" style={{ position: 'absolute', left: '-5000px' }} tabIndex={-1} autoComplete="off" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2.5">
                <label htmlFor="nome" className="text-xs font-bold text-app-muted uppercase tracking-widest ml-1">{t('contact.name')}</label>
                <input 
                  type="text" id="nome" name="nome" placeholder={t('contact.placeholder.name')}
                  value={formData.nome} onChange={handleChange}
                  className={`bg-app-surface/50 border ${errors.nome ? 'border-red-500/50 focus:ring-red-500/20' : 'border-app-border focus:ring-app-primary/50'} rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 text-app-text transition-all duration-300 placeholder:text-app-muted/30`}
                />
                <AnimatePresence>
                  {errors.nome && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {t(`contact.error.${errors.nome}`)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-2.5">
                <label htmlFor="email" className="text-xs font-bold text-app-muted uppercase tracking-widest ml-1">{t('contact.email')}</label>
                <input 
                  type="email" id="email" name="email" placeholder={t('contact.placeholder.email')}
                  value={formData.email} onChange={handleChange}
                  className={`bg-app-surface/50 border ${errors.email ? 'border-red-500/50 focus:ring-red-500/20' : 'border-app-border focus:ring-app-primary/50'} rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 text-app-text transition-all duration-300 placeholder:text-app-muted/30`}
                />
                <AnimatePresence>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {t(`contact.error.${errors.email}`)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="assunto" className="text-xs font-bold text-app-muted uppercase tracking-widest ml-1">{t('contact.subject')}</label>
              <input 
                type="text" id="assunto" name="assunto" placeholder={t('contact.placeholder.subject')}
                value={formData.assunto} onChange={handleChange}
                className={`bg-app-surface/50 border ${errors.assunto ? 'border-red-500/50 focus:ring-red-500/20' : 'border-app-border focus:ring-app-primary/50'} rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 text-app-text transition-all duration-300 placeholder:text-app-muted/30`}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="mensagem" className="text-xs font-bold text-app-muted uppercase tracking-widest ml-1">{t('contact.message')}</label>
              <textarea 
                id="mensagem" name="mensagem" rows={5} placeholder={t('contact.placeholder.message')}
                value={formData.mensagem} onChange={handleChange}
                className={`bg-app-surface/50 border ${errors.mensagem ? 'border-red-500/50 focus:ring-red-500/20' : 'border-app-border focus:ring-app-primary/50'} rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 text-app-text transition-all duration-300 placeholder:text-app-muted/30 resize-none`}
              ></textarea>
              <AnimatePresence>
                {errors.mensagem && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {t(`contact.error.${errors.mensagem}`)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {status === 'success' && traceResult && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0A0A0A] border rounded-xl overflow-hidden font-mono text-xs text-left shadow-inner flex flex-col" style={{ borderColor: '#333' }}>
                  <div className="flex items-center px-4 py-2 border-b" style={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}>
                    <div className="flex gap-1.5 mr-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-gray-400 font-semibold uppercase tracking-widest text-[10px]">Trace Console</span>
                  </div>
                  <div className="p-4 leading-relaxed text-gray-300">
                    <div>
                      <span className="text-emerald-400">[POST]</span> /api/v1/contact <span className="text-gray-500">→</span> <span className="text-emerald-400">200 OK</span> <span className="text-gray-500">({traceResult.durationMs}ms)</span>
                    </div>
                    {traceResult.traceId && (
                      <div className="mt-1">
                        <span className="text-blue-400">[TRACE]</span> {traceResult.traceId}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center text-sm font-semibold">
                  {errors.submit ? t(errors.submit) : t('contact.error.generic')}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <motion.button 
                whileHover={status !== 'success' ? { scale: 1.02 } : {}} whileTap={status !== 'success' ? { scale: 0.98 } : {}}
                type="submit" disabled={status === 'loading' || status === 'success'}
                className="bg-app-primary hover:bg-app-primary-hover text-app-primary-text font-bold py-[18px] px-8 rounded-xl transition-all duration-300 shadow-lg shadow-app-primary/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs flex items-center justify-center gap-3"
              >
                {status === 'loading' ? <Loader2 className="animate-spin h-4 w-4 text-app-primary-text" /> : <Mail className="w-4 h-4" />}
                {status === 'loading' ? t('contact.sending') : status === 'success' ? 'Delivered' : t('contact.send')}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="button" onClick={handleWhatsApp}
                className="bg-[#0A854D] hover:bg-[#075E54] text-white font-bold py-[18px] px-8 rounded-xl transition-all duration-300 shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
                {t('contact.whatsapp')}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </section>
  );
}
