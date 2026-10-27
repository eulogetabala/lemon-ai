"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  CalendarDays,
  Check,
  LayoutGrid,
  Menu,
  PenLine,
  Plus,
  Rocket,
  Send,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChannelTypeEnum, getChannelIcon } from "@/constants/channels";

const navItems = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Canaux", href: "#canaux" },
  { label: "Pour qui", href: "#pour-qui" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

const platformBadges = [
  { type: ChannelTypeEnum.TWITTER, color: "#1a1a2e", className: "left-[2%]  top-[8%]" },
  { type: ChannelTypeEnum.LINKEDIN, color: "#0a2d5e", className: "left-[6%]  top-[32%]" },
  { type: ChannelTypeEnum.YOUTUBE, color: "#2d0a0a", className: "left-[2%]  top-[56%]" },
  { type: ChannelTypeEnum.BLUESKY, color: "#0a1f3d", className: "right-[2%] top-[8%]" },
  { type: ChannelTypeEnum.INSTAGRAM, color: "#2d0a1a", className: "right-[6%] top-[32%]" },
  { type: ChannelTypeEnum.THREADS, color: "#1a1a2e", className: "right-[2%] top-[56%]" },
  { type: ChannelTypeEnum.FACEBOOK, color: "#0a1a3d", className: "right-[9%] top-[56%]" },
]

const platformBadgesColors = [
  "#e2e8f0",  // Twitter
  "#2867b2",  // LinkedIn
  "#FF0000",  // YouTube
  "#1285fe",  // Bluesky
  "#E4405F",  // Instagram
  "#000000",  // Threads
  "#1877F2",  // Facebook
]

const features = [
  {
    icon: CalendarDays,
    title: "Planification claire",
    description: "Vos idées, brouillons et publications planifiées au même endroit, sans jongler entre onglets et tableurs.",
    gradient: "from-[#0d2a14] to-[#0a1f0d]",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    accent: "border-emerald-500/20",
  },
  {
    icon: PenLine,
    title: "Personnalisez par canal",
    description: "Partez d'un brouillon global puis adaptez chaque publication à la plateforme, sans recommencer.",
    gradient: "from-[#1f0d2a] to-[#160a1f]",
    iconBg: "bg-purple-500/15 text-purple-400",
    accent: "border-purple-500/20",
  },
  {
    icon: Sparkles,
    title: "IA intégrée",
    description: "Générez des idées et rédigez plus vite avec l'IA, directement dans votre espace de travail.",
    gradient: "from-[#0a1f2d] to-[#091525]",
    iconBg: "bg-sky-500/15 text-sky-400",
    accent: "border-sky-500/20",
  },
  {
    icon: Send,
    title: "Publication automatisée",
    description: "Programmez vos posts et laissez l'outil publier au bon moment, sur le bon canal.",
    gradient: "from-[#2d1a0a] to-[#1f1209]",
    iconBg: "bg-amber-500/15 text-amber-400",
    accent: "border-amber-500/20",
  },
];

const channels = [
  { type: ChannelTypeEnum.TWITTER, name: "X / Twitter", color: "#e2e8f0", bg: "#111827" },
  { type: ChannelTypeEnum.INSTAGRAM, name: "Instagram", color: "#E4405F", bg: "#2d0a1a" },
  { type: ChannelTypeEnum.LINKEDIN, name: "LinkedIn", color: "#2867b2", bg: "#0a1a3d" },
  { type: ChannelTypeEnum.THREADS, name: "Threads", color: "#e2e8f0", bg: "#111827" },
  { type: ChannelTypeEnum.FACEBOOK, name: "Facebook", color: "#1877F2", bg: "#0a1530" },
  { type: ChannelTypeEnum.BLUESKY, name: "Bluesky", color: "#1285fe", bg: "#0a1a30" },
  { type: ChannelTypeEnum.YOUTUBE, name: "YouTube", color: "#FF0000", bg: "#2d0a0a" },
  { type: ChannelTypeEnum.TIKTOK, name: "TikTok", color: "#e2e8f0", bg: "#111827" },
];

const audiences = [
  {
    icon: Rocket,
    title: "Créateurs & solopreneurs",
    description: "Gagnez des heures chaque semaine en préparant tout votre contenu en une seule session.",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  {
    icon: Users,
    title: "Freelances & agences",
    description: "Gérez plusieurs comptes clients depuis un seul tableau de bord, sans mélanger les marques.",
    iconBg: "bg-sky-500/15 text-sky-400",
  },
  {
    icon: LayoutGrid,
    title: "Équipes marketing",
    description: "Collaborez sur le planning, validez les publications et gardez une ligne éditoriale cohérente.",
    iconBg: "bg-purple-500/15 text-purple-400",
  },
];

const pricingPlans = [
  {
    name: "Gratuit",
    price: "0 $",
    period: "/mois",
    description: "Idéal pour démarrer et tester la planification.",
    features: ["3 canaux connectés", "10 publications planifiées/mois", "Analytiques de base", "1 espace de travail"],
    cta: "Commencer gratuitement",
    highlight: false,
    badge: null,
  },
  {
    name: "Pro",
    price: "19 $",
    period: "/mois",
    description: "Pour les créateurs et solopreneurs qui publient régulièrement.",
    features: [
      "Canaux connectés illimités",
      "Publications illimitées",
      "Suggestions de contenu IA",
      "Vue calendrier & planification en masse",
      "Support prioritaire",
    ],
    cta: "Passer à Pro",
    highlight: true,
    badge: "Le plus populaire",
  },
  {
    name: "Équipe",
    price: "49 $",
    period: "/mois",
    description: "Pour les équipes qui gèrent plusieurs marques.",
    features: ["Tout le plan Pro", "Espaces de travail illimités", "Collaboration & rôles", "Workflows d'approbation", "Accès API"],
    cta: "Passer à Équipe",
    highlight: false,
    badge: null,
  },
];

const faqs = [
  {
    question: "Puis-je essayer sans carte bancaire ?",
    answer: "Oui. L'offre gratuite ne nécessite aucune carte bancaire et vous pouvez mettre à niveau à tout moment.",
  },
  {
    question: "Quels réseaux sociaux sont pris en charge ?",
    answer: "X / Twitter, Instagram, LinkedIn, Threads, Facebook, Bluesky, YouTube et TikTok.",
  },
  {
    question: "L'IA remplace-t-elle mon style d'écriture ?",
    answer: "Non. L'IA vous aide à générer des idées et des brouillons, mais vous gardez le contrôle final sur chaque publication.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer: "Oui, vous pouvez changer d'offre ou annuler en quelques clics depuis la page de facturation.",
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryCta = isSignedIn ? "/schedule" : "/sign-up";
  const primaryCtaLabel = isSignedIn ? "Ouvrir l'espace de travail" : "Commencer gratuitement";

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navigation ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] dark:border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" aria-label="Lemon.ai — Accueil" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-foreground/50 transition-all hover:bg-white/6 hover:text-foreground dark:hover:bg-white/6"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {!isSignedIn ? (
              <>
                <Button asChild variant="ghost" className="rounded-full px-5 text-foreground/70 hover:text-foreground">
                  <Link href="/sign-in">Se connecter</Link>
                </Button>
                <Button asChild className="rounded-full px-5">
                  <Link href="/sign-up">
                    Commencer gratuitement
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="rounded-full px-5">
                  <Link href="/schedule">
                    Ouvrir l&apos;espace de travail
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Ouvrir le menu"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.06] bg-background/95 px-6 py-4 backdrop-blur-xl md:hidden animate-slide-in-up">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-white/6 hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
              {!isSignedIn ? (
                <>
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <Link href="/sign-in" onClick={() => setMenuOpen(false)}>Se connecter</Link>
                  </Button>
                  <Button asChild className="w-full rounded-full">
                    <Link href="/sign-up" onClick={() => setMenuOpen(false)}>Commencer gratuitement</Link>
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full rounded-full">
                  <Link href="/schedule" onClick={() => setMenuOpen(false)}>Ouvrir l&apos;espace de travail</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
            <div className="absolute -left-32 top-40 h-72 w-72 rounded-full bg-[#c4b5fd]/6 blur-[100px]" />
            <div className="absolute -right-32 top-40 h-72 w-72 rounded-full bg-[#7dd3fc]/6 blur-[100px]" />
          </div>

          {/* Dot grid */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.15] dark:opacity-[0.08]
            [background-image:radial-gradient(rgba(163,230,53,0.4)_1px,transparent_1px)]
            [background-size:48px_48px]" />

          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

          <div className="relative mx-auto flex min-h-[780px] max-w-7xl flex-col px-6 pb-16 pt-20">
            {/* Floating platform badges */}
            <div className="absolute inset-0 hidden md:block pointer-events-none">
              {platformBadges.map((platform, index) => {
                const icon = getChannelIcon(platform.type)
                const iconColor = platformBadgesColors[index]
                return (
                  <div
                    key={platform.type}
                    style={{ animationDelay: `${index * 0.35}s` }}
                    className={`absolute ${platform.className} animate-float`}
                  >
                    <div className="glass rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      {icon && (
                        <div className="relative flex size-9 items-center justify-center">
                          <div
                            className="absolute -inset-2 rounded-full border animate-spin-reverse opacity-40"
                            style={{
                              borderColor: "transparent",
                              borderTopColor: iconColor,
                              borderRightColor: iconColor,
                            }}
                          />
                          <div
                            className="flex size-9 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: iconColor + "22", border: `1px solid ${iconColor}40` }}
                          >
                            <HugeiconsIcon icon={icon} color={iconColor} className="size-5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hero content */}
            <div className="z-10 mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center text-center gap-6">
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-sm text-primary/90 shadow-[0_0_20px_rgba(163,230,53,0.08)]">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span className="font-medium">Planifiez smarter, publiez partout</span>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="max-w-4xl text-balance text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl leading-[1.08] text-foreground">
                  Votre espace de travail pour les{" "}
                  <span className="text-gradient-lime">
                    réseaux sociaux
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="max-w-2xl text-pretty text-lg text-foreground/50 sm:text-xl leading-relaxed">
                  Rédigez plus vite, restez organisé et planifiez du contenu sur tous vos canaux, sans le chaos habituel.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="group h-12 rounded-full px-8 text-base font-semibold"
                  >
                    <Link href={primaryCta}>
                      {primaryCtaLabel}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  {!isSignedIn && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-12 rounded-full px-8 text-base"
                    >
                      <Link href="/sign-in">Se connecter</Link>
                    </Button>
                  )}
                </div>
              </Reveal>

              <Reveal delay={400}>
                <p className="text-sm text-foreground/35">
                  Aucune carte bancaire requise · Démarrage en 2 minutes
                </p>
              </Reveal>
            </div>

            {/* Stat bento cards */}
            <div className="mt-10 grid gap-4 md:grid-cols-3 z-10">
              {/* 8 platforms */}
              <Reveal delay={0} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/8 glass-card p-7 card-tilt">
                  <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-5xl font-bold tracking-tight text-gradient-lime-simple">8</span>
                      <div className="flex max-w-[168px] flex-wrap justify-end gap-1.5">
                        {channels.map((channel, i) => {
                          const icon = getChannelIcon(channel.type)
                          return (
                            <span
                              key={channel.type}
                              className="flex size-7 items-center justify-center rounded-full animate-bob"
                              style={{
                                backgroundColor: channel.color + "22",
                                border: `1px solid ${channel.color}44`,
                                animationDelay: `${i * 0.12}s`
                              }}
                            >
                              {icon && <HugeiconsIcon icon={icon} color={channel.color} className="size-3.5" />}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-4 text-xs uppercase tracking-[0.14em] text-foreground/35 font-semibold">
                      plateformes sociales
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* 1 workspace */}
              <Reveal delay={120} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/8 glass-card p-7 card-tilt">
                  <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-[#c4b5fd]/8 blur-2xl" />
                  <div className="relative">
                    <span className="text-5xl font-bold tracking-tight text-foreground/90">1</span>
                    <div className="mt-3 text-xs uppercase tracking-[0.14em] text-foreground/35 font-semibold">
                      espace de travail unifié
                    </div>
                    <div className="mt-5 grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const heights = [10, 16, 8, 20, 12, 18, 10]
                        return (
                          <span
                            key={i}
                            className="rounded-full bg-primary/20 animate-pulse-soft"
                            style={{
                              height: heights[i % heights.length],
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* AI */}
              <Reveal delay={240} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/8 glass-card p-7 card-tilt">
                  <div className="pointer-events-none absolute -bottom-8 -right-8 size-32 rounded-full bg-[#7dd3fc]/8 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-bold tracking-tight text-gradient-lime">IA</span>
                      <Sparkles className="size-6 text-primary animate-pulse-soft" />
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.14em] text-foreground/35 font-semibold">
                      intégrée à la rédaction
                    </div>
                    <div className="mt-5 flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-2.5 rounded-full bg-primary animate-pulse-soft"
                          style={{ animationDelay: `${i * 0.22}s` }}
                        />
                      ))}
                      <span className="ml-1 h-2 w-20 rounded-full bg-primary/15 animate-shimmer" />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Fonctionnalités ──────────────────────────────── */}
        <section id="fonctionnalites" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
              Fonctionnalités
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Tout ce qu&apos;il faut pour publier{" "}
              <span className="text-gradient-lime">sans stress</span>
            </h2>
            <p className="mt-4 text-lg text-foreground/45">
              Un espace unique pour capturer vos idées, planifier vos semaines et publier partout.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Reveal key={feature.title} delay={(index % 2) * 120} className="h-full">
                  <div className={cn(
                    "h-full rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1",
                    "dark:bg-gradient-to-br dark:border-white/8",
                    feature.gradient,
                    feature.accent,
                    "light:bg-card light:border-border"
                  )}>
                    <div className={cn(
                      "mb-6 inline-flex size-11 items-center justify-center rounded-xl",
                      feature.iconBg
                    )}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-foreground/55">{feature.description}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ── Canaux ───────────────────────────────────────── */}
        <section id="canaux" className="border-y border-white/[0.06] dark:bg-white/[0.02]">
          <div className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
                Canaux supportés
              </div>
              <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Publiez partout,{" "}
                <span className="text-gradient-lime">depuis un seul endroit</span>
              </h2>
              <p className="mt-4 text-lg text-foreground/45">
                Connectez vos comptes et adaptez chaque publication au bon format.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {channels.map((channel, index) => {
                const icon = getChannelIcon(channel.type)
                return (
                  <Reveal key={channel.type} delay={index * 60} className="h-full">
                    <div className="group flex h-full items-center gap-3 rounded-2xl border border-white/8 glass-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/16">
                      {icon && (
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                          style={{
                            backgroundColor: channel.color + "22",
                            border: `1px solid ${channel.color}44`
                          }}
                        >
                          <HugeiconsIcon icon={icon} color={channel.color} className="size-5" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-foreground/80">{channel.name}</span>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Pour qui ─────────────────────────────────────── */}
        <section id="pour-qui" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
              Pour qui
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Pensé pour ceux qui{" "}
              <span className="text-gradient-lime">publient</span>
            </h2>
            <p className="mt-4 text-lg text-foreground/45">
              Que vous soyez seul·e ou en équipe, Lemon.ai s&apos;adapte à votre façon de travailler.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {audiences.map((audience, index) => {
              const Icon = audience.icon
              return (
                <Reveal key={audience.title} delay={index * 120} className="h-full">
                  <div className="group h-full rounded-2xl border border-white/8 glass-card p-8 transition-all duration-300 hover:-translate-y-1">
                    <div className={cn(
                      "mb-6 inline-flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                      audience.iconBg
                    )}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-foreground">{audience.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-foreground/50">{audience.description}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ── Tarifs ───────────────────────────────────────── */}
        <section id="tarifs" className="border-y border-white/[0.06] dark:bg-white/[0.02]">
          <div className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
                Tarifs
              </div>
              <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Des tarifs simples,{" "}
                <span className="text-gradient-lime">sans surprise</span>
              </h2>
              <p className="mt-4 text-lg text-foreground/45">
                Commencez gratuitement et passez à la vitesse supérieure quand vous êtes prêt·e.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {pricingPlans.map((plan, index) => (
                <Reveal key={plan.name} delay={index * 120} className="h-full">
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1",
                      plan.highlight
                        ? "border-primary/40 dark:bg-gradient-to-b dark:from-primary/8 dark:to-primary/4 glow-lime animate-border-glow"
                        : "border-white/8 glass-card"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground/90">{plan.name}</h3>
                      {plan.badge && (
                        <span className="rounded-full bg-primary/15 border border-primary/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-end gap-1">
                      <span className={cn(
                        "text-5xl font-bold tracking-tight",
                        plan.highlight ? "text-gradient-lime-simple" : "text-foreground/90"
                      )}>
                        {plan.price}
                      </span>
                      <span className="mb-1.5 text-sm text-foreground/40">{plan.period}</span>
                    </div>
                    <p className="mt-3 text-sm text-foreground/45">{plan.description}</p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <div className="mt-0.5 size-4 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                            <Check className="size-2.5 text-primary" />
                          </div>
                          <span className="text-foreground/60">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant={plan.highlight ? "default" : "outline"}
                      className="mt-8 w-full rounded-full h-10"
                    >
                      <Link href={primaryCta}>{plan.cta}</Link>
                    </Button>
                  </div>
                </Reveal>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-foreground/35">
              Toutes les offres incluent un essai gratuit de 14 jours. Aucune carte bancaire requise pour commencer.
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-24">
          <Reveal className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
              FAQ
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Questions fréquentes
            </h2>
          </Reveal>

          <div className="mt-10 space-y-2">
            {faqs.map((faq, index) => (
              <Reveal key={faq.question} delay={index * 80}>
                <details className="group rounded-2xl border border-white/8 glass-card transition-all open:border-primary/20 open:bg-primary/4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-foreground/80 hover:text-foreground [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <Plus className="size-5 shrink-0 text-foreground/30 transition-transform duration-300 group-open:rotate-45" />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-7 text-foreground/45">{faq.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA Final ────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl p-px">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/50 via-[#7dd3fc]/30 to-[#c4b5fd]/50 animate-gradient" />
              {/* Content */}
              <div className="relative rounded-3xl bg-gradient-to-br from-[#0d1a08] to-[#080f1a] px-8 py-16 text-center">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-[#c4b5fd]/8 blur-[80px]" />
                <div className="relative mx-auto max-w-2xl">
                  <div className="mb-6 flex justify-center">
                    <Sparkles className="size-10 text-primary animate-glow-pulse" />
                  </div>
                  <h2 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    Prêt·e à reprendre le contrôle{" "}
                    <span className="text-gradient-lime">de votre planning ?</span>
                  </h2>
                  <p className="mt-4 text-lg text-foreground/50">
                    Créez votre compte gratuitement et planifiez votre première publication en quelques minutes.
                  </p>
                  <Button
                    asChild
                    className="group mt-8 h-12 rounded-full px-8 text-base font-semibold"
                  >
                    <Link href={primaryCta}>
                      {primaryCtaLabel}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <Logo />
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-foreground/40 transition-colors hover:text-foreground/70"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <p className="text-sm text-foreground/30">
            © {new Date().getFullYear()} Lemon.ai — Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
