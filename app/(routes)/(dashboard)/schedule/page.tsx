"use client"

import { Suspense, useState } from "react";
import { useQueryState } from "nuqs"
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, CalendarIcon, History, LayoutList, Plus } from "lucide-react";
import ListView from "@/components/schedule/list-view";
import CalendarView from "@/components/schedule/calendar-view";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { cn } from "@/lib/utils";

const SchedulePageContent = () => {
  const [activeView, setActiveView] = useQueryState("view", {
    defaultValue: "calendar",
  });
  const [, setStatus] = useQueryState("status", {
    defaultValue: "",
  })
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-accent-foreground">
            <CalendarDays className="size-3.5" />
            Votre calendrier social
          </div>
          <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-4xl">
            Le bon contenu, <span className="text-primary">au bon moment.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Une vue claire sur vos publications à venir, vos brouillons et tout ce qui est déjà parti.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/80 bg-card p-1 shadow-sm">
            <button
              type="button"
              aria-pressed={activeView === "list"}
              onClick={() => { setStatus(null); setActiveView("list") }}
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all",
                activeView === "list" ? "bg-[#172116] text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutList className="size-3.5" />
              Liste
            </button>
            <button
              type="button"
              aria-pressed={activeView === "calendar"}
              onClick={() => { setStatus(null); setActiveView("calendar") }}
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all",
                activeView === "calendar" ? "bg-[#172116] text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <CalendarIcon className="size-3.5" />
              Calendrier
            </button>
          </div>

          <Button asChild variant="outline" className="h-11 gap-2 rounded-2xl border-border/80 bg-card px-4 text-xs font-semibold shadow-sm hover:bg-muted">
            <Link href="/schedule/history">
              <History className="size-3.5" />
              Historique
            </Link>
          </Button>

          <Button onClick={() => setCreatePostModalOpen(true)} className="h-11 gap-2 rounded-2xl px-4 text-xs font-bold shadow-[0_8px_24px_rgba(163,230,53,0.18)]">
            <Plus className="size-3.5" />
            Ajouter
          </Button>
        </div>
      </header>

      <div className="min-h-[min(72vh,780px)]">
        {activeView === "list" ? (
          <ListView setCreatePostModalOpen={setCreatePostModalOpen} />
        ) : (
          <CalendarView />
        )}
      </div>

      <CreatePostDialog
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
      />
    </div>
  )
}

const SchedulePage = () => {
  return (
    <Suspense fallback={
      <div className="flex h-72 items-center justify-center rounded-3xl border border-border/70 bg-card/70">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-foreground/40">Chargement...</p>
        </div>
      </div>
    }>
      <NuqsAdapter>
        <SchedulePageContent />
      </NuqsAdapter>
    </Suspense>
  )
}

export default SchedulePage
