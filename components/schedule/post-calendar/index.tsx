"use client"
import * as React from "react"
import { Calendar, dateFnsLocalizer, Views, type DateHeaderProps, type ToolbarProps } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addHours, isBefore, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, } from "lucide-react"
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


type CalendarEvent = PostType & {
  title: string
  start: Date
  end: Date
}

interface PostCalendarProps {
  posts: PostType[]
  isPending: boolean
  currentDate: Date
  view: "month" | "week"
  onViewChange: (view: string) => void
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
  onViewChange,
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
    weekdayFormat: (date: Date) => format(date, "EEEE", { locale: fr }),
    dayFormat: (date: Date) => format(date, "EEEE d", { locale: fr }),
  }), []);

  const isWeekView = view === "week"

  const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent>) => {
    return (
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-2xl border border-border/80 bg-background p-1 shadow-sm">
              <Button variant="ghost" size="icon" aria-label="Mois précédent" className="size-8 rounded-xl text-foreground/70 hover:bg-muted" onClick={() => toolbar.onNavigate('PREV')}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Mois suivant" className="size-8 rounded-xl text-foreground/70 hover:bg-muted" onClick={() => toolbar.onNavigate('NEXT')}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <span className="min-w-[150px] text-lg font-extrabold capitalize tracking-[-0.035em] text-foreground">
              {format(toolbar.date, "MMMM yyyy", { locale: fr })}
            </span>

            <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/80 bg-background px-3 text-xs font-bold shadow-sm" onClick={() => toolbar.onNavigate('TODAY')}>
              Aujourd&apos;hui
            </Button>

            <select
              aria-label="Période du calendrier"
              className="h-9 cursor-pointer rounded-xl border border-border/80 bg-background px-3 text-xs font-bold text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={view}
              onChange={(e) => onViewChange(e.target.value)}
            >
              <option value="month">Mois</option>
              <option value="week">Semaine</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rightActions}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative flex h-full min-h-[440px] flex-col")}>
      <Calendar<CalendarEvent>
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
        onView={(v) => onViewChange(v === Views.MONTH ? "month" : "week")}
        onSelectEvent={(event) => onPostClick(event)}
        //onSelectSlot={({ start }) => onCreatePost(start)}
      
        // In week view, disable past time slots 
        // and style them differently
        slotPropGetter={(date) => {
          const isPastSlot = isBefore(date, new Date())
          return isPastSlot
            ? {
              className: "rbc-time-slot-disabled",
              style: {
                backgroundColor: "color-mix(in srgb, var(--color-muted) 55%, transparent)",
                pointerEvents: "none",
              },
            }
            : {}
        }}
        // In month view, disable past dates and style them differently
        dayPropGetter={(date: Date) => {
          const isPastDate = isBefore(date, new Date())
          return {
            className: isPastDate ? "bg-[#331f000f]! pointer-events-none" : "",
            style: isPastDate ? { backgroundColor: "color-mix(in srgb, var(--color-muted) 78%, transparent)" } : {}
          }
        }}
        components={{
          toolbar: CustomToolbar,
          // Customize event rendering to show channel icons and better styling
          event: ({ event }: { event: CalendarEvent }) => {
            const channel = event.user_channels?.channel_types
            const Icon = getChannelIcon(channel?.type || undefined)
            const color = channel?.color || "#000000"
            return (
              <>
                <div
                  className="flex items-center gap-2 px-2 py-1 h-full"
                  style={{ backgroundColor: color + "20", borderLeft: `3px solid ${color}` }}
                  onClick={() => onPostClick(event)}
                >
                  {Icon && <HugeiconsIcon
                    icon={Icon}
                    className="shrink-0 text-white! size-4! p-0.5 rounded-sm"
                    style={{
                      background: color
                    }} />}
                  <span className="text-xs truncate max-w-[100px]">{event?.title}</span>
                  <span className="font-semibold">{format(new Date(event.scheduled_at), "h:mm a")}</span>
                </div>
              </>
            )
          },

          month: {
            dateHeader: ({ label, date: cellDate }: DateHeaderProps) => {
              const isCellToday = format(cellDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              const isPastDate = isBefore(cellDate, startOfDay(new Date()))
              return (
                <>
                  <div className="group flex items-center justify-between w-full">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                      isCellToday ? "bg-primary font-bold text-primary-foreground shadow-sm" : isPastDate ? "text-muted-foreground/60" : "text-foreground"
                    )}>
                      {label}
                    </span>
                    {!isPastDate && !isPending && (
                      <Button
                        size="icon-sm"
                        variant="default"
                        className="p-px! size-6! mt-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreatePost(cellDate)
                        }}
                      >
                        <Plus className="size-3" />
                      </Button>
                    )}

                  </div>
                  {isPending && <Skeleton className="h-8 w-11/12 m-2 my-5" />}
                </>
              )
            }
          },
        }}
      />
    </div>
  )
}
