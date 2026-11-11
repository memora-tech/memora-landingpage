/**
 * @file animations.js
 * @description Animações de entrada, reveal on scroll e microinterações com GSAP + ScrollTrigger.
 */

export function initAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof window.gsap === 'undefined') {
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // 1. Coreografia de entrada do Hero (orgânica e fluida estilo Antigravity)
  const heroTl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.1 } });
  heroTl
    .from('.hero-title', { y: 22, opacity: 0 }, 0.08)
    .from('.hero-subtitle', { y: 18, opacity: 0 }, 0.18)
    .from('.hero-ctas', { y: 14, opacity: 0 }, 0.28)
    .from('.hero-meta-note', { opacity: 0 }, 0.36)
    .from('.hero-showcase', { y: 28, opacity: 0, scale: 0.985, duration: 1.25 }, 0.32);

  if (!ScrollTrigger) return;

  // 2. Reveal nos cabeçalhos de seção
  gsap.utils.toArray('.section-header').forEach((header) => {
    gsap.from(header.children, {
      scrollTrigger: {
        trigger: header,
        start: 'top 86%',
        toggleActions: 'play none none none',
      },
      y: 24,
      opacity: 0,
      duration: 0.75,
      stagger: 0.1,
      ease: 'power3.out',
    });
  });

  // 3. Reveal escalonado (stagger) para grids de cards
  const staggerGroups = [
    '.problem-grid',
    '.steps-timeline',
    '.audience-grid',
    '.data-proof-grid',
    '.pricing-grid',
    '.trust-grid',
    '.partners-cycle',
  ];

  staggerGroups.forEach((selector) => {
    const container = document.querySelector(selector);
    if (!container) return;

    gsap.from(container.children, {
      scrollTrigger: {
        trigger: container,
        start: 'top 86%',
        toggleActions: 'play none none none',
      },
      y: 20,
      opacity: 0,
      duration: 0.65,
      stagger: 0.08,
      clearProps: 'transform',
      ease: 'power3.out',
    });
  });

  // 4. Destaque da Comunidade, Suite, Banner B2B e Liftoff CTA
  gsap.utils.toArray(['.suite-container', '.community-highlight-box', '.b2b-banner', '.liftoff-cta']).forEach((box) => {
    gsap.from(box, {
      scrollTrigger: {
        trigger: box,
        start: 'top 86%',
        toggleActions: 'play none none none',
      },
      y: 34,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.out',
    });
  });

  // 5. Efeito magnético sutil nos botões principais (Desktop)
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn--magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
          x: x * 0.16,
          y: y * 0.16,
          duration: 0.25,
          ease: 'power2.out',
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
        });
      });
    });
  }
}
