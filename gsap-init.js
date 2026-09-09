/**
 * ==============================================================================
 * GSAP ANIMATION ORCHESTRATOR — VN QR SCAN 2026
 * Premium motion design: page-load choreography, micro-interactions, transitions
 * ==============================================================================
 * NOTE: This file is purely visual. It does NOT modify any backend state,
 * form submissions, login logic, or functional behavior.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Safety check — if GSAP didn't load, bail silently
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger if available
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ── Page Load Choreography ──────────────────────────────────────────────
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.7 } });

  // Header entrance
  tl.fromTo('.top-header',
    { opacity: 0, y: -30 },
    { opacity: 1, y: 0, duration: 0.6 }
  );

  // Event switcher nav
  tl.fromTo('.event-switcher-nav',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5 },
    '-=0.35'
  );

  // Mode selector bar
  tl.fromTo('.mode-selector-bar',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5 },
    '-=0.3'
  );

  // Stats bar — stagger each card
  tl.fromTo('.stat-card',
    { opacity: 0, y: 25, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1 },
    '-=0.25'
  );

  // Scanner column
  tl.fromTo('.scanner-column',
    { opacity: 0, x: -30 },
    { opacity: 1, x: 0, duration: 0.6 },
    '-=0.3'
  );

  // Result column
  tl.fromTo('.result-column',
    { opacity: 0, x: 30 },
    { opacity: 1, x: 0, duration: 0.6 },
    '-=0.5'
  );

  // ── History Section — Scroll Trigger ────────────────────────────────────
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.fromTo('.history-section',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.history-section',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // ── Card Hover Micro-Interactions ───────────────────────────────────────
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { scale: 1.03, duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { scale: 1, duration: 0.3, ease: 'power2.out' });
    });
  });

  // ── Mode Button Press Effect ────────────────────────────────────────────
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      gsap.to(btn, { scale: 0.97, duration: 0.1 });
    });
    btn.addEventListener('mouseup', () => {
      gsap.to(btn, { scale: 1, duration: 0.2, ease: 'back.out(1.7)' });
    });
  });

  // ── Modal Open Animation Enhancement ────────────────────────────────────
  const observeModals = () => {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = modal.style.display !== 'none';
            if (isVisible) {
              const card = modal.querySelector('.modal-card, .coord-login-card');
              if (card) {
                gsap.fromTo(card,
                  { scale: 0.92, opacity: 0, y: 20 },
                  { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }
                );
              }
            }
          }
        });
      });
      observer.observe(modal, { attributes: true });
    });
  };
  observeModals();

  // ── Result Card Transition Helper ───────────────────────────────────────
  // Expose a global function that app.js can optionally call for result animations
  window.gsapAnimateResult = (element) => {
    if (!element) return;
    gsap.fromTo(element,
      { opacity: 0, y: 15, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }
    );
  };

  // ── Scanner Pulse Enhancement ───────────────────────────────────────────
  const scannerBox = document.querySelector('.scanner-box');
  if (scannerBox) {
    gsap.to(scannerBox, {
      boxShadow: '0 0 30px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  // ── Floating Background Orbs Animation ──────────────────────────────────
  document.querySelectorAll('.bg-orb').forEach((orb, i) => {
    gsap.to(orb, {
      x: `random(-40, 40)`,
      y: `random(-40, 40)`,
      duration: `random(6, 12)`,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.8
    });
  });

  // ── Button Ripple / Glow on Click ───────────────────────────────────────
  document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      gsap.fromTo(btn,
        { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.5)' },
        { boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)', duration: 0.5, ease: 'power2.out' }
      );
    });
  });
});
