'use client';

import './landing.css';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import background from '../../public/start image.png';

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  AnimatePresence
} from 'framer-motion';
import {
  Truck,
  Fuel,
  FileText,
  Users,
  Wrench,
  TrendingUp,
  CheckCircle,
  ArrowUpRight,
  Shield,
  Clock,
  Menu,
  X,
  Globe
} from 'lucide-react';

// ─────────────────────────────────────────────
// Translation system
// ─────────────────────────────────────────────
type Lang = 'fr' | 'en';

const translations = {
  fr: {
    login: 'Se connecter',
    createAccount: 'Créer un compte',
    heroLine1: 'Chaque camion.',
    heroLine2: 'Chaque trajet.',
    heroLine3: 'Une seule route.',
    heroSub: 'Pilotez votre entreprise de transport avec l\'ERP moderne FleetVision. Contrôlez vos flottes, dépenses, chauffeurs et ravitaillements en temps réel.',
    stat1Label: 'Traçabilité totale',
    stat2Label: 'Modules intégrés',
    stat3Label: 'Accès temps réel',
    stat4Label: 'Rentabilité accrue',
    moduleSectionTag: 'Le Parcours',
    moduleSectionTitle: 'Une suite de modules unifiée',
    moduleSectionSub: 'Suivez la route de la rentabilité. FleetVision connecte chaque facette de vos opérations de logistique.',
    mod1Km: 'KM 10',
    mod1Title: 'Gestion de Flotte',
    mod1Desc: 'Optimisez la rentabilité globale de votre parc. Suivez vos camions, contrôlez les kilométrages et supervisez vos remorques en temps réel.',
    mod2Km: 'KM 25',
    mod2Title: 'Suivi du Carburant',
    mod2Desc: 'Enregistrez vos bons de carburant, surveillez les consommations moyennes (L/100 km) et maîtrisez l\'un des postes de dépenses majeurs de votre activité.',
    mod3Km: 'KM 50',
    mod3Title: 'Bons de Livraison',
    mod3Desc: 'Éditez des documents clairs et conformes pour chaque trajet. Facilitez les échanges avec vos clients tout en accélérant votre cycle de facturation.',
    mod4Km: 'KM 75',
    mod4Title: 'Suivi des Chauffeurs',
    mod4Desc: 'Gérez les affectations, mesurez l\'efficacité et la consommation moyenne de vos conducteurs pour une gestion humaine rationalisée.',
    mod5Km: 'KM 100',
    mod5Title: 'Réparations & Vidanges',
    mod5Desc: 'Planifiez les entretiens techniques périodiques de vos véhicules pour éviter les immobilisations coûteuses et prolonger la durée de vie du matériel.',
    mod6Km: 'KM 150',
    mod6Title: 'Contrôle des Charges',
    mod6Desc: 'Maîtrisez vos charges fixes (assurance, CNSS, taxes) et variables pour identifier immédiatement la marge nette dégagée par camion.',
    dashTag: 'Décisions Stratégiques',
    dashTitle: 'Gagnez en visibilité sur vos marges',
    dashSub: 'Notre console d\'analyse compile automatiquement les coûts opérationnels pour chaque trajet, vous indiquant en temps réel quel camion génère le plus de bénéfices.',
    dashItem1: 'Calcul automatique de la consommation moyenne',
    dashItem2: 'Calcul de la marge brute par camion et remorque',
    dashItem3: 'Alerte automatique avant échéance technique / vidange',
    dashItem4: 'Téléchargement d\'historiques d\'entretien au format PDF',
    dashCardTitle: 'Analyse des Flottes',
    dashCardSub: 'Marge nette globale par camion',
    dashCardLive: 'Live',
    dashCardSecure: 'Données sécurisées',
    dashCardUpdated: 'Mise à jour il y a 2m',
    ctaTitle: 'Prêt à transformer vos opérations ?',
    ctaSub: 'Rejoignez les professionnels du transport logistique qui automatisent la gestion de leurs parcs grâce à notre plateforme unifiée FleetVision.',
    footerRights: 'Tous droits réservés.',
  },
  en: {
    login: 'Sign in',
    createAccount: 'Create account',
    heroLine1: 'Every truck.',
    heroLine2: 'Every trip.',
    heroLine3: 'One single road.',
    heroSub: 'Run your transport company with FleetVision, the modern ERP. Control your fleets, expenses, drivers and refueling in real time.',
    stat1Label: 'Full traceability',
    stat2Label: 'Integrated modules',
    stat3Label: 'Real-time access',
    stat4Label: 'Increased profitability',
    moduleSectionTag: 'The Journey',
    moduleSectionTitle: 'A unified module suite',
    moduleSectionSub: 'Follow the road to profitability. FleetVision connects every facet of your logistics operations.',
    mod1Km: 'KM 10',
    mod1Title: 'Fleet Management',
    mod1Desc: 'Optimize the overall profitability of your fleet. Track your trucks, monitor mileage and supervise your trailers in real time.',
    mod2Km: 'KM 25',
    mod2Title: 'Fuel Tracking',
    mod2Desc: 'Record your fuel vouchers, monitor average consumption (L/100 km) and control one of the major cost items of your business.',
    mod3Km: 'KM 50',
    mod3Title: 'Delivery Notes',
    mod3Desc: 'Generate clear and compliant documents for every trip. Streamline exchanges with your clients while accelerating your billing cycle.',
    mod4Km: 'KM 75',
    mod4Title: 'Driver Tracking',
    mod4Desc: 'Manage assignments, measure the efficiency and average consumption of your drivers for streamlined human management.',
    mod5Km: 'KM 100',
    mod5Title: 'Repairs & Oil Changes',
    mod5Desc: 'Schedule periodic technical maintenance for your vehicles to avoid costly downtimes and extend equipment lifespan.',
    mod6Km: 'KM 150',
    mod6Title: 'Expense Control',
    mod6Desc: 'Master your fixed charges (insurance, CNSS, taxes) and variable costs to immediately identify the net margin per truck.',
    dashTag: 'Strategic Decisions',
    dashTitle: 'Gain visibility on your margins',
    dashSub: 'Our analytics console automatically compiles operational costs for every trip, showing you in real time which truck generates the most profit.',
    dashItem1: 'Automatic average consumption calculation',
    dashItem2: 'Gross margin calculation per truck and trailer',
    dashItem3: 'Automatic alert before technical deadline / oil change',
    dashItem4: 'Download maintenance history in PDF format',
    dashCardTitle: 'Fleet Analysis',
    dashCardSub: 'Overall net margin per truck',
    dashCardLive: 'Live',
    dashCardSecure: 'Secured data',
    dashCardUpdated: 'Updated 2m ago',
    ctaTitle: 'Ready to transform your operations?',
    ctaSub: 'Join transport logistics professionals who automate their fleet management with our unified FleetVision platform.',
    footerRights: 'All rights reserved.',
  },
} as const;

