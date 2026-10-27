"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type FacebookPage = {
  id: string
  name: string
  pictureUrl: string | null
}

interface FacebookPagePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelected?: () => void
}

export function FacebookPagePicker({
  open,
  onOpenChange,
  onSelected,
}: FacebookPagePickerProps) {
  const queryClient = useQueryClient()

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["facebook-pages"],
    queryFn: async () => {
      const res = await fetch("/api/channel/facebook/pages")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Impossible de charger les pages Facebook")
      }
      return data.pages as FacebookPage[]
    },
    enabled: open,
  })

  const selectMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const res = await fetch("/api/channel/facebook/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de la sélection de la page")
      return data
    },
    onSuccess: () => {
      toast.success("Page Facebook connectée avec succès")
      queryClient.invalidateQueries({ queryKey: ["channels"] })
      queryClient.invalidateQueries({ queryKey: ["channels-connected"] })
      onSelected?.()
    },
    onError: (err: Error) => {
      console.error("Facebook page select error:", err)
      toast.error(err.message)
    },
  })

  const pages = data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir une page Facebook</DialogTitle>
          <DialogDescription>
            Sélectionnez la page sur laquelle vous souhaitez publier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {isPending && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner /> Chargement des pages…
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Impossible de charger les pages Facebook"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {!isPending && !isError && pages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune page Facebook trouvée. Créez une page puis reconnectez Facebook.
            </p>
          )}

          {pages.map((page) => {
            const isLoadingThisPage =
              selectMutation.isPending && selectMutation.variables === page.id
            return (
              <button
                key={page.id}
                type="button"
                disabled={selectMutation.isPending}
                onClick={() => selectMutation.mutate(page.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                  selectMutation.isPending && "cursor-not-allowed opacity-60",
                )}
              >
                <Avatar>
                  <AvatarImage src={page.pictureUrl ?? undefined} alt={page.name} />
                  <AvatarFallback>
                    {page.name?.charAt(0)?.toUpperCase() ?? "P"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate font-medium">{page.name}</span>
                {isLoadingThisPage && <Spinner className="size-4" />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
