
"use client"

import { PostType } from "@/types/post.type"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useQueryState } from "nuqs"
import { useState } from "react"
import { PostCalendar } from "./post-calendar"
import ScheduleToolbar from "./schedule-toolbar"
import CreatePostDialog from "./create-post-dialog"
import { EditPostDialog } from "./edit-post-dialog"

type ViewType = "month" | "week"

interface CalendarViewProps {
  view?: ViewType
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

const CalendarView = ({
  view = "month",
  currentDate: controlledDate,
  onDateChange,
}: CalendarViewProps = {}) => {
  const [channelIds, setChannelIds] = useQueryState("channelIds", {
    defaultValue: [],
    parse: (query) => query.split(","),
    serialize: (value) => value.join(",")
  })
  const [selectedStatus, setSelectedStatus] = useQueryState("status",
    {
      defaultValue: ""

    })
  const [innerDate, setInnerDate] = useState(new Date())
  const currentDate = controlledDate ?? innerDate
  const setCurrentDate = onDateChange ?? setInnerDate
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { data, isFetching:isPending } = useQuery({
    queryKey: ["posts", selectedStatus, channelIds],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus)
      }
      if (channelIds.length > 0) {
        params.append("channelIds", channelIds.join(","))
      }
      const res = await fetch(`/api/post?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    placeholderData: keepPreviousData
  })

  const posts = data?.posts || [] as PostType[]

  const handlePostClick = (_post: PostType) => {
    const post = posts.find((post: PostType) => post.id === _post.id)
    if (post) {
      setSelectedPostForEdit(post)
      setIsEditDialogOpen(true)
    }
  }

  const toggleChannel = (channelId: string) => {
    setChannelIds((prev) => {
      if (!prev) {
        return [channelId]
      }
      if (prev.includes(channelId)) {
        const filtered = prev.filter((id) => id !== channelId)
        return filtered.length === 0 ? null : filtered
      }
      return [...prev, channelId]
    })
  }

  const handleCreatePost = (date: Date) => {
    setSelectedDate(date)
    setIsCreateDialogOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PostCalendar
        posts={posts}
        isPending={isPending}
        currentDate={currentDate}
        view={view}
        onDateChange={setCurrentDate}
        onPostClick={handlePostClick}
        onCreatePost={handleCreatePost}
        rightActions={
          <ScheduleToolbar
            channelIds={channelIds}
            toggleChannel={toggleChannel}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
          />
        }
      />


      <EditPostDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        post={selectedPostForEdit ? {
          id: selectedPostForEdit.id,
          content: selectedPostForEdit.content,
          images: selectedPostForEdit.images || [],
          scheduledDate: selectedPostForEdit.scheduled_at,
          userChannelId: selectedPostForEdit.user_channel_id || "",
          channel: selectedPostForEdit.user_channels?.channel_types ? {
            ...selectedPostForEdit.user_channels.channel_types,
            profile_image: selectedPostForEdit.user_channels.profile_image,
            handle: selectedPostForEdit.user_channels.handle
          } : null,
          // status: selectedPostForEdit.status
        } : null}
      />

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        selectedDate={selectedDate}
      />
    </div>
  )
}

export default CalendarView