// ─────────────────────────────────────────────
// Odometer Counter Component
// ─────────────────────────────────────────────
function OdometerCounter({ value, suffix = "", duration = 1.5 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      if (start === end) return;

      const totalMs = duration * 1000;
      const intervalTime = 25;
      const totalSteps = totalMs / intervalTime;
      const increment = (end - start) / totalSteps;

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          clearInterval(timer);
          setCount(end);
        } else {
          setCount(Math.floor(start));
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className="landing-counter">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ─────────────────────────────────────────────
// Language Toggle Component (direct switch, no dropdown)
// Sits inside the header, top-right — not fixed/floating.
// ─────────────────────────────────────────────
function LanguageToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      className="landing-lang-toggle"
      aria-label="Switch language"
      title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
    >
      <Globe size={16} />
      <span>{lang === 'fr' ? 'FR' : 'EN'}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Hero background — single video, plays on an infinite native loop
// ─────────────────────────────────────────────
function HeroVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const play = () => video.play().catch(() => { /* autoplay blocked, will retry on interaction */ });
    play();

    const handleInteraction = () => {
      play();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('scroll', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    >
      <source src="/vid1.mp4" type="video/mp4" />
    </video>
  );
}

// ─────────────────────────────────────────────
// Main Landing Page
// ─────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [lang, setLang] = useState<Lang>('fr');
  const t = translations[lang];

  // 3D Dashboard preview interactive hover states
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Scroll linked transforms for background video
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

  const videoScale = useSpring(
    useTransform(scrollYProgress, [0, 1], [1, 1.15]),
    springConfig
  );
  const videoOpacity = useSpring(
    useTransform(scrollYProgress, [0, 1], [0.6, 0.1]),
    springConfig
  );
  const textY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 150]),
    springConfig
  );
  const textOpacity = useSpring(
    useTransform(scrollYProgress, [0, 1], [1, 0]),
    springConfig
  );

  // Scroll linked transforms for the modules section background image
  // (same "zoom + fade" language as the hero video, applied to a static image)
  const modulesRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: modulesProgress } = useScroll({
    target: modulesRef,
    offset: ["start end", "end start"]
  });
  const modulesImgOpacity = useSpring(
    useTransform(modulesProgress, [0, 0.5, 1], [0.15, 0.32, 0.15]),
    springConfig
  );
  const modulesImgScale = useSpring(
    useTransform(modulesProgress, [0, 1], [1.05, 1.2]),
    springConfig
  );

  const getModules = useCallback(() => [
    { km: t.mod1Km, title: t.mod1Title, description: t.mod1Desc, icon: Truck, side: "left" },
    { km: t.mod2Km, title: t.mod2Title, description: t.mod2Desc, icon: Fuel, side: "right" },
    { km: t.mod3Km, title: t.mod3Title, description: t.mod3Desc, icon: FileText, side: "left" },
    { km: t.mod4Km, title: t.mod4Title, description: t.mod4Desc, icon: Users, side: "right" },
    { km: t.mod5Km, title: t.mod5Title, description: t.mod5Desc, icon: Wrench, side: "left" },
    { km: t.mod6Km, title: t.mod6Title, description: t.mod6Desc, icon: TrendingUp, side: "right" },
  ], [t]);

  const modules = getModules();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const maxRotation = 10;
    setRotateX(-(y / (box.height / 2)) * maxRotation);
    setRotateY((x / (box.width / 2)) * maxRotation);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div className="landing-root">

      {/* ─── Sticky Header ─── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/landing" className="landing-logo-link">
            <Image
              src="/logoheader-removebg-preview.png"
              alt="FleetVision"
              width={850}
              height={160}
              className="landing-logo-img"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="landing-nav-desktop">
            <Link href="/signin" className="landing-nav-link">
              {t.login}
            </Link>
            <Link href="/register" className="landing-btn-primary">
              {t.createAccount}
            </Link>
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>

          {/* Mobile Menu Trigger */}
          <div className="landing-nav-mobile-trigger">
            <LanguageToggle lang={lang} setLang={setLang} />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="landing-mobile-menu-btn"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="landing-mobile-drawer"
            >
              <Link
                href="/signin"
                className="landing-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className="landing-btn-primary landing-mobile-cta"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.createAccount}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Hero Section (single video, looping) ─── */}
      <section ref={heroRef} className="landing-hero">

        {/* Background Video */}
        <motion.div
          style={prefersReducedMotion ? {} : { scale: videoScale, opacity: videoOpacity }}
          className="landing-hero-video-wrap"
        >
          <HeroVideo className="landing-hero-video" />
          <div className="landing-hero-video-overlay" />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          style={prefersReducedMotion ? {} : { y: textY, opacity: textOpacity }}
          className="landing-hero-content"
        >
          <h1 className="landing-hero-title">
            {t.heroLine1}<br />
            {t.heroLine2}<br />
            <span className="landing-hero-accent">{t.heroLine3}</span>
          </h1>
          <p className="landing-hero-sub">{t.heroSub}</p>
          <div className="landing-hero-actions">
            <Link href="/register" className="landing-btn-primary landing-btn-lg group">
              {t.createAccount}
              <ArrowUpRight size={18} className="landing-btn-arrow" />
            </Link>
            <Link href="/signin" className="landing-btn-outline landing-btn-lg">
              {t.login}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Odometer Stats ─── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="landing-stats-grid">
            <div className="landing-stat">
              <OdometerCounter value={100} suffix="%" />
              <p className="landing-stat-label">{t.stat1Label}</p>
            </div>
            <div className="landing-stat">
              <OdometerCounter value={12} suffix="+" />
              <p className="landing-stat-label">{t.stat2Label}</p>
            </div>
            <div className="landing-stat">
              <OdometerCounter value={24} suffix="/7" />
              <p className="landing-stat-label">{t.stat3Label}</p>
            </div>
            <div className="landing-stat">
              <OdometerCounter value={15} suffix="x" />
              <p className="landing-stat-label">{t.stat4Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Modules Road Section (image background, video-like opacity/zoom effect) ─── */}
      <section ref={modulesRef} className="landing-modules">

        {/* Background Image (mimics the hero video's fade/zoom treatment) */}
        <motion.div
          style={prefersReducedMotion ? { opacity: 0.2 } : { opacity: modulesImgOpacity, scale: modulesImgScale }}
          className="landing-modules-image-wrap"
        >
          <Image
            src={background}
            alt=""
            fill
            priority={false}
            className="landing-modules-image"
            sizes="100vw"
          />
        </motion.div>
        <div className="landing-modules-image-overlay" />

        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-tag">{t.moduleSectionTag}</span>
            <h2 className="landing-section-title">{t.moduleSectionTitle}</h2>
            <p className="landing-section-sub">{t.moduleSectionSub}</p>
          </div>

          <div className="landing-road">
            {/* Dashed Center Road-Line */}
            <div className="landing-road-line" />

            <div className="landing-road-items">
              {modules.map((m, idx) => {
                const IconComponent = m.icon;
                const isLeft = m.side === "left";

                return (
                  <div key={idx} className="landing-road-item">

                    {/* Mile-Marker Point */}
                    <div className="landing-road-marker">
                      <div className="landing-road-dot" />
                    </div>

                    {/* Content Card */}
                    <div className={`landing-road-card-wrap ${isLeft ? 'left' : 'right'}`}>
                      <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotateX: 25, y: 40, z: -80 }}
                        whileInView={{ opacity: 1, rotateX: 0, y: 0, z: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="landing-road-card"
                      >
                        <div className="landing-road-card-inner">
                          <span className="landing-km-badge">{m.km}</span>
                          <div className="landing-module-header">
                            <div className="landing-module-icon">
                              <IconComponent className="landing-module-icon-svg" />
                            </div>
                            <h3 className="landing-module-title">{m.title}</h3>
                          </div>
                          <p className="landing-module-desc">{m.description}</p>
                        </div>
                      </motion.div>
                    </div>

                    {/* Empty Side */}
                    <div className="landing-road-empty" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dashboard Preview Section ─── */}
      <section className="landing-dashboard">
        <div className="landing-container">
          <div className="landing-dashboard-grid">

            {/* Features Info */}
            <div className="landing-dashboard-info">
              <span className="landing-tag">{t.dashTag}</span>
              <h2 className="landing-section-title">{t.dashTitle}</h2>
              <p className="landing-dashboard-sub">{t.dashSub}</p>

              <ul className="landing-checklist">
                {[t.dashItem1, t.dashItem2, t.dashItem3, t.dashItem4].map((item, idx) => (
                  <li key={idx} className="landing-checklist-item">
                    <div className="landing-check-icon">
                      <CheckCircle className="landing-check-svg" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3D Mock Dashboard Card */}
            <div className="landing-dashboard-card-wrap">
              <div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: prefersReducedMotion
                    ? 'none'
                    : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                  transition: prefersReducedMotion ? 'none' : 'transform 0.15s ease-out'
                }}
                className="landing-dashboard-card"
              >
                <div className="landing-dashboard-card-header">
                  <div>
                    <h3 className="landing-dashboard-card-title">{t.dashCardTitle}</h3>
                    <p className="landing-dashboard-card-sub">{t.dashCardSub}</p>
                  </div>
                  <span className="landing-live-badge">
                    <Clock size={12} />
                    {t.dashCardLive}
                  </span>
                </div>

                {/* Mock Bar Chart */}
                <div className="landing-bars">
                  {[
                    { matricule: '123 TU 4567', margin: 85, value: '8,500 TND', color: 'bar-orange' },
                    { matricule: '987 TU 6543', margin: 70, value: '7,000 TND', color: 'bar-amber' },
                    { matricule: '345 TU 8901', margin: 55, value: '5,500 TND', color: 'bar-green' },
                    { matricule: '222 TU 9999', margin: 40, value: '4,000 TND', color: 'bar-gray' }
                  ].map((row, idx) => (
                    <div key={idx} className="landing-bar-row">
                      <div className="landing-bar-labels">
                        <span className="landing-bar-matricule">{row.matricule}</span>
                        <span className="landing-bar-value">{row.value}</span>
                      </div>
                      <div className="landing-bar-track">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.margin}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: idx * 0.1 }}
                          className={`landing-bar-fill ${row.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="landing-dashboard-card-footer">
                  <span className="landing-secure">
                    <Shield size={12} className="landing-secure-icon" />
                    {t.dashCardSecure}
                  </span>
                  <span>{t.dashCardUpdated}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="landing-cta">
        <div className="landing-cta-glow" />
        <div className="landing-container landing-cta-inner">
          <h2 className="landing-cta-title">{t.ctaTitle}</h2>
          <p className="landing-cta-sub">{t.ctaSub}</p>
          <div className="landing-hero-actions">
            <Link href="/register" className="landing-btn-primary landing-btn-lg group">
              {t.createAccount}
              <ArrowUpRight size={18} className="landing-btn-arrow" />
            </Link>
            <Link href="/signin" className="landing-btn-outline landing-btn-lg">
              {t.login}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} FleetVision. {t.footerRights}</p>
      </footer>

    </div>
  );
}