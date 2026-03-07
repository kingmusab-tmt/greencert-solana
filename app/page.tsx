"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  Coins,
  Cpu,
  GitBranch,
  Globe,
  Leaf,
  Link2,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "./components/theme-provider";

/* --- Animation variants --- */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* --- Types --- */
type Feature = { title: string; body: string; icon: LucideIcon };
type Step = { num: string; title: string; body: string; icon: LucideIcon };
type Stat = { label: string; value: string; suffix?: string };
type FaqItem = { q: string; a: string };

/* --- Data --- */
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Architecture", href: "#architecture" },
  { label: "FAQ", href: "#faq" },
];

const STATS: Stat[] = [
  { label: "Energy Tracked", value: "50", suffix: " MWh" },
  { label: "CO\u2082 Saved", value: "25.4", suffix: " tCO\u2082" },
  { label: "GreenCerts Minted", value: "500", suffix: "+" },
  { label: "Active Installations", value: "5", suffix: "" },
];

const FEATURES: Feature[] = [
  {
    title: "Validation Gateway",
    body: "Secure ingest from inverter APIs and IoT meters with tamper-aware verification before on-chain settlement.",
    icon: ShieldCheck,
  },
  {
    title: "Carbon-Grade Oracle",
    body: "Cross-checks output against irradiance data to reject suspicious generation profiles and preserve trust.",
    icon: Radio,
  },
  {
    title: "Compressed Minting",
    body: "Every verified 100 kWh batch mints as a low-cost cNFT via Metaplex Bubblegum on Solana.",
    icon: Sparkles,
  },
  {
    title: "Real-Time Analytics",
    body: "Live dashboard tracking energy production, carbon offsets, and mint status across all connected installations.",
    icon: BarChart3,
  },
  {
    title: "Enterprise API",
    body: "RESTful and WebSocket APIs for seamless integration with existing energy management systems.",
    icon: Globe,
  },
  {
    title: "Instant Settlement",
    body: "Sub-second finality on Solana ensures carbon credits are tokenized and tradeable immediately.",
    icon: Zap,
  },
];

const STEPS: Step[] = [
  {
    num: "01",
    title: "Connect Infrastructure",
    body: "Attach smart inverters or IoT meter streams to the GreenCert validation gateway via our secure API.",
    icon: Link2,
  },
  {
    num: "02",
    title: "Verify Production",
    body: "Oracle cross-validates telemetry against weather data and irradiance models to ensure authenticity.",
    icon: ShieldCheck,
  },
  {
    num: "03",
    title: "Mint GreenCerts",
    body: "At 100 kWh verified output, a compressed NFT is minted to your Solana wallet as a carbon offset.",
    icon: Coins,
  },
];

const FAQS: FaqItem[] = [
  {
    q: "How does GreenCert prevent fake generation claims?",
    a: "Telemetry is validated through anti-fraud rules and cross-referenced with local irradiance windows before any mint event. Our oracle rejects profiles that don\u2019t match expected solar output patterns.",
  },
  {
    q: "Why use compressed NFTs instead of standard NFTs?",
    a: "State compression keeps minting cost under $0.001 per certificate, making household-scale participation economically viable. Standard NFTs would cost 100x more per mint.",
  },
  {
    q: "Who can join the pilot program?",
    a: "Households, SMEs, and installers with compatible meter or inverter feeds and a Solana wallet. We support most major inverter brands through our adapter layer.",
  },
  {
    q: "What blockchain network does GreenCert use?",
    a: "GreenCert runs on Solana mainnet, leveraging Metaplex Bubblegum for state-compressed NFTs. This gives us sub-second finality and negligible transaction costs.",
  },
  {
    q: "How are carbon credits valued?",
    a: "Each GreenCert represents 100 kWh of verified solar production. The carbon equivalent is calculated using regional grid emission factors, currently averaging 0.5 tCO\u2082 per MWh for Nigeria.",
  },
];

const ARCH_NODES = [
  { label: "Solar Panel", icon: Sun },
  { label: "IoT Meter", icon: Radio },
  { label: "Validation", icon: ShieldCheck },
  { label: "Bubblegum", icon: Cpu },
];

/* --- Utility hook --- */
function useAnimateOnView(margin: string = "-60px") {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: margin as "-60px" });
  return { ref, inView };
}

