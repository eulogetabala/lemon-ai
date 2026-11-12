"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, ExternalLink, Heart, MessageCircle, Repeat2, Sparkles } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  NewTwitterIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { stripRichTextFormatting } from "@/lib/rich-text";
import type { CompetitorPost } from "@/types/competitor.type";
import { formatMonth, formatNumber } from "../_data";

export const ICON_MAP: Record<string, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  tiktok: TiktokIcon,
  twitter: NewTwitterIcon,
  youtube: YoutubeIcon,
};

export const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  twitter: "X",
  youtube: "YouTube",
  threads: "Threads",
};

/**
 * Names the network a post comes from. The same publication syndicated on
 * several channels otherwise reads as a duplicate in the flux.
 */
export function PlatformTag({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICON_MAP[platform] || FacebookIcon;
  const label = PLATFORM_LABEL[platform] ?? platform;
  return (
    <span
      title={`Publication ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-slate-600",
        className,
      )}
    >
      <HugeiconsIcon icon={Icon} className="size-3 shrink-0" />
      {label}
    </span>
  );
}

export const interactionsOf = (p: Pick<CompetitorPost, "likes" | "comments" | "shares">) =>
  p.likes + p.comments + p.shares;

/**
 * Some networks (the public Instagram page) expose no engagement: a stored 0
 * then means "unknown" and must not be shown as "nobody reacted".
 */
export const engagementKnown = (p: Pick<CompetitorPost, "engagementAvailable">) =>
  p.engagementAvailable !== false;

export const fr = (n: number) => Math.round(n).toLocaleString("fr-FR");

export const pct = (n: number, digits = 2) => `${n.toFixed(digits).replace(".", ",")} %`;

export function signed(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fr(Math.abs(n))}`;
}

export function postDate(iso: string, withYear = false) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: withYear ? "long" : "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5722]";
const card = "rounded-2xl border border-slate-200 bg-white";

/* ───────────────────────── Motion helpers ───────────────────────── */

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a number from its previous value to `value` (ease-out). */
export function useCountUp(value: number, duration = 800) {
  const [display, setDisplay] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const total = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = total === 0 ? 1 : Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, duration]);

  return display;
}

export function CountUp({ value, format = fr }: { value: number; format?: (n: number) => string }) {
  const display = useCountUp(value);
  return <span className="tabular-nums">{format(display)}</span>;
}

/* ───────────────────────── Image with loading + fallback ───────────────────────── */

type PostImageProps = {
  src?: string | null;
  platform: string;
  className?: string;
};

/** Remounts on a new src so the loading state always starts fresh. */
export function PostImage(props: PostImageProps) {
  return <PostImageInner key={props.src ?? "none"} {...props} />;
}

function PostImageInner({ src, platform, className }: PostImageProps) {
  const [state, setState] = useState<"loading" | "ok" | "error">(src ? "loading" : "error");
  const Icon = ICON_MAP[platform] || FacebookIcon;

  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {state === "loading" && <div className="kp-shimmer absolute inset-0" aria-hidden />}
      {src && state !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            state === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <HugeiconsIcon icon={Icon} className="size-6 text-slate-300" />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Header: identity + channel switcher ───────────────────────── */

type Tab = { key: string; label: string; followers: number };

export function CompetitorHeader({
  name,
  verified,
  subtitle,
  avatar,
  tabs,
  selected,
  onSelect,
}: {
  name: string;
  verified: boolean;
  subtitle: React.ReactNode;
  avatar?: string | null;
  tabs: Tab[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [avatarOk, setAvatarOk] = useState(Boolean(avatar));
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {avatar && avatarOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={`Logo ${name}`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarOk(false)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-extrabold text-slate-900">{name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 truncate text-xl font-extrabold tracking-tight text-slate-900">
            {name}
            {verified && <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label="Compte vérifié" />}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div role="tablist" aria-label="Canal analysé" className="flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => {
          const active = selected === tab.key;
          const Icon = ICON_MAP[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors duration-200",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
                focusRing,
              )}
            >
              {Icon && <HugeiconsIcon icon={Icon} className="size-3.5" />}
              {tab.label}
              {tab.key !== "all" && tab.followers > 0 && (
                <span className="font-medium text-slate-400">{formatNumber(tab.followers)}</span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

/* ───────────────────────── Le pouls du mois ───────────────────────── */

export function PulseCard({
  month,
  posts,
  availableMonths,
  onMonthChange,
  selectedDay,
  onSelectDay,
  headline,
  updatedLabel,
  live,
  animationKey,
}: {
  month: string;
  posts: CompetitorPost[];
  availableMonths: string[];
  onMonthChange: (m: string) => void;
  selectedDay: number | null;
  onSelectDay: (d: number | null) => void;
  headline: React.ReactNode;
  updatedLabel: string | null;
  live: boolean;
  animationKey: string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthNumber - 1;
  const today = isCurrentMonth ? now.getDate() : null;

  const days = useMemo(() => {
    const list = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, interactions: 0, count: 0 }));
    for (const post of posts) {
      const d = new Date(post.publishedAt);
      if (d.getFullYear() !== year || d.getMonth() !== monthNumber - 1) continue;
      const slot = list[d.getDate() - 1];
      slot.count += 1;
      slot.interactions += interactionsOf(post);
    }
    return list;
  }, [posts, daysInMonth, year, monthNumber]);

  const peakValue = Math.max(1, ...days.map((d) => d.interactions));
  const monthIndex = availableMonths.indexOf(month);
  const older = monthIndex >= 0 && monthIndex < availableMonths.length - 1 ? availableMonths[monthIndex + 1] : null;
  const newer = monthIndex > 0 ? availableMonths[monthIndex - 1] : null;

  return (
    <section aria-labelledby="pulse-title" className={cn(card, "flex flex-col p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pulse-title" className="text-[15px] font-bold text-slate-900">
          Le pouls du mois
        </h2>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
            <span className="relative flex size-1.5">
              {live && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />}
              <span className={cn("relative inline-flex size-1.5 rounded-full", live ? "bg-emerald-500" : "bg-slate-300")} />
            </span>
            {live ? (updatedLabel ? `Suivi auto · ${updatedLabel}` : "Suivi auto") : "Mois terminé"}
          </span>
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              type="button"
              aria-label="Mois précédent"
              disabled={!older}
              onClick={() => older && onMonthChange(older)}
              className={cn("flex size-7 items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30", focusRing)}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="min-w-[7.5rem] text-center text-xs font-semibold capitalize text-slate-900">{formatMonth(month)}</span>
            <button
              type="button"
              aria-label="Mois suivant"
              disabled={!newer}
              onClick={() => newer && onMonthChange(newer)}
              className={cn("flex size-7 items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30", focusRing)}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p
        key={animationKey}
        className="kp-rise-in mt-4 max-w-[52ch] text-[17px] leading-relaxed text-slate-500 [&_strong]:font-bold [&_strong]:text-slate-900 [&_em]:not-italic [&_em]:font-bold [&_em]:text-[#E64A19]"
      >
        {headline}
      </p>

      <div className="mt-auto pt-6">
        <div
          key={animationKey}
          role="group"
          aria-label={`Interactions par jour, ${formatMonth(month)}`}
          className="flex h-24 items-end gap-[3px]"
        >
          {days.map((d, i) => {
            const future = today !== null && d.day > today;
            const selectedBar = selectedDay === d.day;
            const height = d.interactions > 0 ? Math.max(10, (d.interactions / peakValue) * 100) : d.count > 0 ? 10 : 4;
            return (
              <button
                key={d.day}
                type="button"
                disabled={d.count === 0}
                onClick={() => onSelectDay(selectedBar ? null : d.day)}
                aria-pressed={selectedBar}
                aria-label={
                  d.count > 0
                    ? `${d.day} : ${d.count} publication${d.count > 1 ? "s" : ""}, ${fr(d.interactions)} interactions`
                    : `${d.day} : aucune publication`
                }
                title={
                  d.count > 0
                    ? `${d.day} — ${d.count} publication${d.count > 1 ? "s" : ""}, ${fr(d.interactions)} interactions`
                    : undefined
                }
                className={cn(
                  "group flex h-full min-w-0 flex-1 items-end disabled:cursor-default",
                  future && "opacity-40",
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    "kp-bar block w-full rounded-[3px] transition-colors duration-150",
                    d.count === 0 && "bg-slate-100",
                    d.count > 0 && !selectedBar && "bg-[#FF5722] group-hover:bg-[#E64A19]",
                    selectedBar && "bg-slate-900",
                  )}
                  style={{ height: `${height}%`, animationDelay: `${i * 18}ms` }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[3px] text-[10px] tabular-nums text-slate-400" aria-hidden>
          {days.map((d) => (
            <span
              key={d.day}
              className={cn(
                "min-w-0 flex-1 text-center",
                d.day === today && "font-bold text-[#E64A19]",
                d.day !== 1 && d.day !== today && d.day !== daysInMonth && d.day % 5 !== 0 && "invisible",
              )}
            >
              {d.day}
            </span>
          ))}
        </div>
        {selectedDay !== null && (
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className={cn("mt-3 text-xs font-semibold text-[#E64A19] hover:underline", focusRing)}
          >
            Voir tout le mois
          </button>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Month summary ───────────────────────── */

export type Metric = {
  label: string;
  value: number | null;
  format?: (n: number) => string;
  detail?: string;
  delta?: { text: string; positive: boolean | null } | null;
};

export function MonthSummary({ title, metrics, animationKey }: { title: string; metrics: Metric[]; animationKey: string }) {
  return (
    <section aria-label={title} className={cn(card, "p-5 sm:p-6")}>
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      <dl key={animationKey} className="mt-3 divide-y divide-slate-100">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="kp-rise-in flex items-start justify-between gap-4 py-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="min-w-0">
              <dt className="text-[13px] text-slate-500">{m.label}</dt>
              {m.detail && <dd className="mt-0.5 truncate text-[11px] text-slate-400">{m.detail}</dd>}
            </div>
            <dd className="flex shrink-0 items-baseline gap-2">
              {m.delta && (
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    m.delta.positive === true && "text-emerald-600",
                    m.delta.positive === false && "text-rose-600",
                    m.delta.positive === null && "text-slate-400",
                  )}
                >
                  {m.delta.text}
                </span>
              )}
              <span className="text-lg font-bold tracking-tight text-slate-900">
                {m.value === null ? <span className="text-slate-300">—</span> : <CountUp value={m.value} format={m.format} />}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────────────────── Posts ───────────────────────── */

const NOT_REPORTED_HINT =
  "Instagram n'expose pas les réactions des pages publiques : valeur indisponible";

function Stats({ post, engagement }: { post: CompetitorPost; engagement: number | null }) {
  const known = engagementKnown(post);
  const value = (n: number) =>
    known ? formatNumber(n) : <span className="font-medium text-slate-400">n/d</span>;
  return (
    <ul
      className={cn(
        "flex items-center gap-3 text-xs font-semibold tabular-nums",
        known ? "text-slate-700" : "text-slate-500",
      )}
    >
      <li className="flex items-center gap-1" title={known ? "J'aime" : NOT_REPORTED_HINT}><Heart className="size-3.5 text-slate-400" />{value(post.likes)}</li>
      <li className="flex items-center gap-1" title={known ? "Commentaires" : NOT_REPORTED_HINT}><MessageCircle className="size-3.5 text-slate-400" />{value(post.comments)}</li>
      <li className="flex items-center gap-1" title={known ? "Partages" : NOT_REPORTED_HINT}><Repeat2 className="size-3.5 text-slate-400" />{value(post.shares)}</li>
      {known && engagement !== null && <li className="text-[#E64A19]" title="Interactions rapportées aux abonnés">{pct(engagement)}</li>}
    </ul>
  );
}

export function FeaturedPost({
  post,
  url,
  engagement,
  onOpen,
  onInspire,
}: {
  post: CompetitorPost;
  url: string;
  engagement: number | null;
  onOpen: () => void;
  onInspire: () => void;
}) {
  const text = stripRichTextFormatting(post.content);
  return (
    <article className={cn(card, "kp-rise-in flex flex-col gap-5 p-4 sm:flex-row sm:items-center")}>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Voir le détail de la publication"
        className={cn("shrink-0 overflow-hidden rounded-xl", focusRing)}
      >
        <PostImage src={post.mediaUrl} platform={post.platform} className="aspect-square w-full sm:w-36" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <PlatformTag platform={post.platform} />
          <time dateTime={post.publishedAt}>{postDate(post.publishedAt, true)}</time>
          <span className="font-semibold text-slate-900">
            {engagementKnown(post) ? `${fr(interactionsOf(post))} interactions` : "Engagement n/d"}
          </span>
        </div>
        <p className="line-clamp-2 text-[15px] font-medium leading-snug text-slate-900">
          {text || "Publication sans texte : ouvrez-la pour voir le visuel."}
        </p>
        <Stats post={post} engagement={engagement} />
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button
          type="button"
          onClick={onInspire}
          className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-black", focusRing)}
        >
          <Sparkles className="size-3.5" /> S&apos;en inspirer
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900", focusRing)}
        >
          Ouvrir <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}

export function PostCard({
  post,
  engagement,
  onOpen,
  onInspire,
  delay = 0,
}: {
  post: CompetitorPost;
  engagement: number | null;
  onOpen: () => void;
  onInspire: () => void;
  delay?: number;
}) {
  const text = stripRichTextFormatting(post.content);
  return (
    <article
      className={cn(card, "kp-rise-in flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button type="button" onClick={onOpen} className={cn("flex flex-1 flex-col text-left", focusRing)}>
        {/* Always reserve the image area so every card in the grid has the same shape. */}
        <PostImage src={post.mediaUrl} platform={post.platform} className="aspect-[16/10] w-full" />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <PlatformTag platform={post.platform} />
            <time dateTime={post.publishedAt}>{postDate(post.publishedAt)}</time>
          </div>
          <p className={cn("line-clamp-2 text-sm leading-relaxed text-slate-700")}>
            {text || "Ouvrez la publication pour voir son contenu."}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <Stats post={post} engagement={engagement} />
        <button
          type="button"
          onClick={onInspire}
          aria-label="S'inspirer de cette publication"
          title="S'inspirer de cette publication"
          className={cn("rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900", focusRing)}
        >
          <Sparkles className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

/* ───────────────────────── Why there is no data ───────────────────────── */

export function SourceNotice({
  sources,
  onSync,
  syncing,
}: {
  sources: { platform: string; note: string | null }[];
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className={cn(card, "border-dashed p-6")}>
      <h3 className="text-[15px] font-bold text-slate-900">Aucune publication collectée sur cette période</h3>
      <p className="mt-1 max-w-[62ch] text-sm text-slate-500">
        Seules les données réelles des réseaux sont affichées. Réponse de chaque source à la dernière synchronisation :
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {sources.map((s) => {
          const Icon = ICON_MAP[s.platform] || FacebookIcon;
          return (
            <li key={s.platform} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
              <HugeiconsIcon icon={Icon} className="mt-0.5 size-4 shrink-0 text-slate-600" />
              <p className="text-slate-600">
                <span className="font-semibold text-slate-900">{PLATFORM_LABEL[s.platform] ?? s.platform} : </span>
                {s.note || "synchronisé, mais aucune publication sur cette période."}
              </p>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        className={cn("mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60", focusRing)}
      >
        {syncing ? "Synchronisation…" : "Relancer la synchronisation"}
      </button>
    </div>
  );
}

/**
 * Partial-collection banner: some posts were collected but a source still
 * reports a limitation (missing Meta permissions, scraping fallback…). It has
 * to stay visible, otherwise unavailable stats read as real zeros.
 */
export function SyncNote({
  sources,
  onSync,
  syncing,
}: {
  sources: { platform: string; note: string | null }[];
  onSync: () => void;
  syncing: boolean;
}) {
  const notes = sources.filter((s) => s.note);
  if (notes.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ul className="flex flex-col gap-2">
          {notes.map((s) => {
            const Icon = ICON_MAP[s.platform] || FacebookIcon;
            return (
              <li key={s.platform} className="flex items-start gap-2.5 text-sm">
                <HugeiconsIcon icon={Icon} className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <p className="max-w-[70ch] text-amber-900">
                  <span className="font-semibold">{PLATFORM_LABEL[s.platform] ?? s.platform} incomplet — </span>
                  {s.note}
                </p>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className={cn(
            "rounded-lg border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60",
            focusRing,
          )}
        >
          {syncing ? "Synchronisation…" : "Resynchroniser"}
        </button>
      </div>
    </div>
  );
}
