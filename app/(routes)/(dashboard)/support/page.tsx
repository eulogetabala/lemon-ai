"use client";

import {
  BookOpen,
  MessageSquare,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Centre d&apos;aide & Support
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Guides, documentation technique, FAQ et assistance dédiée KORAPULSE.
        </p>
      </div>

      {/* Search Help */}
      <div className="relative flex w-full max-w-xl items-center">
        <Search className="pointer-events-none absolute left-4 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Comment connecter Instagram ? Comment fonctionne la veille ?"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
        />
      </div>

      {/* Support Cards (Strict Orange, Noir, Blanc) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF5722]">
              <BookOpen className="size-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">Documentation</h3>
            <p className="mt-1 text-xs text-slate-500">
              Retrouvez nos guides pas-à-pas pour configurer vos réseaux, plannings et veilles concurrentielles.
            </p>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF5722] hover:underline"
          >
            Explorer les guides <ExternalLink className="size-3" />
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <MessageSquare className="size-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">Chat en direct</h3>
            <p className="mt-1 text-xs text-slate-500">
              Discutez directement avec un spécialiste de notre équipe technique du lundi au vendredi.
            </p>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF5722] hover:underline"
          >
            Démarrer une conversation
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <CheckCircle2 className="size-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">Statut des services</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tous les systèmes et connecteurs réseaux sociaux sont 100% opérationnels.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-900">
            <span className="size-2 rounded-full bg-[#FF5722]" /> Opérationnel
          </span>
        </div>
      </div>
    </div>
  );
}
