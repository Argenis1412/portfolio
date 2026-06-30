import { useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  className?: string;
}

const CHAR_DELAY_MS = 15;
const MAX_CASCADE_CHARS = 8;

export default function TypewriterText({ text, className = '' }: TypewriterTextProps) {
  const prefersReducedMotion = useReducedMotion();

  const chars = useMemo(() =>
    text.split('').map((char, i) => ({
      char,
      key: `${text}-${i}`,
      delay: i < MAX_CASCADE_CHARS ? i * (CHAR_DELAY_MS / 1000) : MAX_CASCADE_CHARS * (CHAR_DELAY_MS / 1000),
    })),
    [text],
  );

  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-flex ${className}`} aria-label={text}>
      <AnimatePresence mode="popLayout">
        {chars.map(({ char, key, delay }) => (
          <m.span
            key={key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, delay }}
            style={{ display: 'inline-block', willChange: 'transform, opacity' }}
          >
            {char === ' ' ? ' ' : char}
          </m.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
