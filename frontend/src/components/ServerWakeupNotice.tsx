import { useState, useEffect } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';

export default function ServerWakeupNotice() {
  const isFetching = useIsFetching();
  const [showNotice, setShowNotice] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (isFetching === 0) return;

    const timeout = setTimeout(() => setShowNotice(true), 2500);
    
    return () => {
      clearTimeout(timeout);
      setShowNotice(false);
    };
  }, [isFetching]);

  if (isFetching === 0 || !showNotice) return null;

  const messages = {
    pt: "Despertando o servidor (plano gratuito). Por favor, aguarde alguns segundos... 🚀",
    en: "Waking up server (free tier). Please wait a few seconds... 🚀",
    es: "Despertando el servidor (plan gratuito). Por favor, espere unos segundos... 🚀"
  };

  const message = messages[language as keyof typeof messages] || messages.en;

  return (
    <div className="fixed bottom-6 right-6 bg-app-surface/95 backdrop-blur-md border border-app-primary/50 text-app-text p-4 rounded-xl shadow-[0_0_20px_rgba(212,163,115,0.2)] z-50 flex items-center gap-4 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="w-5 h-5 border-2 border-app-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
      <p className="text-sm font-medium leading-relaxed">{message}</p>
    </div>
  );
}
