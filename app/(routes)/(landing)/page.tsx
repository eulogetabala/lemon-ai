"use client";

/**
 * THESIS: One raw note becomes eight calibrated posts — the hero *is* the cockpit.
 * OWN-WORLD: Paper/ink/lemon/moss flats, deep-forest cockpit panels, hairline grids, no gradients.
 * STORY: Une note → huit déclinaisons → un seul calendrier.
 * FIRST VIEWPORT: Pulse badge, three masked headline lines with a lemon marker, then the studio card.
 * FORM: Studio SaaS, botanical signal-green accents, floating status badges.
 */

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Calendar,
  Check,
  CircleCheck,
  CirclePlay,
  Clock,
  Feather,
  Layers,
  LayoutGrid,
  Menu,
  Mic,
  PenLine,
  Plus,
  Radar,
  Repeat,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Logo from "@/components/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChannelTypeEnum, getChannelIcon } from "@/constants/channels";

const navItems = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Canaux", href: "#canaux" },
  { label: "Veille", href: "#veille" },
  { label: "Pour qui", href: "#pour-qui" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

type ChannelKey = "linkedin" | "x" | "instagram" | "tiktok";

const tabs: {
  key: ChannelKey;
  type: ChannelTypeEnum;
  label: string;
  desc: string;
}[] = [
  {
    key: "linkedin",
    type: ChannelTypeEnum.LINKEDIN,
    label: "LinkedIn",
    desc: "Posts longs, carrousels PDF, ton analytique.",
  },
  {
    key: "x",
    type: ChannelTypeEnum.TWITTER,
    label: "X / Twitter",
    desc: "Threads courts, hooks, rythme haché.",
  },
  {
    key: "instagram",
    type: ChannelTypeEnum.INSTAGRAM,
    label: "Instagram",
    desc: "Légendes, carrousels 4:5, hashtags utiles.",
  },
  {
    key: "tiktok",
    type: ChannelTypeEnum.TIKTOK,
    label: "TikTok",
    desc: "Scripts vidéo, hook de 3 s, plans b-roll.",
  },
];

const extraChannels = [
  { type: ChannelTypeEnum.THREADS, name: "Threads" },
  { type: ChannelTypeEnum.FACEBOOK, name: "Facebook" },
  { type: ChannelTypeEnum.BLUESKY, name: "Bluesky" },
  { type: ChannelTypeEnum.YOUTUBE, name: "YouTube" },
];

const allChannelTypes = [
  ChannelTypeEnum.LINKEDIN,
  ChannelTypeEnum.TWITTER,
  ChannelTypeEnum.INSTAGRAM,
  ChannelTypeEnum.TIKTOK,
  ChannelTypeEnum.THREADS,
  ChannelTypeEnum.FACEBOOK,
  ChannelTypeEnum.BLUESKY,
  ChannelTypeEnum.YOUTUBE,
];

const cockpitColumns = [
  {
    type: ChannelTypeEnum.LINKEDIN,
    name: "LinkedIn",
    handle: "Studio Lemon · mar. 09 h",
    tone: "light" as const,
    text: "Trois façons de recycler un contenu sans le répéter.\nLa troisième a doublé mes vues.",
    stats: [
      { label: "Signes", value: "1 420" },
      { label: "Format", value: "PDF" },
    ],
    note: "Hook 2 lignes · 8 pages",
  },
  {
    type: ChannelTypeEnum.TWITTER,
    name: "X / Twitter",
    handle: "Studio Lemon · mar. 12 h",
    tone: "dark" as const,
    text: "Recycler n’est pas reposter.\n1. Change l’angle\n2. Change la preuve\n3. Change le format",
    stats: [
      { label: "Signes", value: "264" },
      { label: "Format", value: "Thread" },
    ],
    note: "4 tweets · 1 visuel",
  },
  {
    type: ChannelTypeEnum.TIKTOK,
    name: "TikTok",
    handle: "Studio Lemon · mar. 18 h",
    tone: "light" as const,
    text: "[HOOK 0-3 s] Arrête de reposter tes contenus.\n[B-ROLL] écran scindé avant / après.\n[CALL] Tu as trois formats, pas un.",
    stats: [
      { label: "Durée", value: "28 s" },
      { label: "Format", value: "9:16" },
    ],
    note: "Script + 6 plans b-roll",
  },
];

const toneCards = [
  { label: "LinkedIn", rule: "Analytique & posé" },
  { label: "X / Threads", rule: "Tranchant & rythmé" },
  { label: "TikTok", rule: "Direct & incarné" },
];

const weekMatrix: { time: string; cells: (ChannelTypeEnum | null)[] }[] = [
  { time: "09 h", cells: [ChannelTypeEnum.LINKEDIN, null, ChannelTypeEnum.TWITTER, null] },
  { time: "12 h", cells: [null, ChannelTypeEnum.INSTAGRAM, null, ChannelTypeEnum.LINKEDIN] },
  { time: "18 h", cells: [ChannelTypeEnum.TIKTOK, null, ChannelTypeEnum.YOUTUBE, null] },
  { time: "21 h", cells: [null, ChannelTypeEnum.THREADS, null, ChannelTypeEnum.TWITTER] },
];

const profiles = [
  {
    icon: Feather,
    tag: "Profil A",
    title: "Créateurs & solopreneurs",
    line: "+400 %",
    lineLabel: "de régularité de publication",
    body: "Vous partez d’une note vocale le lundi matin. La semaine est bouclée avant le café.",
    highlight: false,
  },
  {
    icon: Users,
    tag: "Profil B",
    title: "Freelances & agences",
    line: "× 3 comptes",
    lineLabel: "clients pilotés sans friction",
    body: "Un espace par client, un calendrier partagé, une validation en un clic avant publication.",
    highlight: true,
  },
  {
    icon: Layers,
    tag: "Profil C",
    title: "Équipes marketing",
    line: "1-clic",
    lineLabel: "de la relecture à la publication",
    body: "Rédaction, validation, programmation. Chacun son rôle, une seule source de vérité.",
    highlight: false,
  },
];

type VeillePeriod = "mois" | "trimestre" | "annee";

const watchlist = [
  {
    name: "Atelier Noro",
    handle: "@atelier.noro",
    sector: "Design d’intérieur",
    platforms: [ChannelTypeEnum.LINKEDIN, ChannelTypeEnum.INSTAGRAM],
    followers: "42 800",
    delta: 12.4,
    lastPost: "il y a 6 h",
  },
  {
    name: "Studio Perch",
    handle: "@studio.perch",
    sector: "Photo & direction artistique",
    platforms: [ChannelTypeEnum.INSTAGRAM, ChannelTypeEnum.TIKTOK],
    followers: "118 400",
    delta: 3.1,
    lastPost: "hier",
  },
  {
    name: "Maison Klar",
    handle: "@maisonklar",
    sector: "Menuiserie sur mesure",
    platforms: [ChannelTypeEnum.LINKEDIN, ChannelTypeEnum.TWITTER],
    followers: "27 400",
    delta: -2.6,
    lastPost: "il y a 2 j",
  },
];

const veillePeriods: {
  key: VeillePeriod;
  label: string;
  scope: string;
  note: string;
  kpis: { label: string; value: string; delta: number }[];
  series: { label: string; impressions: number; display: string }[];
}[] = [
  {
    key: "mois",
    label: "Mensuel",
    scope: "Juillet → octobre 2026",
    note: "4 derniers mois",
    kpis: [
      { label: "Impressions", value: "5,49 M", delta: 17.1 },
      { label: "Engagement moyen", value: "4,4 %", delta: 0.6 },
      { label: "Posts relevés", value: "238", delta: 4.8 },
      { label: "Audience cumulée", value: "188 000", delta: 5.0 },
    ],
    series: [
      { label: "JUIL", impressions: 1_240_000, display: "1,24 M" },
      { label: "AOÛT", impressions: 1_080_000, display: "1,08 M" },
      { label: "SEPT", impressions: 1_460_000, display: "1,46 M" },
      { label: "OCT", impressions: 1_710_000, display: "1,71 M" },
    ],
  },
  {
    key: "trimestre",
    label: "Trimestriel",
    scope: "T4 2025 → T3 2026",
    note: "4 derniers trimestres",
    kpis: [
      { label: "Impressions", value: "14,5 M", delta: 29.0 },
      { label: "Engagement moyen", value: "4,3 %", delta: 0.7 },
      { label: "Posts relevés", value: "698", delta: 10.3 },
      { label: "Audience cumulée", value: "188 000", delta: 23.7 },
    ],
    series: [
      { label: "T4 25", impressions: 3_100_000, display: "3,10 M" },
      { label: "T1 26", impressions: 3_600_000, display: "3,60 M" },
      { label: "T2 26", impressions: 3_400_000, display: "3,40 M" },
      { label: "T3 26", impressions: 4_400_000, display: "4,40 M" },
    ],
  },
  {
    key: "annee",
    label: "Annuel",
    scope: "2022 → 2025",
    note: "4 exercices clôturés",
    kpis: [
      { label: "Impressions", value: "49,5 M", delta: 31.0 },
      { label: "Engagement moyen", value: "4,1 %", delta: 0.5 },
      { label: "Posts relevés", value: "668", delta: 9.2 },
      { label: "Audience cumulée", value: "154 000", delta: 30.5 },
    ],
    series: [
      { label: "2022", impressions: 6_900_000, display: "6,9 M" },
      { label: "2023", impressions: 9_800_000, display: "9,8 M" },
      { label: "2024", impressions: 14_200_000, display: "14,2 M" },
      { label: "2025", impressions: 18_600_000, display: "18,6 M" },
    ],
  },
];

const plans = [
  {
    name: "Gratuit",
    monthly: 0,
    annual: 0,
    tagline: "Pour tester le moteur d’adaptation.",
    cta: "Commencer",
    highlight: false,
    features: [
      { label: "3 canaux connectés", active: true },
      { label: "30 publications programmées / mois", active: true },
      { label: "Adaptation automatique des formats", active: true },
      { label: "Calendrier unifié", active: true },
      { label: "Plusieurs espaces de travail", active: false },
    ],
  },
  {
    name: "Pro",
    monthly: 12000,
    annual: 9600,
    tagline: "Pour publier partout, sans y penser.",
    cta: "Passer à Pro",
    highlight: true,
    features: [
      { label: "8 canaux connectés", active: true },
      { label: "Publications illimitées", active: true },
      { label: "Moteur d’adaptation de ton", active: true },
      { label: "Auto-Pilot & créneaux intelligents", active: true },
      { label: "Bibliothèque de contenus réutilisables", active: true },
    ],
  },
  {
    name: "Équipe",
    monthly: 29000,
    annual: 23200,
    tagline: "Pour les studios et les agences.",
    cta: "Parler à l’équipe",
    highlight: false,
    features: [
      { label: "Tout le plan Pro", active: true },
      { label: "Jusqu’à 10 espaces de travail", active: true },
      { label: "Rôles, relecture & validation", active: true },
      { label: "Journal d’activité exportable", active: true },
      { label: "Support prioritaire", active: true },
    ],
  },
];

const faqs = [
  {
    q: "En quoi Lemon.ai est différent d’un simple planificateur ?",
    a: "Un planificateur place un contenu déjà écrit. Lemon.ai part d’une matière brute — une note vocale, un lien, un brouillon — et produit une déclinaison native par canal : longueur, ton, format, hashtags et créneau.",
  },
  {
    q: "Mes publications sont-elles vraiment adaptées à chaque réseau ?",
    a: "Oui. Chaque canal a ses règles internes : nombre de caractères, structure du hook, ratio d’image, densité de hashtags. Le moteur les applique avant l’envoi, et vous validez ce qui part.",
  },
  {
    q: "Est-ce que je garde le contrôle sur le calendrier ?",
    a: "Toujours. L’Auto-Pilot propose des créneaux, vous les déplacez d’un glisser-déposer ou les verrouillez. Rien n’est publié sans votre validation.",
  },
  {
    q: "Quels canaux sont disponibles aujourd’hui ?",
    a: "LinkedIn, X / Twitter, Instagram, TikTok, Threads, Facebook, Bluesky et YouTube. Tous inclus dans le plan Pro, sans module supplémentaire.",
  },
];

const footerColumns = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#fonctionnalites" },
      { label: "Canaux", href: "#canaux" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "Nouveautés", href: "#fonctionnalites" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Guide de démarrage", href: "#fonctionnalites" },
      { label: "Pour qui", href: "#pour-qui" },
      { label: "Statut du service", href: "#" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Confidentialité", href: "#" },
      { label: "Conditions", href: "#" },
      { label: "Licence", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

// Format specs shown per channel — no fake AI checks
const channelSpecs: Record<
  ChannelKey,
  { label: string; color: string }[]
> = {
  linkedin: [
    { label: "Max 3 000 signes", color: "bg-[#E8F0FE] text-[#1A4A8A]" },
    { label: "Carrousel PDF natif", color: "bg-mist text-moss" },
    { label: "Ton analytique", color: "bg-mist text-moss" },
  ],
  x: [
    { label: "280 signes / tweet", color: "bg-ink/8 text-ink" },
    { label: "Thread · 4 tweets", color: "bg-ink/8 text-ink" },
    { label: "Hook isolé tweet 1", color: "bg-ink/8 text-ink" },
  ],
  instagram: [
    { label: "Max 2 200 signes", color: "bg-[#FDE8F4] text-[#8A1A5A]" },
    { label: "Ratio 4:5 optimisé", color: "bg-[#FDE8F4] text-[#8A1A5A]" },
    { label: "≤ 8 hashtags", color: "bg-[#FDE8F4] text-[#8A1A5A]" },
  ],
  tiktok: [
    { label: "Script 9:16", color: "bg-[#FFE8E8] text-[#8A1A1A]" },
    { label: "Hook < 3 secondes", color: "bg-[#FFE8E8] text-[#8A1A1A]" },
    { label: "Plans b-roll inclus", color: "bg-[#FFE8E8] text-[#8A1A1A]" },
  ],
};

const previews: Record<
  ChannelKey,
  {
    channelLabel: string;
    metric: string;
    charCount: number;
    charMax: number;
    format: string;
    body: ReactNode;
  }
> = {
  linkedin: {
    badge: "Simulation en direct · LinkedIn",
    metric: "1 420 / 3 000 caractères",
    format: "Post long + carrousel PDF",
    body: (
      <>
        <p className="text-[13.5px] leading-relaxed text-ink">
          Le vrai coût de la publication manuelle n’est pas le temps de
          rédaction. C’est la dispersion.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
          Trois réseaux, trois formats, trois horaires. On réécrit la même idée
          en changeant les emojis. Et la semaine suivante, on recommence.
        </p>
        <p className="mt-3 text-[13.5px] font-semibold leading-relaxed text-moss">
          Une note vocale. Huit déclinaisons. Un seul calendrier.
        </p>
      </>
    ),
    attachment: "carrousel-8-pages.pdf",
    checks: [
      "Accroche tenue sur deux lignes",
      "Ton analytique appliqué",
      "Hashtags LinkedIn conservés",
    ],
  },
  x: {
    badge: "Simulation en direct · X (Twitter)",
    metric: "264 / 280 caractères · tweet 1/4",
    format: "Thread de 4 tweets",
    body: (
      <>
        <p className="text-[13.5px] font-semibold leading-relaxed text-ink">
          Recycler un contenu n’est pas le reposter.
        </p>
        <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-mute">
          {"1. Change l’angle\n2. Change la preuve\n3. Change le format"}
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-moss">
          La même idée, quatre entrées différentes. 🧵
        </p>
      </>
    ),
    attachment: "visuel-thread-16x9.png",
    checks: [
      "280 caractères respectés",
      "Hook isolé en tweet 1",
      "Rythme haché appliqué",
    ],
  },
  instagram: {
    badge: "Simulation en direct · Instagram",
    metric: "840 / 2 200 caractères · 8 hashtags",
    format: "Carrousel 1080 × 1350",
    body: (
      <>
        <p className="text-[13.5px] font-semibold leading-relaxed text-ink">
          Trois façons de recycler un contenu sans le répéter 👇
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
          La troisième est celle que personne n’ose faire : garder la même
          preuve, mais changer complètement le format.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-moss">
          #creationdecontenu #studio #productivite #linkedin
        </p>
      </>
    ),
    attachment: "carrousel-4x5-slide-1.png",
    checks: [
      "Ratio 4:5 appliqué",
      "Première ligne = hook visible",
      "Hashtags limités à 8",
    ],
  },
  tiktok: {
    badge: "Simulation en direct · TikTok",
    metric: "Script vidéo · 28 secondes",
    format: "Vertical 9:16",
    body: (
      <>
        <p className="tag-code text-mute">[HOOK 0-3 s]</p>
        <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-ink">
          « Arrête de reposter tes contenus. »
        </p>
        <p className="mt-3 tag-code text-mute">[B-ROLL]</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
          Écran scindé avant / après, un seul geste à l’écran.
        </p>
        <p className="mt-3 tag-code text-mute">[CALL 25-28 s]</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-moss">
          « Tu as trois formats, pas un. »
        </p>
      </>
    ),
    attachment: "storyboard-9x16.pdf",
    checks: [
      "Hook dans les 3 premières secondes",
      "Sous-titres brûlés",
      "6 plans b-roll listés",
    ],
  },
};

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
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
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

function Tag({
  children,
  tone = "lemon",
  className,
}: {
  children: ReactNode;
  tone?: "lemon" | "mist" | "forest";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tag-code inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        tone === "lemon" && "bg-lemon text-ink",
        tone === "mist" && "bg-mist text-moss",
        tone === "forest" && "bg-white/10 text-lemon",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({
  tag,
  title,
  lead,
  tone = "light",
  align = "left",
}: {
  tag: string;
  title: ReactNode;
  lead?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <Tag tone={tone === "dark" ? "forest" : "lemon"}>{tag}</Tag>
      <h2
        className={cn(
          "mt-5 text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.035em]",
          tone === "dark" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-4 text-[15px] leading-relaxed sm:text-base",
            tone === "dark" ? "text-sage" : "text-mute",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

function ChannelGlyph({
  type,
  className,
}: {
  type: ChannelTypeEnum;
  className?: string;
}) {
  const icon = getChannelIcon(type);
  if (!icon) return null;
  return <HugeiconsIcon icon={icon} className={cn("size-4", className)} />;
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [activeTab, setActiveTab] = useState<ChannelKey>("linkedin");
  const [veillePeriod, setVeillePeriod] = useState<VeillePeriod>("mois");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoOpen, setDemoOpen] = useState(false);

  const primaryCta = isSignedIn ? "/schedule" : "/sign-up";
  const primaryCtaLabel = isSignedIn
    ? "Ouvrir mon studio"
    : "Commencer gratuitement";
  const annual = billing === "annual";
  const preview = previews[activeTab];
  const activeVeille =
    veillePeriods.find((p) => p.key === veillePeriod) ?? veillePeriods[0];
  const veilleMax = Math.max(
    ...activeVeille.series.map((point) => point.impressions),
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ---------------------------------------------------------------- NAV */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo />
            <span className="tag-code hidden rounded-full border border-hairline px-2 py-0.5 text-mute sm:inline-flex">
              v2.6
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-mute transition-colors hover:bg-mist/70 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <div className="hidden sm:block">
                <UserButton />
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-mute transition-colors hover:text-ink sm:inline-flex"
              >
                Connexion
              </Link>
            )}
            <Link
              href={primaryCta}
              className="lime-glow inline-flex items-center gap-2 rounded-full bg-lemon px-4 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 sm:px-5"
            >
              {primaryCtaLabel}
              <ArrowRight className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Ouvrir le menu"
              className="inline-flex size-10 items-center justify-center rounded-full border border-hairline text-ink lg:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-hairline bg-paper px-5 pb-5 pt-3 lg:hidden">
            <nav className="flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-hairline/70 py-3 text-sm font-semibold text-ink"
                >
                  {item.label}
                </Link>
              ))}
              {!isSignedIn && (
                <Link
                  href="/sign-in"
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-sm font-semibold text-moss"
                >
                  Connexion
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------- HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div
          aria-hidden
          className="grid-lines pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1.5">
              <span className="size-2 rounded-full bg-[#27C93F] animate-pulse-soft" />
              <span className="tag-code text-moss">
                Moteur d’adaptation 2026 · 8 canaux
              </span>
            </div>

            <h1 className="mt-7 text-[clamp(2.6rem,7.2vw,4.75rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink">
              <span className="line-mask">
                <span
                  className="line-in"
                  style={{ "--d": "0s" } as CSSProperties}
                >
                  Une idée.
                </span>
              </span>
              <span className="line-mask">
                <span
                  className="line-in"
                  style={{ "--d": "0.1s" } as CSSProperties}
                >
                  Huit réseaux.
                </span>
              </span>
              <span className="line-mask">
                <span
                  className="line-in"
                  style={{ "--d": "0.2s" } as CSSProperties}
                >
                  Un seul <span className="hi-swipe px-1.5">geste</span>.
                </span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-mute sm:text-[17px]">
              Une idée brute. Lemon.ai la découpe, la réécrit pour chaque
              réseau et la programme au bon créneau. Vous validez — ça part.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primaryCta}
                className="lime-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-lemon px-6 py-3.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                {primaryCtaLabel}
                <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:border-ink/30 sm:w-auto"
              >
                <CirclePlay className="size-4" />
                Explorer le simulateur
              </button>
            </div>

            {/* Floating stat counters */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              {[
                { num: "08", label: "canaux natifs", icon: "●" },
                { num: "−15h", label: "par semaine", icon: "◆" },
                { num: "1-clic", label: "pour valider", icon: "✓" },
              ].map((stat) => (
                <div
                  key={stat.num}
                  className="flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(17,20,16,0.06)]"
                >
                  <span className="text-[22px] font-extrabold leading-none tracking-[-0.04em] text-ink tabular-nums">
                    {stat.num}
                  </span>
                  <span className="tag-code text-mute">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {allChannelTypes.map((type) => (
                    <span
                      key={type}
                      className="flex size-7 items-center justify-center rounded-full border border-hairline bg-white"
                    >
                      <ChannelGlyph type={type} className="size-3.5" />
                    </span>
                  ))}
                </div>
                <span className="tag-code text-mute">8 canaux natifs</span>
              </div>
              <span className="hidden size-1 rounded-full bg-ink/20 sm:block" />
              <span className="tag-code text-mute">Aucune carte bancaire</span>
              <span className="hidden size-1 rounded-full bg-ink/20 sm:block" />
              <span className="tag-code text-mute">
                Mise en place en 60 secondes
              </span>
            </div>
          </div>

          {/* ------------------------------------------------- COCKPIT CARD */}
          <div className="relative mx-auto mt-14 max-w-6xl">
            <div className="float-soft absolute -top-5 right-4 z-20 hidden items-center gap-2 rounded-2xl bg-forest px-4 py-2.5 text-white shadow-[0_18px_36px_-14px_rgba(12,43,30,0.5)] sm:flex">
              <Clock className="size-4 text-lemon" />
              <span className="text-sm font-extrabold tracking-tight">
                −15 h
              </span>
              <span className="tag-code text-sage">par semaine</span>
            </div>
            <div className="float-soft-slow absolute -bottom-5 left-4 z-20 hidden items-center gap-2 rounded-2xl border border-hairline bg-white px-4 py-2.5 sm:flex">
              <CircleCheck className="size-4 text-[#27C93F]" />
              <span className="text-sm font-bold text-ink">
                Validation en 1 clic
              </span>
            </div>

            <div className="forest-card-glow overflow-hidden rounded-xl border-2 border-forest bg-forest p-2">
              <div className="overflow-hidden rounded-lg bg-paper">
                {/* window chrome */}
                <div className="flex items-center justify-between gap-3 border-b border-hairline bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                      <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                      <span className="size-2.5 rounded-full bg-[#28C840]" />
                    </div>
                    <span className="tag-code text-mute">
                      Studio unifié Lemon.ai
                    </span>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="tag-code hidden text-mute md:inline">
                      Adapté aux algorithmes 2026
                    </span>
                    <span className="tag-code inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-moss">
                      <span className="size-1.5 rounded-full bg-[#27C93F]" />
                      Connecté 8/8
                    </span>
                    <span className="tag-code rounded-full bg-forest px-3 py-1 text-lemon">
                      Tout programmer
                    </span>
                  </div>
                </div>

                {/* source bar */}
                <div className="flex flex-col gap-3 border-b border-hairline bg-white px-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lemon">
                    <Mic className="size-5 text-ink" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="tag-code text-mute">
                      Note source brute · 00:14
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">
                      « J’ai testé trois façons de recycler un contenu… »
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-paper transition-transform hover:-translate-y-0.5"
                  >
                    <PenLine className="size-4 text-lemon" />
                    Générer la galaxie
                  </button>
                </div>

                {/* three channels */}
                <div className="grid gap-3 p-3 sm:grid-cols-3">
                  {cockpitColumns.map((col) => (
                    <div
                      key={col.name}
                      className={cn(
                        "flex flex-col rounded-lg border p-4",
                        col.tone === "dark"
                          ? "border-forest bg-forest text-white"
                          : "border-hairline bg-white",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ChannelGlyph
                          type={col.type}
                          className={cn(
                            "size-4",
                            col.tone === "dark" ? "text-lemon" : "text-ink",
                          )}
                        />
                        <span className="text-sm font-bold tracking-tight">
                          {col.name}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 tag-code",
                          col.tone === "dark" ? "text-sage/80" : "text-mute",
                        )}
                      >
                        {col.handle}
                      </p>
                      <p
                        className={cn(
                          "mt-3 flex-1 whitespace-pre-line text-[12.5px] leading-relaxed",
                          col.tone === "dark" ? "text-sage" : "text-mute",
                        )}
                      >
                        {col.text}
                      </p>
                      <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-3"
                        style={{
                          borderColor:
                            col.tone === "dark"
                              ? "rgba(163,193,178,0.25)"
                              : "var(--hairline)",
                        }}
                      >
                        {col.stats.map((s) => (
                          <div key={s.label}>
                            <dt
                              className={cn(
                                "tag-code",
                                col.tone === "dark"
                                  ? "text-sage/70"
                                  : "text-mute",
                              )}
                            >
                              {s.label}
                            </dt>
                            <dd className="mt-0.5 text-sm font-extrabold tracking-tight">
                              {s.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p
                        className={cn(
                          "mt-3 flex items-center gap-1.5 tag-code",
                          col.tone === "dark" ? "text-lemon" : "text-moss",
                        )}
                      >
                        <Check className="size-3.5" />
                        {col.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ BENTO */}
      <section
        id="fonctionnalites"
        className="border-b border-hairline py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">

          {/* Section header — split title left / lead right */}
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <Tag tone="lemon">02 · Fonctionnalités architecturées</Tag>
                <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.038em] text-ink">
                  Tout pour publier sans stress.{" "}
                  <span className="text-moss">
                    Une architecture pensée pour le flux.
                  </span>
                </h2>
              </div>
              <div className="lg:col-span-5">
                <p className="text-[15px] leading-relaxed text-mute">
                  Chaque module de Lemon.ai a été taillé pour supprimer la
                  friction entre l&apos;éclair de génie créatif et la mise en
                  ligne effective.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Row 1 */}
          <div className="mt-10 grid gap-4 lg:grid-cols-12">

            {/* Card 01 — Moteur IA */}
            <Reveal className="lg:col-span-7" delay={40}>
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-white p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-lemon text-[15px] font-extrabold text-ink">
                    01
                  </span>
                  <span className="tag-code text-mute">Adaptation cognitive</span>
                </div>

                <h3 className="mt-7 text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[24px]">
                  Moteur IA Polyglotte &amp; Contextuel
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-mute">
                  L&apos;IA n&apos;est pas un simple traducteur de texte : elle
                  maîtrise la sociologie propre à chaque réseau. Votre texte
                  acquiert la rigueur formelle sur LinkedIn, la vivacité
                  percutante sur Twitter et l&apos;émotion narrative sur
                  Instagram.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Ton LinkedIn",
                      dot: "bg-[#0A66C2]",
                      desc: "Structure en bullet points, accroche interrogative, focus sur le ROI.",
                    },
                    {
                      label: "Ton X / Threads",
                      dot: "bg-ink",
                      desc: "Phrases courtes, rythme syncopé, verbes d'action tranchants.",
                    },
                    {
                      label: "Ton TikTok",
                      dot: "bg-stamp",
                      desc: "Pattern interrupt immédiat, découpage sonore et instructions de cadrage.",
                    },
                  ].map((tone) => (
                    <div
                      key={tone.label}
                      className="rounded-lg border border-hairline bg-paper p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-ink">
                          {tone.label}
                        </p>
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            tone.dot,
                          )}
                        />
                      </div>
                      <p className="mt-2 text-[12px] leading-snug text-mute">
                        {tone.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 border-t border-hairline pt-5 mt-6">
                  <p className="text-[12.5px] font-medium text-mute">
                    Préservation automatique de votre voix de marque
                  </p>
                  <Link
                    href={primaryCta}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-moss transition-colors hover:text-ink"
                  >
                    Explorer le moteur
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Card 02 — Calendrier Universel (dark) */}
            <Reveal className="lg:col-span-5" delay={80}>
              <div className="dark-grid-lines flex h-full flex-col rounded-xl bg-forest p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-lemon text-[15px] font-extrabold text-ink">
                    02
                  </span>
                  <span className="tag-code text-lemon/60">Vue macro</span>
                </div>

                <h3 className="mt-7 text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-white">
                  Calendrier Universel
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-sage">
                  Visualisez le mois complet d&apos;un seul coup d&apos;œil.
                  Glissez-déposez vos publications et ajustez instantanément
                  les synchronisations.
                </p>

                {/* Calendar mini */}
                <div className="mt-5 grid grid-cols-4 gap-1.5">
                  {["LUN 16", "MAR 17", "MER 18", "JEU 19"].map((d) => (
                    <span
                      key={d}
                      className="tag-code text-center text-[9px] text-sage/60"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex-1 grid grid-cols-4 gap-1.5">
                  {[
                    { label: "in 09h", highlight: false },
                    { label: "𝕏 12h", highlight: false },
                    { label: "ig 18h", highlight: true },
                    { label: "tk 21h", highlight: false },
                  ].map((slot) => (
                    <div
                      key={slot.label}
                      className={cn(
                        "flex items-center justify-center rounded-md border py-2.5",
                        slot.highlight
                          ? "border-lemon bg-lemon"
                          : "border-white/12 bg-white/[0.06]",
                      )}
                    >
                      <span
                        className={cn(
                          "tag-code text-[9px] font-bold",
                          slot.highlight ? "text-ink" : "text-sage/80",
                        )}
                      >
                        {slot.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-5 flex items-center justify-between gap-3 border-t pt-4"
                  style={{ borderColor: "rgba(163,193,178,0.18)" }}
                >
                  <p className="text-[12px] font-medium text-sage/60">
                    Zéro conflit de programmation
                  </p>
                  <span className="text-[12px] font-bold text-lemon">
                    Sync bidirectionnelle
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Row 2 */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12">

            {/* Card 03 — Adaptation Granulaire */}
            <Reveal className="lg:col-span-4" delay={40}>
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-white p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-lemon text-[15px] font-extrabold text-ink">
                    03
                  </span>
                  <span className="tag-code text-mute">Formats natifs</span>
                </div>

                <h3 className="mt-7 text-[20px] font-extrabold leading-tight tracking-[-0.025em] text-ink">
                  Adaptation Granulaire
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
                  Compteurs de signes en temps réel, ratio d&apos;images
                  optimisé pour smartphone (4:5, 9:16, 1:1), et balises alt
                  générées automatiquement.
                </p>

                <div className="mt-6 overflow-hidden rounded-lg border border-hairline bg-paper">
                  {[
                    { label: "Ratio LinkedIn Carrousel", value: "1080 × 1350 px" },
                    { label: "X Caractères max", value: "280 / 280 (100%)" },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3",
                        i > 0 && "border-t border-hairline",
                      )}
                    >
                      <span className="text-[12.5px] font-semibold text-ink">
                        {row.label}
                      </span>
                      <span className="text-[12.5px] font-bold text-moss tabular-nums">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-5 mt-6">
                  <p className="text-[12px] font-medium text-mute">
                    Prévisualisation mobile pixel-perfect
                  </p>
                  <Smartphone className="size-5 text-mute" />
                </div>
              </div>
            </Reveal>

            {/* Card 04 — Automatisation & Planification */}
            <Reveal className="lg:col-span-8" delay={80}>
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-white p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-lemon text-[15px] font-extrabold text-ink">
                    04
                  </span>
                  <span className="tag-code text-mute">
                    Algorithme smart-dispatch
                  </span>
                </div>

                <h3 className="mt-7 text-[20px] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[22px]">
                  Automatisation &amp; Planification Intelligente
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-mute">
                  Lemon.ai analyse les pics d&apos;attention de votre propre
                  audience en Afrique francophone, Europe et au-delà. Il cale
                  la diffusion à la minute précise où votre reach potentiel est
                  maximal.
                </p>

                {/* Recommendation card */}
                <div className="mt-6 flex items-center gap-4 rounded-xl border border-hairline bg-paper px-4 py-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist">
                    <Clock className="size-5 text-moss" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-snug text-ink">
                      Créneau recommandé pour Abidjan &amp; Dakar (GMT)
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-mute">
                      Pic d&apos;engagement LinkedIn : Mardi à 08h45 · +34% de portée
                    </p>
                  </div>
                  <Link
                    href={primaryCta}
                    className="lime-glow inline-flex shrink-0 items-center rounded-full bg-lemon px-4 py-2.5 text-[12px] font-bold text-ink transition-transform hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    Activer Auto-Pilot
                  </Link>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-5 mt-6">
                  <p className="text-[12px] font-medium text-mute">
                    Support natif des fuseaux horaires multiples
                  </p>
                  <span className="text-[12px] font-bold text-ink">
                    0 latence sur les API officielles
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </section>

      {/* --------------------------------------------------------- CHANNELS */}
      <section
        id="canaux"
        className="border-b border-hairline bg-white py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionHead
              tag="Canaux"
              title={
                <>
                  8 canaux natifs.
                  <br className="hidden sm:block" /> Zéro compromis.
                </>
              }
              lead="Chaque réseau a ses propres règles de format, de longueur et de ton. Lemon.ai les applique automatiquement à votre contenu."
            />
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-12">

            {/* Left — tab list */}
            <Reveal className="lg:col-span-5">
              <div className="flex flex-col gap-2">
                {tabs.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-200",
                        active
                          ? "border-forest bg-forest text-white shadow-[0_4px_20px_rgba(12,43,30,0.18)]"
                          : "border-hairline bg-paper text-ink hover:border-ink/20 hover:bg-white",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                          active ? "bg-lemon text-ink" : "bg-mist text-moss",
                        )}
                      >
                        <ChannelGlyph type={tab.type} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold tracking-tight">
                          {tab.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-[12px] leading-snug",
                            active ? "text-sage" : "text-mute",
                          )}
                        >
                          {tab.desc}
                        </span>
                      </span>
                      <ArrowRight
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active ? "text-lemon" : "text-mute",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-hairline bg-paper px-4 py-3.5">
                <p className="tag-code text-mute">Aussi inclus</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {extraChannels.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink"
                    >
                      <ChannelGlyph type={c.type} className="size-3.5" />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Right — format preview card */}
            <Reveal className="lg:col-span-7" delay={60}>
              <div
                key={activeTab}
                className="animate-slide-in-up flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-white"
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-mist text-moss">
                      <ChannelGlyph
                        type={tabs.find((t) => t.key === activeTab)!.type}
                        className="size-4"
                      />
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-ink">
                        {preview.channelLabel}
                      </p>
                      <p className="tag-code text-mute">{preview.format}</p>
                    </div>
                  </div>
                  <span className="tag-code rounded-full bg-mist px-3 py-1 text-moss">
                    {preview.metric}
                  </span>
                </div>

                {/* Character progress bar (LinkedIn / X / Instagram only) */}
                {preview.charMax > 0 && (
                  <div className="border-b border-hairline px-5 py-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-mist">
                      <div
                        className="h-full rounded-full bg-moss transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (preview.charCount / preview.charMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Post body */}
                <div className="flex-1 px-5 py-5">
                  <div className="rounded-xl border border-hairline bg-paper p-4">
                    {preview.body}
                  </div>
                </div>

                {/* Format specs footer */}
                <div className="border-t border-hairline bg-paper px-5 py-4">
                  <p className="tag-code mb-3 text-mute">Règles du canal</p>
                  <div className="flex flex-wrap gap-2">
                    {channelSpecs[activeTab].map((spec) => (
                      <span
                        key={spec.label}
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1.5 text-[11.5px] font-bold",
                          spec.color,
                        )}
                      >
                        {spec.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={primaryCta}
                      className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-bold text-lemon transition-transform hover:-translate-y-0.5"
                    >
                      Connecter ce canal
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ COMPETITIVE WATCH */}
      <section id="veille" className="border-b border-hairline py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <Reveal className="lg:col-span-7">
              <SectionHead
                tag="Veille concurrentielle"
                title="Ce que fait le marché, pendant que vous écrivez."
                lead="Ajoutez les comptes qui comptent — concurrents, clients, références. Lemon.ai relève leurs publications chaque matin, puis vous rend la lecture : audience, impressions, engagement. Mensuel, trimestriel ou annuel, au choix."
              />
            </Reveal>

            <Reveal className="lg:col-span-5" delay={60}>
              <div className="rounded-lg border border-hairline bg-white p-5">
                <p className="tag-code text-mute">Ce qui est relevé</p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Audience et progression par plateforme",
                    "Impressions, likes, commentaires, partages",
                    "Cadence de publication et formats qui prennent",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13.5px] font-semibold leading-snug text-ink"
                    >
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#27C93F]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-12">
            {/* watchlist */}
            <Reveal className="lg:col-span-4">
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                  <span className="inline-flex items-center gap-2 tag-code text-moss">
                    <Radar className="size-4" />
                    Liste suivie
                  </span>
                  <span className="tag-code text-mute">
                    {watchlist.length} comptes
                  </span>
                </div>

                <div className="flex-1 divide-y divide-hairline">
                  {watchlist.map((account) => (
                    <div
                      key={account.handle}
                      className="flex items-start gap-3 px-4 py-4"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-[13px] font-extrabold text-ink">
                        {account.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-extrabold tracking-tight text-ink">
                          {account.name}
                        </p>
                        <p className="truncate text-[12px] font-medium text-mute">
                          {account.handle} · {account.sector}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          {account.platforms.map((platform) => (
                            <span
                              key={platform}
                              className="flex size-6 items-center justify-center rounded-md bg-mist text-moss"
                            >
                              <ChannelGlyph type={platform} className="size-3.5" />
                            </span>
                          ))}
                          <span className="tag-code ml-1 text-mute">
                            {account.lastPost}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-extrabold tabular-nums text-ink">
                          {account.followers}
                        </p>
                        <p
                          className={cn(
                            "tag-code mt-1 inline-flex items-center gap-0.5",
                            account.delta > 0 ? "text-moss" : "text-stamp",
                          )}
                        >
                          {account.delta > 0 ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          {account.delta > 0 ? "+" : "−"}
                          {Math.abs(account.delta).toFixed(1).replace(".", ",")} %
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-hairline bg-paper px-4 py-3">
                  <p className="tag-code text-mute">
                    Relevé automatique · chaque matin 06 h 00
                  </p>
                </div>
              </div>
            </Reveal>

            {/* stats */}
            <Reveal className="lg:col-span-8" delay={70}>
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                  <span className="tag-code text-mute">
                    Relevé consolidé de la liste
                  </span>
                  <div className="flex items-center gap-1 rounded-full bg-mist p-1">
                    {veillePeriods.map((period) => {
                      const active = period.key === veillePeriod;
                      return (
                        <button
                          key={period.key}
                          type="button"
                          onClick={() => setVeillePeriod(period.key)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                            active
                              ? "bg-forest text-lemon"
                              : "text-moss hover:text-ink",
                          )}
                        >
                          {period.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="tag-code text-ink">{activeVeille.scope}</p>
                    <p className="tag-code text-mute">{activeVeille.note}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {activeVeille.kpis.map((kpi) => (
                      <div
                        key={kpi.label}
                        className="rounded-md border border-hairline bg-paper px-3 py-2.5"
                      >
                        <p className="tag-code truncate text-mute">
                          {kpi.label}
                        </p>
                        <p className="mt-1 text-[17px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ink">
                          {kpi.value}
                        </p>
                        <p
                          className={cn(
                            "tag-code mt-1.5 inline-flex items-center gap-0.5",
                            kpi.delta > 0 ? "text-moss" : "text-stamp",
                          )}
                        >
                          {kpi.delta > 0 ? "+" : "−"}
                          {Math.abs(kpi.delta).toFixed(1).replace(".", ",")} %
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-1 flex-col justify-end">
                    <div className="flex h-40 items-end gap-2 sm:gap-4">
                      {activeVeille.series.map((point, i) => {
                        const last = i === activeVeille.series.length - 1;
                        return (
                          <div
                            key={point.label}
                            className="flex h-full flex-1 flex-col justify-end"
                          >
                            <span
                              className={cn(
                                "tag-code mb-1.5 text-center tabular-nums",
                                last ? "text-ink" : "text-mute",
                              )}
                            >
                              {point.display}
                            </span>
                            <div
                              className={cn(
                                "w-full rounded-t-md transition-[height] duration-500 ease-out",
                                last ? "bg-lemon" : "bg-mist",
                              )}
                              style={{
                                height: `${Math.max(
                                  10,
                                  (point.impressions / veilleMax) * 82,
                                )}%`,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-2 border-t border-hairline pt-2 sm:gap-4">
                      {activeVeille.series.map((point) => (
                        <span
                          key={point.label}
                          className="tag-code flex-1 text-center text-[10px] text-mute"
                        >
                          {point.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                    <p className="text-[12.5px] font-medium text-mute">
                      Export CSV, XLSX ou PDF — une ligne par compte et par
                      période.
                    </p>
                    <Link
                      href={primaryCta}
                      className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-lemon transition-transform hover:-translate-y-0.5"
                    >
                      Suivre mes concurrents
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- WHO */}
      <section
        id="pour-qui"
        className="dark-grid-lines border-b border-hairline bg-forest py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionHead
              tag="Pour qui"
              title={
                <>
                  Pensé pour ceux qui publient.
                  <br className="hidden sm:block" />
                  <span className="text-lemon">Et qui n'ont pas de temps à perdre.</span>
                </>
              }
              lead="Le même studio, trois rythmes de travail. Choisissez celui qui ressemble au vôtre."
              tone="dark"
              align="center"
            />
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {profiles.map((profile, i) => (
              <Reveal key={profile.tag} delay={i * 70}>
                <div
                  className={cn(
                    "flex h-full flex-col rounded-lg border p-6",
                    profile.highlight
                      ? "border-2 border-lemon/40 bg-white/[0.09]"
                      : "border-white/12 bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-lemon text-ink">
                      <profile.icon className="size-5" />
                    </span>
                    <span className="tag-code text-sage/70">
                      {profile.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[19px] font-extrabold tracking-[-0.02em] text-white">
                    {profile.title}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-lemon">
                      {profile.line}
                    </span>
                    <span className="text-[12.5px] leading-snug text-sage">
                      {profile.lineLabel}
                    </span>
                  </div>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-sage/85">
                    {profile.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- PRICING */}
      <section
        id="tarifs"
        className="border-b border-hairline py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <SectionHead
              tag="Tarifs"
              title={
                <>
                  Investissez dans votre temps.
                  <br className="hidden sm:block" /> Des tarifs clairs, adaptés à nos réalités.
                </>
              }
              lead="Sans engagement. Changez de plan quand votre rythme change."
              align="center"
            />
          </Reveal>

          <Reveal delay={60}>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  aria-pressed={!annual}
                  className={cn(
                    "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                    !annual
                      ? "bg-forest text-white"
                      : "text-mute hover:text-ink",
                  )}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  aria-pressed={annual}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                    annual
                      ? "bg-forest text-white"
                      : "text-mute hover:text-ink",
                  )}
                >
                  Annuel
                  <span className="tag-code rounded-full bg-lemon px-2 py-0.5 text-ink">
                    −20 %
                  </span>
                </button>
              </div>
            </div>
          </Reveal>

          <div className="mt-10 grid items-start gap-4 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 70}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-lg border p-6",
                    plan.highlight
                      ? "forest-card-glow border-2 border-lemon bg-forest text-white lg:-translate-y-3"
                      : "border-hairline bg-white text-ink",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-6 tag-code rounded-full bg-lemon px-3 py-1 text-ink">
                      Le plus populaire
                    </span>
                  )}

                  <h3
                    className={cn(
                      "text-[17px] font-extrabold tracking-tight",
                      plan.highlight ? "text-white" : "text-ink",
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-snug",
                      plan.highlight ? "text-sage" : "text-mute",
                    )}
                  >
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "text-[34px] font-extrabold leading-none tracking-[-0.04em] tabular-nums",
                        plan.highlight ? "text-lemon" : "text-ink",
                      )}
                    >
                      {(annual ? plan.annual : plan.monthly).toLocaleString(
                        "fr-FR",
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[12.5px] font-semibold",
                        plan.highlight ? "text-sage" : "text-mute",
                      )}
                    >
                      FCFA / mois
                    </span>
                  </div>
                  {annual && plan.monthly > 0 && (
                    <p
                      className={cn(
                        "mt-1 text-[12px]",
                        plan.highlight ? "text-sage/70" : "text-mute",
                      )}
                    >
                      Facturé annuellement · {plan.monthly.toLocaleString("fr-FR")}{" "}
                      FCFA en mensuel
                    </p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.label}
                        className={cn(
                          "flex items-start gap-2 text-[13px] leading-snug",
                          feature.active
                            ? plan.highlight
                              ? "text-white"
                              : "text-ink"
                            : plan.highlight
                              ? "text-sage/45 line-through"
                              : "text-mute/60 line-through",
                        )}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            feature.active
                              ? plan.highlight
                                ? "text-lemon"
                                : "text-moss"
                              : "text-mute/40",
                          )}
                        />
                        {feature.label}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={primaryCta}
                    className={cn(
                      "mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-bold transition-transform hover:-translate-y-0.5",
                      plan.highlight
                        ? "lime-glow bg-lemon text-ink"
                        : "border border-ink/15 bg-white text-ink",
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={80}>
            <p className="mt-8 flex items-center justify-center gap-2 text-center text-[12.5px] text-mute">
              <ShieldCheck className="size-4 shrink-0 text-moss" />
              Paiement sécurisé · vos accès réseau sont chiffrés · résiliable en
              un clic.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- FAQ */}
      <section id="faq" className="border-b border-hairline py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <Reveal>
            <SectionHead
              tag="Questions"
              title="Questions fréquentes."
              align="center"
            />
          </Reveal>

          <div className="mt-10 divide-y divide-hairline border-y border-hairline">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[15px] font-bold leading-snug text-ink">
                      {faq.q}
                    </span>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                        open
                          ? "rotate-45 border-forest bg-forest text-lemon"
                          : "border-hairline bg-white text-ink",
                      )}
                    >
                      <Plus className="size-4" />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out",
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-5 pr-12 text-[14px] leading-relaxed text-mute">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- FINAL CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-xl bg-forest px-6 py-14 text-center sm:px-12">
              <div
                aria-hidden
                className="dark-grid-lines pointer-events-none absolute inset-0 opacity-70"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-10 select-none text-[140px] leading-none opacity-10 sm:text-[180px]"
              >
                🍋
              </div>
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-[clamp(1.8rem,4.4vw,2.9rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-white">
                  Reprenez contrôle absolu de votre calendrier éditorial.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[14.5px] leading-relaxed text-sage">
                  Connectez un canal, collez une idée. Lemon.ai s'occupe du
                  reste — programmation, format, ton.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={primaryCta}
                    className="lime-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-lemon px-6 py-3.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 sm:w-auto"
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:border-white/50 sm:w-auto"
                  >
                    Voir le simulateur
                    <ArrowUpRight className="size-4" />
                  </button>
                </div>
                <p className="mt-6 tag-code text-sage/70">
                  Gratuit · sans carte bancaire
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- FOOTER */}
      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Logo />
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-mute">
                Le studio de contenu qui transforme une idée brute en huit
                publications calibrées, puis les programme pour vous.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-paper px-3 py-1.5">
                <span className="size-2 rounded-full bg-[#27C93F] animate-pulse-soft" />
                <span className="tag-code text-moss">Tous les systèmes OK</span>
              </div>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title} className="lg:col-span-2">
                <h3 className="tag-code text-ink">{column.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-mute transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="lg:col-span-2">
              <h3 className="tag-code text-ink">Canaux</h3>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {allChannelTypes.map((type) => (
                  <span
                    key={type}
                    className="flex size-7 items-center justify-center rounded-md border border-hairline bg-paper"
                  >
                    <ChannelGlyph type={type} className="size-3.5" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-hairline pt-6 sm:flex-row">
            <p className="tag-code text-mute">
              © {new Date().getFullYear()} Lemon.ai — Tous droits réservés
            </p>
            <p className="tag-code text-mute">
              Conçu pour publier moins, et mieux.
            </p>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------ DEMO MODAL */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden border-hairline bg-paper p-0">
          <DialogTitle className="sr-only">
            Simulateur du studio Lemon.ai
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aperçu de l’adaptation d’une idée brute en publications par canal.
          </DialogDescription>

          <div className="dark-grid-lines bg-forest px-6 py-6">
            <span className="inline-flex items-center gap-2 tag-code rounded-full bg-white/10 px-3 py-1 text-lemon">
              <CirclePlay className="size-3" />
              Simulateur
            </span>
            <h3 className="mt-3 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-white">
              Une note brute → huit posts.
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-sage">
              C’est exactement ce que le studio produit en moins de dix
              secondes, avec vos propres réglages de ton.
            </p>
          </div>

          <div className="space-y-2 px-6 py-5">
            {tabs.map((tab) => (
              <div
                key={tab.key}
                className="flex items-center gap-3 rounded-md border border-hairline bg-white px-3.5 py-2.5"
              >
                <ChannelGlyph type={tab.type} className="size-4 text-moss" />
                <span className="text-[13px] font-bold text-ink">
                  {tab.label}
                </span>
                <span className="ml-auto tag-code text-mute">
                  {previews[tab.key].format}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="tag-code text-mute">
              Aucune carte bancaire requise
            </span>
            <Link
              href={primaryCta}
              onClick={() => setDemoOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lemon px-5 py-2.5 text-[13px] font-bold text-ink"
            >
              Essayer maintenant
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
