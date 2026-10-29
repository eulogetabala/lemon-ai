"use client"
import * as React from "react"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addHours, isBefore, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import { Plus } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./post-calendar.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getChannelIcon } from "@/constants/channels"
import { PostType } from "@/types/post.type"

const locales = { "fr": fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})


interface PostCalendarProps {
  posts: PostType[]
  isPending: boolean
  currentDate: Date
  view: "month" | "week"
  onViewChange?: (view: string) => void
  onDateChange: (date: Date) => void
  onPostClick: (post: PostType) => void
  onCreatePost: (date: Date) => void
  rightActions?: React.ReactNode
}

export function PostCalendar({
  posts,
  isPending,
  currentDate,
  view,
  onDateChange,
  onPostClick,
  onCreatePost,
  rightActions,
}: PostCalendarProps) {

  const events = React.useMemo(() =>
    isPending ? [] : posts.map(p => ({
      ...p,
      title: p.content,
      start: new Date(p.scheduled_at),
      end: addHours(new Date(p.scheduled_at), 1),
    })), [posts, isPending]
  )

  const formats = React.useMemo(() => ({
    weekdayFormat: (date: Date, culture?: string, localizer?: any) =>
      localizer.format(date, 'EEE', culture),

    dayFormat: (date: Date, culture?: string, localizer?: any) =>
      localizer.format(date, 'EEEE d', culture),
  }), []);

  const isWeekView = view === "week"

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 rounded-2xl border border-hairline bg-white dark:bg-card p-3">
      {/* Barre de la vue — filtres */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="tag-code text-mute">
            {isWeekView ? "Vue hebdomadaire" : "Vue mensuelle"}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="size-1.5 rounded-full bg-lemon animate-pulse-soft" />
            <span className="tag-code text-mute">{posts.length} publication{posts.length > 1 ? "s" : ""}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rightActions}
        </div>
      </div>

      {/* Grille */}
      <div className="min-h-0 flex-1">
        <Calendar
          localizer={localizer}
          culture="fr"
          events={events}
          date={currentDate}
          formats={formats}
          step={isWeekView ? 15 : 60}
          timeslots={10}
          min={new Date(2026, 0, 1, 0, 0)}
          max={new Date(2026, 0, 1, 22, 0)}
          onNavigate={onDateChange}
          view={view === "month" ? Views.MONTH : Views.WEEK}
          onSelectEvent={(event: any) => onPostClick(event)}

          // Dans la vue semaine, on désactive et grise les créneaux passés
          slotPropGetter={(date) => {
            const isPastSlot = isBefore(date, new Date())
            return isPastSlot ? { className: "rbc-slot-past" } : {}
          }}
          // Dans la vue mois, on désactive et grise les jours passés
          dayPropGetter={(date: Date) => {
            const isPastDate = isBefore(date, startOfDay(new Date()))
            return isPastDate ? { className: "rbc-day-past" } : {}
          }}
          components={{
            toolbar: () => null,
            // Rendu des événements : pastille du canal + heure
            event: ({ event }) => {
              const channel = event.user_channels?.channel_types
              const Icon = getChannelIcon(channel?.type || undefined)
              const color = channel?.color || "#111410"
              return (
                <div
                  className="rbc-event-inner flex h-full items-center gap-1.5 px-1.5 py-0.5"
                  style={{ backgroundColor: color + "18", borderLeft: `3px solid ${color}` }}
                  onClick={() => onPostClick(event)}
                >
                  {Icon && <HugeiconsIcon
                    icon={Icon}
                    className="shrink-0 text-white! size-3.5! p-0.5 rounded-sm"
                    style={{
                      background: color
                    }} />}
                  <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-foreground/80">
                    {event?.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-foreground/60">
                    {format(event.scheduled_at, "HH:mm")}
                  </span>
                </div>
              )
            },

            month: {
              dateHeader: ({ label, date: cellDate }: any) => {
                const isCellToday = format(cellDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const isPastDate = isBefore(cellDate, startOfDay(new Date()))
                return (
                  <div className="group flex items-center justify-between gap-1 w-full">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                        isCellToday
                          ? "bg-ink text-lemon"
                          : isPastDate
                            ? "text-mute/50"
                            : "text-ink"
                      )}>
                        {label}
                      </span>
                      {isCellToday && (
                        <span className="hidden truncate rounded-full bg-lemon px-1.5 py-px tag-code text-ink sm:inline">
                          Aujourd&apos;hui
                        </span>
                      )}
                    </div>

                    {!isPastDate && !isPending && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-5! shrink-0 rounded-full bg-lemon/0 p-0 text-mute opacity-0 transition-all hover:bg-lemon hover:text-ink group-hover:opacity-100 max-sm:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreatePost(cellDate)
                        }}
                      >
                        <Plus className="size-3" />
                      </Button>
                    )}
                  </div>
                )
              }
            },
          }}
        />

        {isPending && (
          <div className="pointer-events-none -mt-24 flex flex-col gap-2 px-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-52" />
          </div>
        )}
      </div>
    </div>
  )
}
