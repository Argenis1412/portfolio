import { Mail, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAbout } from '../hooks/useApi';
import { useContactForm } from '../hooks/useContactForm';
import ContactCopyButtons from './ui/ContactCopyButtons';

export default function Contact() {
  const { t, language } = useLanguage();
  const { data: about } = useAbout();
  const {
    formData, errors, traceResult, idempotencyKey,
    status, submitError, responseStatusCode, responseTraceId,
    handleChange, handleSubmit
  } = useContactForm();

  const handleWhatsApp = () => {
    if (!about?.phone) return;
    const cleanNumber = about.phone.replace(/\D/g, '');
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

  return (
    <section id="contact" aria-labelledby="contact-title" className="home-container home-section">
      <div className="home-editorial-grid">
        <div>
          <h2 id="contact-title">{t('contact.title')}</h2>
          <p className="mt-4 leading-relaxed text-app-muted">{t('contact.subtitle')}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-app-primary">
            {about?.email && <a href={`mailto:${about.email}`} className="home-link">{t('contact.channel.email')}</a>}
            {about?.phone && <button type="button" onClick={handleWhatsApp} className="home-link">{t('contact.whatsapp')}</button>}
          </div>
          <ContactCopyButtons email={about?.email || 'argenisbackend@gmail.com'} phone={about?.phone || '(41) 9 9510-3364'} />
        </div>
        <form onSubmit={handleSubmit} noValidate className="min-w-0">
          <input type="text" name="website" id="hp_website" aria-label="Website" style={{ position: 'absolute', left: '-5000px' }} tabIndex={-1} autoComplete="off" />
          <input type="text" name="fax" id="hp_fax" aria-label="Fax" style={{ position: 'absolute', left: '-5000px' }} tabIndex={-1} autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            {(['name', 'email', 'subject', 'message'] as const).map((field) => {
              const error = field === 'subject' ? undefined : errors[field];
              const inputClass = 'min-h-11 w-full rounded-md border border-app-border bg-app-surface px-3 py-2.5 text-base text-app-text placeholder:text-app-muted focus:border-app-primary';
              const props = {
                id: field, name: field, value: formData[field], onChange: handleChange,
                placeholder: t(`contact.placeholder.${field}`),
                'aria-invalid': Boolean(error), 'aria-describedby': error ? `${field}-error` : undefined,
                required: field !== 'subject', className: inputClass,
              };
              return <div key={field} className={`flex flex-col gap-2 ${field === 'message' || field === 'subject' ? 'sm:col-span-2' : ''}`}>
                <label htmlFor={field} className="text-sm font-medium">{t(`contact.${field}`)}</label>
                {field === 'message' ? <textarea {...props} rows={4} /> : <input {...props} type={field === 'email' ? 'email' : 'text'} autoComplete={field === 'name' || field === 'email' ? field : undefined} />}
                {error && <p id={`${field}-error`} className="text-sm text-status-error">{t(`contact.error.${error}`)}</p>}
              </div>;
            })}
          </div>
          <button type="submit" disabled={status === 'loading'} className="home-button mt-5 disabled:opacity-50">
            {status === 'loading' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Mail aria-hidden="true" className="h-4 w-4" />}
            {status === 'loading' ? t('contact.sending') : t('contact.send')}
          </button>
          <div role="status" aria-live="polite" className="mt-3 text-sm">
            {status === 'success' && <p className="text-status-ok">{t('contact.console.delivered')}</p>}
            {status === 'error' && <p className="text-status-error">{submitError || t('contact.error.generic')} {responseStatusCode}</p>}
          </div>
          <details className="mt-3 text-sm text-app-muted">
            <summary className="home-link w-fit cursor-pointer">{t('contact.response_details')}</summary>
            <dl className="mt-2 space-y-2 break-all">
              <div><dt>{t('contact.spec.idempotency')}</dt><dd>{idempotencyKey}</dd></div>
              {responseStatusCode && <div><dt>{t('contact.console.response')}</dt><dd>{responseStatusCode}</dd></div>}
              {responseTraceId && <div><dt>{t('contact.console.trace')}</dt><dd>{responseTraceId}</dd></div>}
              {traceResult && <>
                <div><dt>{t('contact.console.response')}</dt><dd>{traceResult.durationMs}ms</dd></div>
                {traceResult.queueStatus && <div><dt>{t('contact.console.queue')}</dt><dd>{traceResult.queueStatus}</dd></div>}
                {traceResult.deliveryMode && <div><dt>{t('contact.console.mode')}</dt><dd>{traceResult.deliveryMode}</dd></div>}
                {traceResult.downstream && <div><dt>{t('contact.console.downstream')}</dt><dd>{traceResult.downstream}</dd></div>}
              </>}
            </dl>
          </details>
        </form>
      </div>
    </section>
  );
}
