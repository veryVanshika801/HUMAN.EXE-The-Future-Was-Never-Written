import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUp, Compass, Layers } from 'lucide-react';
import { ChapterId } from '../types/archive';

gsap.registerPlugin(ScrollTrigger);

interface CreditsSectionProps {
  reducedMotion: boolean;
  onNavigateChapter: (id: ChapterId) => void;
  onOpenMemoryMap: () => void;
  onOpenCollection: () => void;
}

export const CreditsSection: React.FC<CreditsSectionProps> = ({
  reducedMotion,
  onNavigateChapter,
  onOpenMemoryMap,
  onOpenCollection,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reducedMotion) return;

    const ctx = gsap.context(() => {
      const items = el.querySelectorAll('.credits-reveal');
      gsap.fromTo(
        items,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 68%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="credits"
      aria-labelledby="credits-heading"
      className="no-print relative min-h-screen py-28 sm:py-36 px-4 sm:px-10 lg:px-16 z-10 flex items-center justify-center pointer-events-none"
    >
      <div className="w-full max-w-2xl bg-[#090B0D]/88 border border-white/12 rounded-xl p-8 sm:p-14 text-center pointer-events-auto">
        <div className="credits-reveal text-xs font-mono-archival tracking-[0.22em] uppercase text-[#899398]">
          Archive Epilogue · Colophon
        </div>

        <h2
          id="credits-heading"
          className="credits-reveal font-display text-4xl sm:text-5xl font-semibold tracking-[0.12em] text-[#F0F2F2] mt-4"
        >
          HUMAN.EXE
        </h2>

        <p className="credits-reveal font-mono-archival text-xs sm:text-sm tracking-[0.24em] text-[#A6C7A9] mt-2">
          THE FUTURE WAS NEVER WRITTEN.
        </p>

        <div className="credits-reveal my-8 h-px w-28 mx-auto bg-white/15" aria-hidden="true" />

        <div className="credits-reveal space-y-1.5">
          <div className="text-xs font-mono-archival uppercase tracking-[0.16em] text-[#899398]">
            Conceptualized &amp; Created by:
          </div>
          <div className="font-display text-2xl sm:text-3xl font-medium text-[#F0F2F2] tracking-wide">
            Vanshika &amp; Siddhika
          </div>
        </div>

        <p className="credits-reveal mt-8 text-xs font-mono-archival text-[#899398]">
          © 2026 HUMAN.EXE. All rights reserved.
        </p>

        <div className="credits-reveal mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateChapter('intro')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#F0F2F2] hover:bg-[#A6C7A9] text-[#090B0D] rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Top</span>
          </button>

          <button
            type="button"
            onClick={onOpenMemoryMap}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#111619] border border-white/15 hover:border-white/40 text-[#F0F2F2] rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 text-[#A6C7A9]" aria-hidden="true" />
            <span>Memory Constellation</span>
          </button>

          <button
            type="button"
            onClick={onOpenCollection}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#111619] border border-white/15 hover:border-white/40 text-[#BFC7CB] rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Search Archive</span>
          </button>
        </div>
      </div>
    </section>
  );
};
