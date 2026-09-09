/**
 * ==============================================================================
 * GSAP MICRO-INTERACTIONS & MOTION DESIGN — TECHNO SPLURGE 2026
 * Restrained, high-contrast event operations console motion
 * ==============================================================================
 * NOTE: Strictly visual layer. Does NOT interfere with camera access,
 * scanning intervals, verification routines, or data submission.
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;

  // 1. Subtle, crisp initial shell reveal (180ms - zero operational lag)
  gsap.fromTo(".ops-header", 
    { opacity: 0, y: -8 }, 
    { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
  );

  gsap.fromTo(".ops-nav-toolbar, .metrics-summary-strip", 
    { opacity: 0, y: 6 }, 
    { opacity: 1, y: 0, duration: 0.28, ease: "power2.out", delay: 0.05 }
  );

  gsap.fromTo(".ops-main-content", 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.3, ease: "power1.out", delay: 0.1 }
  );

  // 2. High-performance button click feedback
  const interactiveSelectors = ".btn-ops-control, .btn-action-next, .ops-tab-btn, .chip-btn, .btn-header-action";
  document.querySelectorAll(interactiveSelectors).forEach(btn => {
    btn.addEventListener("mousedown", () => {
      gsap.to(btn, { scale: 0.97, duration: 0.08, ease: "power1.out" });
    });
    btn.addEventListener("mouseup", () => {
      gsap.to(btn, { scale: 1, duration: 0.12, ease: "power1.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { scale: 1, duration: 0.12, ease: "power1.out" });
    });
  });

  // 3. Modal Entrance Animation Enhancement
  const observeModals = () => {
    const modals = document.querySelectorAll(".modal-backdrop");
    modals.forEach(modal => {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === "attributes" && mutation.attributeName === "style") {
            const isVisible = modal.style.display === "flex" || modal.style.display === "block";
            if (isVisible) {
              const box = modal.querySelector(".modal-box");
              if (box) {
                gsap.fromTo(box,
                  { scale: 0.94, opacity: 0, y: 12 },
                  { scale: 1, opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }
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

  // 4. Global helper for result card state presentation
  window.gsapAnimateResult = (element) => {
    if (!element || typeof gsap === "undefined") return;
    gsap.fromTo(element,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
    );
  };
});