/* --- Counter animation --- */
function AnimatedCounter({
  value,
  suffix = "",
}: {
  value: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const num = parseFloat(value);

  useEffect(() => {
    if (!inView) return;
    const isFloat = value.includes(".");
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = num * eased;
      setDisplay(isFloat ? current.toFixed(1) : Math.floor(current).toString());
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, num, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* --- Section wrapper --- */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative py-20 md:py-28 ${className}`}>
      {children}
    </section>
  );
}

/* --- Header --- */
function Header() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-lg group-hover:shadow-accent/30 transition-shadow">
            <Image
              src="/greencert.webp"
              alt="GreenCert logo"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-foreground">
              GreenCert
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground-tertiary">
              Nigeria
            </p>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="relative h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center transition-all hover:border-border-strong hover:bg-surface-raised"
            aria-label="Toggle theme"
          >
            <Sun
              className={`h-[18px] w-[18px] transition-all duration-300 ${theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"} absolute text-amber-400`}
            />
            <Moon
              className={`h-[18px] w-[18px] transition-all duration-300 ${theme === "light" ? "rotate-0 scale-100" : "-rotate-90 scale-0"} absolute text-slate-600`}
            />
          </button>

          <a
            href="/signin"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
          >
            <Wallet className="h-4 w-4" />
            Login
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center lg:hidden transition-colors hover:bg-surface-raised"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="border-b border-border bg-background/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/signin"
                onClick={closeMobile}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl gradient-bg px-5 py-3 text-sm font-semibold text-white"
              >
                <Wallet className="h-4 w-4" />
                Login
              </a>
            </nav>
          </div>
        </motion.div>
      )}
    </header>
  );
}

/* --- Hero Section --- */
function HeroSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section className="pt-32 md:pt-40 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Background orbs */}
        <div className="mesh-orb -top-40 -left-40 h-[500px] w-[500px] bg-emerald-500" />
        <div className="mesh-orb -top-20 -right-40 h-[400px] w-[400px] bg-cyan-500" />

        <div
          ref={ref}
          className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
        >
          {/* Left content */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative z-10"
          >
            <motion.div variants={fadeUp}>
              <span className="badge">
                <Leaf className="h-3.5 w-3.5" />
                DePIN x CleanTech
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Tokenizing the <span className="gradient-text">Nigerian Sun</span>
              <span className="text-accent">.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg leading-relaxed text-foreground-secondary"
            >
              Earn a Green Dividend by converting verified solar production into
              trusted carbon offsets on Solana. Enterprise-grade verification,
              household-scale accessibility.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signin"
                className="group inline-flex items-center gap-2.5 rounded-xl gradient-bg px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/35 hover:-translate-y-0.5"
              >
                <Wallet className="h-4 w-4" />
                Login
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-border-strong hover:bg-surface-raised hover:-translate-y-0.5"
              >
                <BadgeCheck className="h-4 w-4 text-accent" />
                Join the Pilot
              </a>
            </motion.div>

            {/* Mini stats row */}
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap gap-6"
            >
              {STATS.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-foreground">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs font-medium text-foreground-tertiary">
                    {s.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right image */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-2xl">
              <Image
                src="/hero-solar.svg"
                alt="Solar panel infrastructure producing verified energy"
                width={800}
                height={500}
                className="w-full h-auto"
                priority
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 card-surface rounded-xl p-4 shadow-xl sm:-bottom-6 sm:-left-6"
            >
              <div className="flex items-center gap-3">
                <div className="icon-box">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">+100 kWh</p>
                  <p className="text-xs text-foreground-tertiary">
                    Just verified
                  </p>
                </div>
              </div>
            </motion.div>
            {/* Floating badge 2 */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -top-4 -right-4 card-surface rounded-xl p-3 shadow-xl sm:-top-6 sm:-right-6"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-accent" />
                <p className="text-xs font-semibold text-foreground">
                  Solana Verified
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* --- Impact Stats Strip --- */
function StatsSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <div className="relative">
      <div className="section-divider" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={scaleUp}
              className="card-surface hover-glow rounded-xl p-6 text-center"
            >
              <p className="text-3xl font-bold text-accent">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-sm font-medium text-foreground-secondary">
                {s.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="section-divider" />
    </div>
  );
}

/* --- Features Section --- */
function FeaturesSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="badge">
              <Sparkles className="h-3.5 w-3.5" />
              Platform Features
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for trust, scale, and{" "}
              <span className="gradient-text">low-cost settlement</span>
            </h2>
            <p className="mt-4 text-base text-foreground-secondary leading-relaxed">
              GreenCert combines data integrity and on-chain efficiency, making
              climate verification usable for everyday producers.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <motion.article
                  key={f.title}
                  variants={fadeUp}
                  className="card-surface hover-glow group rounded-xl p-6 transition-all"
                >
                  <div className="icon-box group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                    {f.body}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* --- How It Works --- */
function HowItWorksSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section id="how-it-works" className="bg-surface-raised/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="badge">
              <Link2 className="h-3.5 w-3.5" />
              How It Works
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From meter to wallet in{" "}
              <span className="gradient-text">three steps</span>
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="mt-14 grid gap-6 lg:grid-cols-3"
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.num}
                  variants={fadeUp}
                  className="card-surface hover-glow group relative rounded-xl p-6 overflow-hidden"
                >
                  {/* Large step number background */}
                  <span className="absolute -top-2 -right-2 text-8xl font-black text-foreground/[0.03] select-none leading-none">
                    {step.num}
                  </span>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg text-xs font-bold text-white">
                        {step.num}
                      </span>
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                      {step.body}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>

          {/* Connecting line (desktop) */}
          <div className="mt-8 hidden lg:flex items-center justify-center gap-4">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full gradient-bg" />
                {i < STEPS.length - 1 && (
                  <div className="h-0.5 w-32 bg-gradient-to-r from-accent to-accent-secondary opacity-30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* --- Dashboard Preview --- */
function DashboardSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section id="dashboard">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left text */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <motion.div variants={fadeUp}>
              <span className="badge">
                <BarChart3 className="h-3.5 w-3.5" />
                Green Ledger
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Real-time visibility into your
              <br />
              <span className="gradient-text">solar portfolio</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-base text-foreground-secondary leading-relaxed"
            >
              Track energy production, monitor carbon offset generation, and
              view every GreenCert mint in real-time. The dashboard provides
              enterprise-grade analytics for both individual producers and fleet
              operators.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 space-y-4">
              {[
                "Live energy production tracking per installation",
                "Carbon offset calculations with regional emission factors",
                "Mint history with on-chain verification links",
                "Fleet management for multi-site operators",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full gradient-bg">
                    <BadgeCheck className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-sm text-foreground-secondary">{item}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right image */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">
              <Image
                src="/dashboard-preview.svg"
                alt="GreenCert analytics dashboard showing energy production and mint data"
                width={600}
                height={400}
                className="h-auto w-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* --- Problem / Solution --- */
function ProblemSolutionSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section className="bg-surface-raised/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid gap-6 md:grid-cols-2">
          <motion.article
            variants={slideLeft}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="card-surface rounded-xl p-8 border-l-4 border-l-red-500/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground-tertiary">
                The Problem
              </p>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-foreground">
              The $2B Market Gap
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
              Small-scale solar owners are excluded from global carbon markets
              because traditional verification and settlement costs overwhelm
              micro-offset value. The result: clean energy goes uncredited and
              untracked.
            </p>
          </motion.article>

          <motion.article
            variants={slideRight}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="card-surface rounded-xl p-8 border-l-4 border-l-accent/40"
          >
            <div className="flex items-center gap-3">
              <div className="icon-box">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground-tertiary">
                The Solution
              </p>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-foreground">
              Compression at Household Scale
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
              Solana State Compression and Bubblegum make low-fee,
              high-integrity carbon tokenization practical for homes and SMEs.
              Minting costs drop from ~$2 to under $0.001 per certificate.
            </p>
          </motion.article>
        </div>
      </div>
    </Section>
  );
}

/* --- Architecture --- */
function ArchitectureSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section id="architecture">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="badge">
              <Cpu className="h-3.5 w-3.5" />
              Technical Architecture
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Validation gateway to{" "}
              <span className="gradient-text">Bubblegum minting</span>
            </h2>
            <p className="mt-4 text-base text-foreground-secondary">
              Telemetry flows from physical infrastructure through verification
              into on-chain cNFT settlement.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="mt-14"
          >
            {/* Flow diagram */}
            <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-0">
              {ARCH_NODES.map((node, i) => {
                const Icon = node.icon;
                return (
                  <motion.div
                    key={node.label}
                    variants={scaleUp}
                    className="flex items-center gap-0"
                  >
                    <div className="flow-node hover-glow group cursor-default px-5 py-4">
                      <Icon className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                      <span className="text-sm">{node.label}</span>
                    </div>
                    {i < ARCH_NODES.length - 1 && (
                      <div className="hidden md:flex items-center px-3">
                        <div className="h-0.5 w-8 bg-gradient-to-r from-accent to-accent-secondary opacity-40" />
                        <ArrowRight className="h-4 w-4 text-accent opacity-50" />
                      </div>
                    )}
                    {i < ARCH_NODES.length - 1 && (
                      <div className="flex md:hidden flex-col items-center py-2">
                        <div className="w-0.5 h-6 bg-gradient-to-b from-accent to-accent-secondary opacity-40" />
                        <ChevronDown className="h-4 w-4 text-accent opacity-50" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* --- FAQ --- */
function FaqSection() {
  const { ref, inView } = useAnimateOnView();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section id="faq" className="bg-surface-raised/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div ref={ref}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="text-center"
          >
            <span className="badge">FAQ</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="mt-10 space-y-3"
          >
            {FAQS.map((item, i) => (
              <motion.div
                key={item.q}
                variants={fadeUp}
                className="card-surface overflow-hidden rounded-xl"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-foreground-tertiary transition-transform duration-300 ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    openIndex === i
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-foreground-secondary">
                      {item.a}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* --- CTA Section --- */
function CtaSection() {
  const { ref, inView } = useAnimateOnView();
  return (
    <Section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={scaleUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative overflow-hidden rounded-2xl gradient-bg p-10 sm:p-14 text-center"
        >
          {/* Decorative circles */}
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to bring your solar data on-chain?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
              Join the GreenCert pilot and start earning verifiable carbon
              credits from your solar installations. Enterprise-ready,
              household-accessible.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Wallet className="h-4 w-4" />
                Request Pilot Access
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

/* --- Footer --- */
function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl">
                <Image
                  src="/greencert.webp"
                  alt="GreenCert logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">GreenCert</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground-tertiary">
                  Nigeria
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-foreground-secondary leading-relaxed">
              Clean energy, verifiable on-chain. A DePIN platform for West
              Africa&apos;s solar economy.
            </p>
          </div>

          {/* Platform links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
              Platform
            </p>
            <ul className="mt-4 space-y-3">
              {["Features", "How It Works", "Architecture"].map((lnk) => (
                <li key={lnk}>
                  <a
                    href={`#${lnk.toLowerCase().replace(/ /g, "-")}`}
                    className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
                  >
                    {lnk}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
              Resources
            </p>
            <ul className="mt-4 space-y-3">
              {["Documentation", "API Reference", "FAQ", "Status"].map(
                (lnk) => (
                  <li key={lnk}>
                    <a
                      href={lnk === "FAQ" ? "#faq" : "#"}
                      className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
                    >
                      {lnk}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
              Community
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="https://github.com/kingmusab-tmt/greencert-solana"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/kingmusabmmb"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  <Leaf className="h-3.5 w-3.5 text-accent" />X @Kingmusabmmb
                </a>
              </li>
            </ul>
          </div>

          {/* Get in touch */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
              Get in touch
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:info@greencertnigeria.com.ng"
                  className="inline-flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  info@greencertnigeria.com.ng
                </a>
              </li>
              <li>
                <a
                  href="tel:+2348162552901"
                  className="inline-flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                  +234 (816) 255-2901
                </a>
              </li>
              <li>
                <span className="inline-flex items-start gap-2 text-sm text-foreground-secondary">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />1 Adesola
                  Alabi Street, Ataoja Estate, Osogbo, Osun State, Nigeria.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-divider mt-10" />
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-foreground-tertiary">
            &copy; {new Date().getFullYear()} GreenCert Nigeria. All rights
            reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-foreground-tertiary">
            <span>Powered by</span>
            <span className="font-semibold gradient-text">Solana</span>
            <span>&amp;</span>
            <span className="font-semibold gradient-text">
              Metaplex Bubblegum
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* --- Page --- */
export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardSection />
        <ProblemSolutionSection />
        <ArchitectureSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
