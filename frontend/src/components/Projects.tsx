import { motion } from 'framer-motion';
import Skeleton from './ui/Skeleton';
import { Github, ExternalLink } from 'lucide-react';
import { useProjects } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';

export default function Projects() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const { language, t } = useLanguage();

  if (isLoading) {
    return (
      <section id="projects" className="py-16 max-w-6xl mx-auto px-4">
        <div className="h-10 w-48 bg-app-surface-hover rounded-md mx-auto mb-12 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-xl p-8 border border-app-border">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-6" />
              <div className="flex gap-2 mb-6">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex gap-4 pt-4 border-t border-app-border">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="projects" className="py-24 max-w-6xl mx-auto px-4 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-4">{t('error.generic')}</h2>
        <p>{(error as Error)?.message || 'Unknown error'}</p>
      </section>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <section id="projects" className="py-24 max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-8 text-app-text">{t('nav.projects')}</h2>
        <p className="text-app-muted">No projects found.</p>
      </section>
    );
  }


  return (
    <section id="projects" className="py-16 max-w-6xl mx-auto px-4 relative group overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-app-primary/5 dark:bg-app-primary/10 rounded-full blur-[120px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-12 text-center text-app-text tracking-widest">
            {t('nav.projects')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass rounded-xl p-6 md:p-8 hover:-translate-y-1 hover:border-app-primary hover:shadow-[0_0_30px_rgba(212,163,115,0.25)] transition-all duration-300 group relative overflow-hidden border border-app-border"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-app-primary opacity-0 group-hover:opacity-100 transition-smooth z-10"></div>
              
              {project.imagem && (
                <div className="mb-6 rounded-lg overflow-hidden border border-app-border h-48">
                  <img 
                    src={project.imagem} 
                    alt={project.nome} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                </div>
              )}
              <h3 className="text-2xl font-bold text-app-text mb-3">{project.nome}</h3>

              <p className="text-app-muted mb-6 leading-relaxed">
                {project.descricao_curta[language as keyof typeof project.descricao_curta]}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tecnologias.slice(0, 11).map(tech => (
                  <span key={tech} className="bg-app-primary/5 text-app-primary text-xs font-semibold px-3 py-1 rounded-full border border-app-primary/10">
                    {tech}
                  </span>
                ))}
                {project.tecnologias.length > 11 && (
                  <span className="bg-app-surface-hover text-app-muted text-xs font-medium px-3 py-1 rounded-full border border-app-border">
                    +{project.tecnologias.length - 11}
                  </span>
                )}
              </div>
              
              <div className="flex gap-4 mt-auto pt-4 border-t border-app-border">
                {project.repositorio && (
                  <a href={project.repositorio} target="_blank" rel="noopener noreferrer" className="flex-1 bg-app-surface border border-app-border text-slate-700 dark:text-slate-200 hover:border-app-primary hover:text-app-primary transition-colors flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
                    <Github className="w-5 h-5" />
                    Source Code
                  </a>
                )}
                {project.demo && (
                  <a href={project.demo} target="_blank" rel="noopener noreferrer" className="flex-1 bg-app-primary hover:bg-app-primary-hover text-white transition-colors flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold premium-shadow">
                    <ExternalLink className="w-5 h-5" />
                    Live Demo
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
