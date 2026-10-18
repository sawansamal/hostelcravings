/* ============================================
   HOSTEL CRAVINGS — Premium JS
   ============================================ */

"use strict";

/* ─── PAGE LOADER ──────────────────────────── */
window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = document.getElementById("page-loader");
    if (loader) loader.classList.add("done");
  }, 1600);
});

/* ─── NAVBAR SCROLL ────────────────────────── */
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 60) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
}, { passive: true });

/* ─── MOBILE MENU ──────────────────────────── */
const hamburger = document.querySelector(".nav-hamburger");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileClose = document.querySelector(".mobile-menu-close");
const mobileLinks = document.querySelectorAll(".mobile-menu a");

function openMenu() {
  hamburger.classList.add("active");
  mobileMenu.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeMenu() {
  hamburger.classList.remove("active");
  mobileMenu.classList.remove("open");
  document.body.style.overflow = "";
}

if (hamburger) hamburger.addEventListener("click", openMenu);
if (mobileClose) mobileClose.addEventListener("click", closeMenu);
mobileLinks.forEach(link => link.addEventListener("click", closeMenu));

/* ─── HERO PARALLAX ────────────────────────── */
const heroBgImg = document.querySelector(".hero-bg img");
window.addEventListener("scroll", () => {
  if (!heroBgImg) return;
  const scrollY = window.scrollY;
  heroBgImg.style.transform = `scale(1.05) translateY(${scrollY * 0.12}px)`;
}, { passive: true });

/* ─── PARTICLES ────────────────────────────── */
function createParticles() {
  const container = document.querySelector(".hero-particles");
  if (!container) return;
  const colors = ["rgba(201,168,76,0.6)", "rgba(232,199,110,0.4)", "rgba(255,200,80,0.3)"];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 5 + 2;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 12 + 10}s;
      animation-delay: ${Math.random() * -15}s;
    `;
    container.appendChild(p);
  }
}
createParticles();

/* ─── SCROLL REVEAL ────────────────────────── */
function initReveal() {
  const revealEls = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
  revealEls.forEach(el => el.classList.add("hidden"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("hidden");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  revealEls.forEach(el => observer.observe(el));
}
initReveal();

/* ─── STAGGER REVEAL ───────────────────────── */
function initStaggerReveal() {
  const grids = document.querySelectorAll(".features-grid, .products-grid, .about-highlights");
  grids.forEach(grid => {
    const children = grid.children;
    Array.from(children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.1}s`;
    });
  });
}
initStaggerReveal();

/* ─── FAQ ACCORDION ────────────────────────── */
const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach(item => {
  const question = item.querySelector(".faq-question");
  question.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    faqItems.forEach(i => i.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});

/* ─── PRODUCT TABS ─────────────────────────── */
const tabBtns = document.querySelectorAll(".tab-btn");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    // Query dynamically so live loaded products are filtered properly
    document.querySelectorAll(".product-card").forEach(card => {
      if (filter === "all" || card.dataset.category === filter) {
        card.style.display = "";
        card.style.animation = "none";
        card.offsetHeight; // reflow
        card.style.animation = "";
      } else {
        card.style.display = "none";
      }
    });
  });
});



/* ─── TOAST NOTIFICATION ───────────────────── */
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 32px; right: 32px;
    background: rgba(201,168,76,0.95); color: #0a0a0f;
    padding: 12px 24px; border-radius: 40px;
    font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 9999; transform: translateY(20px); opacity: 0;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; }, 10);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(20px)"; setTimeout(() => toast.remove(), 350); }, 2800);
}

/* ─── GSAP ANIMATIONS ──────────────────────── */
if (typeof gsap !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Hero timeline
  const heroTl = gsap.timeline({ delay: 1.7 });
  heroTl
    .from(".hero-badge",     { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" })
    .from(".hero-headline",  { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.3")
    .from(".hero-sub",       { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
    .from(".hero-actions",   { y: 20, opacity: 0, duration: 0.5, ease: "power3.out" }, "-=0.3")
    .from(".hero-stats",     { y: 20, opacity: 0, duration: 0.5, ease: "power3.out" }, "-=0.2")
    .from(".hero-scroll-hint", { opacity: 0, duration: 0.4 }, "-=0.1");

  // Section titles
  gsap.utils.toArray(".section-title").forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
      y: 30, opacity: 0, duration: 0.7, ease: "power3.out"
    });
  });

  // Feature cards stagger
  gsap.from(".feature-card", {
    scrollTrigger: { trigger: ".features-grid", start: "top 80%" },
    y: 50, opacity: 0, duration: 0.6, stagger: 0.12, ease: "power3.out"
  });

  // Product cards stagger (safe with dynamic loading)
  gsap.fromTo(".product-card", 
    { opacity: 0, y: 30 },
    {
      scrollTrigger: { trigger: ".products-grid", start: "top 85%" },
      opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out",
      clearProps: "opacity,transform"
    }
  );

  // About image
  gsap.from(".about-img-main", {
    scrollTrigger: { trigger: ".about-inner", start: "top 75%" },
    x: -60, opacity: 0, duration: 0.9, ease: "power3.out"
  });

  gsap.from(".about-content", {
    scrollTrigger: { trigger: ".about-inner", start: "top 75%" },
    x: 60, opacity: 0, duration: 0.9, ease: "power3.out"
  });

  // Stats counter
  document.querySelectorAll(".hero-stat-number").forEach(el => {
    const target = parseInt(el.dataset.count || el.textContent);
    if (isNaN(target)) return;
    gsap.from(el, {
      textContent: 0,
      duration: 2,
      delay: 2.2,
      ease: "power2.out",
      snap: { textContent: 1 },
      onUpdate: function () {
        el.textContent = Math.ceil(el.textContent) + (el.dataset.suffix || "");
      }
    });
  });

} else {
  // CSS-only fallback — hero items visible by default
  document.querySelectorAll(".hero-badge, .hero-headline, .hero-sub, .hero-actions, .hero-stats").forEach(el => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

/* ─── SMOOTH ANCHOR SCROLL ─────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href === "#") return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

/* ─── LAZY LOAD IMAGES ─────────────────────── */
if ("IntersectionObserver" in window) {
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
        imgObserver.unobserve(img);
      }
    });
  }, { rootMargin: "200px" });
  document.querySelectorAll("img[data-src]").forEach(img => imgObserver.observe(img));
}

/* ─── CURSOR GLOW (desktop only) ──────────── */
if (window.matchMedia("(pointer: fine)").matches) {
  const glow = document.createElement("div");
  glow.style.cssText = `
    position: fixed; width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
    border-radius: 50%; pointer-events: none; z-index: 0;
    transform: translate(-50%, -50%);
    transition: left 0.4s ease, top 0.4s ease;
  `;
  document.body.appendChild(glow);
  document.addEventListener("mousemove", e => {
    glow.style.left = e.clientX + "px";
    glow.style.top  = e.clientY + "px";
  });
}

/* ============================================
   AUTH SYSTEM — Login / Logout / Cart / Modals
   ============================================ */
