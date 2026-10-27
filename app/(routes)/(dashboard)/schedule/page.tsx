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
      <header className="relative isolate overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-28 size-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-secondary-foreground">
              <CalendarDays className="size-3.5" />
              Votre rythme de publication
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-4xl">
              Faites circuler <span className="text-gradient-lime-simple">vos idées.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Brouillons, publications à venir et contenus déjà partis — tout votre tempo social, au même endroit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border/80 bg-background/80 p-1 shadow-sm">
              <button
                type="button"
                aria-pressed={activeView === "list"}
                onClick={() => { setStatus(null); setActiveView("list") }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all",
                  activeView === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  activeView === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

            <Button onClick={() => setCreatePostModalOpen(true)} className="h-11 gap-2 rounded-2xl px-4 text-xs font-bold shadow-md">
              <Plus className="size-3.5" />
              Ajouter
            </Button>
          </div>
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
