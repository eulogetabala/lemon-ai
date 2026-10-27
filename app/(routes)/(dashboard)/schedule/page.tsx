"use client"

import { Suspense, useState } from "react";
import { useQueryState } from "nuqs"
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarIcon, History, LayoutList, Plus } from "lucide-react";
import ListView from "@/components/schedule/list-view";
import CalendarView from "@/components/schedule/calendar-view";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { cn } from "@/lib/utils";

type ViewType = "calendar" | "list"

const SchedulePageContent = () => {
  const [activeView, setActiveView] = useQueryState("view", {
    defaultValue: "calendar",
  });
  const [_, setStatus] = useQueryState("status", {
    defaultValue: "",
  })
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* ── Page Header ── */}
      <header className="flex items-center justify-between px-2 pt-4 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Tous les canaux
          </h1>
          <p className="text-xs text-foreground/40 mt-0.5">Gérez vos publications planifiées</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle — premium pill switcher */}
          <div className="flex items-center rounded-full border border-white/10 dark:border-white/8 bg-white/5 dark:bg-white/[0.03] p-0.5 gap-0.5">
            <button
              onClick={() => { setStatus(null); setActiveView("list") }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                activeView === "list"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/45 hover:text-foreground/70"
              )}
            >
              <LayoutList className="size-3.5" />
              Liste
            </button>
            <button
              onClick={() => { setStatus(null); setActiveView("calendar") }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                activeView === "calendar"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/45 hover:text-foreground/70"
              )}
            >
              <CalendarIcon className="size-3.5" />
              Calendrier
            </button>
          </div>

          {/* History button */}
          <Button
            asChild
            variant="outline"
            className="rounded-full h-8 px-4 text-xs gap-1.5"
          >
            <Link href="/schedule/history">
              <History className="size-3.5" />
              Historique
            </Link>
          </Button>

          {/* Create post CTA */}
          <Button
            onClick={() => setCreatePostModalOpen(true)}
            className="rounded-full h-8 px-4 text-xs gap-1.5 font-semibold"
          >
            <Plus className="size-3.5" />
            Ajouter
          </Button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
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
      <div className="flex items-center justify-center h-64">
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