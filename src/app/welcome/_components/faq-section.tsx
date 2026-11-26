'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/ui/motion-primitives';
import { cn } from '@/lib/utils';
import { LANDING_FAQS } from './industry-data';

interface FaqSectionProps {
  isDark: boolean;
}

export function FaqSection({ isDark }: FaqSectionProps) {
  const [openId, setOpenId] = useState<string>(LANDING_FAQS[0].id);

  return (
    <section
      id="faq"
      className={cn(
        'scroll-mt-20 py-14 px-4 sm:px-8 border-t transition-colors duration-300',
        isDark ? 'border-white/[0.08] bg-[#0B0D13]/50' : 'border-slate-200/70 bg-white/45'
      )}
    >
      <div className="max-w-4xl mx-auto space-y-7">
        <Reveal>
          <div className="text-center space-y-2">
            <span
              className={cn(
                'text-[11px] uppercase tracking-[0.16em] font-semibold inline-flex items-center gap-1.5',
                isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Preguntas Frecuentes en Chile
            </span>
            <h2
              className={cn(
                'text-2xl sm:text-3xl font-semibold tracking-tight',
                isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
              )}
            >
              Respuestas claras antes de{' '}
              <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                decidir
              </span>
            </h2>
          </div>
        </Reveal>

        <div className="space-y-3">
          {LANDING_FAQS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-2xl border transition-colors',
                  isDark
                    ? isOpen
                      ? 'obsidian-glass-luxury border-[#D8C39E]/35'
                      : 'obsidian-glass border-white/10'
                    : isOpen
                    ? 'glass-luxury border-[#8C7148]/35'
                    : 'glass-card border-slate-200/80'
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() => setOpenId(isOpen ? '' : item.id)}
                  className={cn(
                    'w-full text-left px-5 py-4 flex items-center justify-between gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-900'
                  )}
                >
                  <span className="text-sm sm:text-base font-semibold leading-snug">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180',
                      isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                    )}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${item.id}`}
                    className={cn(
                      'px-5 pb-4 pt-1 text-xs sm:text-sm leading-relaxed border-t',
                      isDark ? 'border-white/8 text-[#A3AFC2]' : 'border-slate-200/70 text-slate-600'
                    )}
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
