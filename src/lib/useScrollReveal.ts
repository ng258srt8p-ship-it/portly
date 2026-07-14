'use client';

/* ============================================================
   TRIPTIDE — useScrollReveal Hook
   
   IntersectionObserver-based scroll-triggered animation system.
   Adds 'is-visible' class when elements enter the viewport.
   
   Usage:
     const ref = useScrollReveal({ threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
     <div ref={ref} className="scroll-reveal">...</div>
   
   Options:
   - threshold: Visibility fraction to trigger (default 0.15)
   - rootMargin: Margin around root (default '0px 0px -50px 0px')
   - once: Only trigger once (default true)
   - staggerChildren: Add stagger-children class to parent (default false)
   ============================================================ */

import { useEffect, useRef, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  staggerChildren?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    staggerChildren = false,
  } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If staggerChildren is enabled, add the class immediately
    if (staggerChildren) {
      element.classList.add('stagger-children');
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          element.classList.add('is-visible');

          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
          element.classList.remove('is-visible');
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, once, staggerChildren]);

  return { ref, isVisible };
}

export default useScrollReveal;