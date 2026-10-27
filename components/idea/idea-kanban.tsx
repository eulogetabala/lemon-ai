"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Image from "next/image"
import { ArrowUpRight, MoreHorizontal, Plus, Sparkles } from "lucide-react"
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "../ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import IdeaDialog from "./idea-dialog"
import { IdeaType } from "@/types/idea.type"
import { GenerateIdeasPopover } from "./generate-ideas-popover"

type Column = {
    id: string
    title: string
    ideas: IdeaType[]
}

const IdeaKanban = () => {
    const queryClient = useQueryClient()
    const [localColumns, setLocalColumns] = useState<Column[] | null>(null)
    const [showIdeaDialog, setShowIdeaDialog] = useState<boolean>(false)
    const [selectedIdea, setSelectedIdea] = useState<IdeaType | null>(null)
    const [selectedColumnId, setSelectedColumnId] = useState<string>("")

    const { data: ideaData, isPending } = useQuery<{ groups: Column[] }>({
        queryKey: ["ideas"],
        queryFn: async () => {
            const res = await fetch("/api/idea")
            if (!res.ok) throw new Error("Failed to fetch ideas")
            return res.json()
        },
    })

    const columns = localColumns ?? ideaData?.groups ?? []

    const saveIdeaMutation = useMutation({
        mutationFn: async (idea: IdeaType) => {
            const response = await fetch("/api/idea", {
                method: "POST",
                keepalive: true,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: idea.id,
                    title: idea.title,
                    description: idea.description,
                    groupId: idea.groupId ?? idea.columnId,
                    images: idea.images,
                    sortOrder: idea.sortOrder
                })
            })
            if (!response.ok) throw new Error("Failed to save idea");
            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["ideas"] })
            setLocalColumns(null)
        },
        onError: (error) => {
            console.error("Failed to save idea:", error)
            toast.error("Échec de l'enregistrement de l'idée")
        }
    })

    const deleteIdeaMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/idea/${id}`, {
                method: "DELETE",
            })
            if (!res.ok) throw new Error("Failed to delete idea")
            return res.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["ideas"] })
            setLocalColumns(null)
        },
        onError: (error) => {
            console.error("Failed to delete idea", error);
            toast.error("Échec de la suppression de l'idée")
        }
    })


    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const sourceColumn = columns.find(col => col.id === source.droppableId);
        const destinationColumn = columns.find(col => col.id === destination.droppableId);

        if (!sourceColumn || !destinationColumn) return;
        if (source.droppableId === destination.droppableId) {
            const newIdeas = [...sourceColumn.ideas]

            const [movedIdea] = newIdeas.splice(source.index, 1)
            movedIdea.sortOrder = destination.index;
            newIdeas.splice(destination.index, 0, movedIdea)

            const newColumns = columns.map(col =>
                col.id === sourceColumn.id ? { ...col, ideas: newIdeas } : col
            )
            setLocalColumns(newColumns)

            saveIdeaMutation.mutate({
                ...movedIdea,
                sortOrder: destination.index
            })
        } else {
            const sourceIdeas = [...sourceColumn.ideas];
            const destIdeas = [...destinationColumn.ideas];

            const [movedIdea] = sourceIdeas.splice(source.index, 1)

            movedIdea.sortOrder = destination.index;
            movedIdea.columnId = destination.droppableId;

            destIdeas.splice(destination.index, 0, movedIdea)

            const newColumns = columns.map(col => {
                if (col.id === sourceColumn.id) {
                    return { ...col, ideas: sourceIdeas }
                }
                if (col.id === destinationColumn.id) {
                    return { ...col, ideas: destIdeas }
                }
                return col
            })

            setLocalColumns(newColumns)

            saveIdeaMutation.mutate({
                ...movedIdea,
                columnId: destination.droppableId,
                sortOrder: destination.index
            })
        }
    }

    const handleAddIdea = (columnId: string) => {
        setSelectedIdea(null)
        setSelectedColumnId(columnId)
        setShowIdeaDialog(true)
    }

    const handleEditIdea = (idea: IdeaType, columnId: string) => {
        setSelectedIdea(idea)
        setSelectedColumnId(columnId)
        setShowIdeaDialog(true)
    }

    const handleSaveIdea = (idea: IdeaType) => {
        const nextGroupId = idea.groupId ?? idea.columnId ?? ((selectedColumnId || columns[0]?.id) ?? "")
        const normalizedIdea = {
            ...idea,
            groupId: nextGroupId,
            columnId: nextGroupId,
        }

        if (idea.id) {
            const newColumns = columns.map((col) => ({
                ...col,
                ideas: col.ideas.map((ideaCol) => (ideaCol.id === idea.id) ? {
                    ...ideaCol,
                    ...normalizedIdea
                } : ideaCol)
            }))
            setLocalColumns(newColumns)
        } else {
            const newIdea = { ...normalizedIdea, id: `temp-${Date.now()}` }
            const newColumn = columns.map((col) =>
                col.id === nextGroupId ? {
                    ...col,
                    ideas: [newIdea, ...col.ideas]
                }
                    : col
            )
            setLocalColumns(newColumn)
        }

        saveIdeaMutation.mutate(normalizedIdea, {
            onSuccess: () => {
                setSelectedIdea(null);
                setShowIdeaDialog(false)
            }
        })
    }

    const handleDeleteIdea = (columnId: string, ideaId: string) => {
        if (!ideaId) return;
        const newColumns = columns.map((col) =>
            col.id === columnId
                ? {
                    ...col,
                    ideas: col.ideas.filter((idea) => idea.id !== ideaId)
                }
                : col
        )
        setLocalColumns(newColumns)

        if (!ideaId.startsWith('temp-')) {
            deleteIdeaMutation.mutate(ideaId)
        }
    }

    const handleGeneratedIdea = (title: string, description: string) => {
        const targetColumnId = columns[0]?.id;
        if (!targetColumnId) return;

        const newIdea: IdeaType = {
            id: `temp-${Date.now()}`,
            title,
            description,
            columnId: targetColumnId,
        };

        const newColumns = columns.map((col) =>
            col.id === targetColumnId
                ? {
                    ...col,
                    ideas: [newIdea, ...col.ideas]
                }
                : col
        )
        setLocalColumns(newColumns);
        saveIdeaMutation.mutate({
            title: title,
            description: description,
            groupId: targetColumnId,
            columnId: targetColumnId,
            sortOrder: 0
        });
    }

    const totalIdeas = columns.reduce((total, column) => total + column.ideas.length, 0)

    return (
        <>
            <div className="flex min-h-0 flex-col gap-5">
                <header className="relative isolate overflow-hidden rounded-[28px] border border-[#25351f] bg-[#11190f] px-5 py-5 text-white shadow-[0_22px_60px_rgba(27,48,18,0.14)] sm:px-7 sm:py-6">
                    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(196,242,100,0.16),transparent_50%)]" />
                    <div aria-hidden="true" className="absolute -right-10 -top-24 size-72 rounded-full border border-white/[0.08]" />
                    <div aria-hidden="true" className="absolute -right-2 -top-16 size-56 rounded-full border border-primary/15" />
                    <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[42%] md:block">
                        <Image
                            src="/images/lemon-orbit.png"
                            alt=""
                            fill
                            sizes="(max-width: 768px) 0px, 40vw"
                            className="object-cover object-right opacity-80 mix-blend-screen"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#11190f] via-[#11190f]/45 to-transparent" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d7f99d]">
                                <Sparkles className="size-3.5" />
                                Le laboratoire créatif
                            </div>
                            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
                                Faites éclore <span className="text-[#c4f264]">vos idées.</span>
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                                Capturez l&apos;étincelle, façonnez votre prochaine histoire, puis faites-la voyager sur tous vos canaux.
                            </p>
                            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em]">
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-white/75">
                                    {totalIdeas} idée{totalIdeas > 1 ? "s" : ""} en mouvement
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-white/50">
                                    {columns.length} étapes de création
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch lg:flex-row">
                            <GenerateIdeasPopover onGenerated={handleGeneratedIdea} />
                            <Button
                                className="h-10 gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_8px_24px_rgba(163,230,53,0.18)] hover:-translate-y-0.5 hover:bg-primary"
                                onClick={() => handleAddIdea(columns[0]?.id ?? "")}
                            >
                                <Plus className="size-3.5" />
                                Nouvelle idée
                                <ArrowUpRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </header>


                <div className="h-[min(68vh,760px)] min-h-[360px]">
                    <div className="kanban--board relative flex h-full min-h-0 flex-1 overflow-hidden">
                        {isPending ? (
                            <div className="flex gap-3 w-full h-full items-start">
                                {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="flex h-full min-h-0 w-[252px] shrink-0 flex-col rounded-3xl border border-border/70 bg-card/70 p-3 shadow-sm">
                                        <div className="flex items-center justify-between pb-3 px-1">
                                            <Skeleton className="h-4 w-20 rounded-full" />
                                            <Skeleton className="h-5 w-6 rounded-full" />
                                        </div>
                                        <div className="flex-1 space-y-2.5">
                                            <Skeleton className="h-[100px] w-full rounded-xl" />
                                            <Skeleton className="h-[120px] w-full rounded-xl" />
                                            <Skeleton className="h-[80px] w-full rounded-xl" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full overflow-x-auto pb-2">
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <div
                                        style={{ height: "100%" }}
                                        className="flex gap-3 w-full"
                                    >
                                        {columns?.map((column) => (
                                            <div
                                                key={column.id}
                                                className="flex h-full min-h-0 w-[252px] shrink-0 flex-col rounded-3xl border border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur-sm"
                                            >
                                                <div className="flex items-center justify-between px-2 pt-2 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-foreground/65">
                                                            {column.title}
                                                        </h3>
                                                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                                            {column.ideas.length}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-6 rounded-lg hover:bg-white/8"
                                                        onClick={() => handleAddIdea(column.id)}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>


                                                <Droppable droppableId={column.id}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            className={cn(
                                                                "flex-1 overflow-y-auto overflow-x-hidden p-1 transition-all duration-200 min-h-0 rounded-xl",
                                                                snapshot.isDraggingOver
                                                                    ? "bg-primary/8 ring-1 ring-primary/25 ring-inset"
                                                                    : "bg-transparent",
                                                            )}
                                                        >

                                    <div className="flex flex-col gap-2.5">
                                    {column.ideas.length === 0 && (
                                        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/60 px-4 text-center">
                                            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-accent-foreground">
                                                <Sparkles className="size-4" />
                                            </div>
                                            <p className="text-xs font-semibold text-foreground/75">Tout commence par un déclic.</p>
                                            <p className="mt-1 max-w-[170px] text-[11px] leading-5 text-muted-foreground">Gardez cet espace libre pour votre prochaine grande idée.</p>
                                        </div>
                                    )}
                                    {column?.ideas.map((idea, index) => (
                                        <Draggable
                                            key={idea.id || `idea-${index}`}
                                            draggableId={idea.id || `idea-${index}`}
                                            index={index}>

                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={cn(
                                                        "group cursor-grab! rounded-2xl! border-border/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing!",
                                                        snapshot.isDragging &&
                                                        "scale-[0.98] rotate-1 shadow-xl", 
                                                    )}
                                                    onClick={() => handleEditIdea(idea, column.id)}
                                                >
                                                    <CardContent>
                                                        {idea.images && idea.images?.length > 0 && (
                                                            <div className="grid grid-cols-4 gap-1 mb-2">
                                                                {idea.images.slice(0, 4).map((image, index) => (
                                                                    <Image
                                                                        key={index}
                                                                        src={image.url}
                                                                        alt={idea.title}
                                                                        width={120}
                                                                        height={48}
                                                                        unoptimized
                                                                        className="h-12 w-full rounded-lg border border-border/70 object-cover"
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        <CardHeader className="mb-1 p-0">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <h4 className="font-semibold text-sm">{idea.title}</h4>
                                                                </div>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => handleEditIdea(idea, column.id)}>
                                                                            Modifier
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            className="text-destructive"
                                                                            disabled={deleteIdeaMutation.isPending}
                                                                            onSelect={() => {
                                                                                handleDeleteIdea(
                                                                                    column.id,
                                                                                    idea.id || ""
                                                                                )
                                                                            }}
                                                                        >
                                                                            Supprimer
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </CardHeader>

                                                        {idea.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {idea.description}
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))}
                                    </div>

                                    <button
                                        onClick={() => handleAddIdea(column.id)}
                                        className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Nouvelle idée
                                    </button>

                                    {provided.placeholder}
                                    </div>
                                                    )}
                                                </Droppable>
                                            </div>

                                        ))}
                                    </div>
                                </DragDropContext>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <IdeaDialog
                open={showIdeaDialog}
                onOpenChange={(open) => {
                    setShowIdeaDialog(open)
                }}
                idea={selectedIdea ?? undefined}
                isSaving={saveIdeaMutation.isPending}
                selectedColumnId={selectedColumnId || columns[0]?.id || ""}
                columns={columns?.map((col) => ({
                    id: col.id,
                    title: col.title
                }))}
                onSave={handleSaveIdea}
            />
        </>
    )
}

export default IdeaKanban
