import { motion } from 'framer-motion';
import { useSkills } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import { ServerWakeupError } from './ServerWakeupNotice';

export default function Skills() {
  const { data: skills = [], isLoading, isError } = useSkills();
  const { t } = useLanguage();

  if (isLoading) return null; // Or a skeleton if we had one for skills

  if (isError) {
    return (
      <section id="stack" className="py-16 bg-transparent section-alt">
        <ServerWakeupError />
      </section>
    );
  }

  const categories = Array.from(new Set(skills.map(s => s.categoria)));



  return (
    <section id="stack" className="py-16 bg-transparent section-alt transition-colors duration-300 relative group overflow-hidden">
      {/* Dynamic hover glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-app-primary/5 dark:bg-app-primary/10 rounded-full blur-[120px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="max-w-6xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-12 text-center text-app-text tracking-widest">
            {t('nav.stack')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, idx) => (
              <motion.div 
                key={category}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass rounded-xl p-6 border border-app-border hover:border-app-primary hover:shadow-[0_0_20px_rgba(212,163,115,0.2)] transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-app-primary mb-5 capitalize tracking-widest">
                  {t(`stack.category.${category}`)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.filter(s => s.categoria === category).map(skill => (
                    <span
                      key={skill.nome}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-app-primary/5 text-app-primary border border-app-primary/20 hover:bg-app-primary/10 transition-colors duration-200"
                    >
                      {skill.nome}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
