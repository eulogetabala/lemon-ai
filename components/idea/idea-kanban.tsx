"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Plus } from "lucide-react"
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { ImageObject } from "@/types/post.type"
import { Badge } from "../ui/badge"
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
    const [columns, setColumns] = useState<Column[]>([])
    const [showIdeaDialog, setShowIdeaDialog] = useState<boolean>(false)
    const [selectedIdea, setSelectedIdea] = useState<IdeaType | null>(null)
    const [selectedColumnId, setSelectedColumnId] = useState<string>("")

    const { data: ideaData, isPending } = useQuery({
        queryKey: ["ideas"],
        queryFn: async () => {
            const res = await fetch("/api/idea")
            if (!res.ok) throw new Error("Failed to fetch ideas")
            return res.json()
        },
    })

    useEffect(() => {
        if (ideaData?.groups) {
            setColumns(ideaData.groups)
        }
    }, [ideaData])

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideas"] })
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideas"] })
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
            setColumns(newColumns)

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

            setColumns(newColumns)

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
            setColumns(newColumns)
        } else {
            const newIdea = { ...normalizedIdea, id: `temp-${Date.now()}` }
            const newColumn = columns.map((col) =>
                col.id === nextGroupId ? {
                    ...col,
                    ideas: [newIdea, ...col.ideas]
                }
                    : col
            )
            setColumns(newColumn)
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
        setColumns(newColumns)

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
        setColumns(newColumns);
        saveIdeaMutation.mutate({
            title: title,
            description: description,
            groupId: targetColumnId,
            columnId: targetColumnId,
            sortOrder: 0
        });
    }

    return (
        <>
            <div className="flex flex-col overflow-hidden">
                <header className="flex items-center justify-between px-2 pt-4 pb-3">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-foreground">Idées</h1>
                        <p className="text-xs text-foreground/40 mt-0.5">
                            Capturez et organisez vos idées de contenu
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <GenerateIdeasPopover onGenerated={handleGeneratedIdea} />
                        <Button
                            className="rounded-full h-8 px-4 text-xs gap-1.5 font-semibold"
                            onClick={() => handleAddIdea(columns[0]?.id ?? "")}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nouvelle idée
                        </Button>
                    </div>
                </header>


                <div className="h-[calc(100vh-120px)]">
                    <div className="kanban--board relative py-4 flex-1 h-full overflow-hidden">
                        {isPending ? (
                            <div className="flex gap-3 w-full h-full items-start">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="shrink-0 w-[270px] flex flex-col h-full min-h-0
                                    rounded-2xl border border-white/8 bg-white/[0.02] dark:bg-[#0d1526]/60 p-3">
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
                                                className="shrink-0 w-[270px] flex flex-col h-full min-h-0
                                                rounded-2xl border border-white/[0.07] bg-white/[0.025] dark:bg-[#0a1120]/50 p-3"
                                            >
                                                <div className="flex items-center justify-between px-2 pt-2 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/50">
                                                            {column.title}
                                                        </h3>
                                                        <span className="inline-flex items-center justify-center size-5 rounded-full bg-white/8 text-[10px] font-bold text-foreground/40">
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

                                    <div className="space-y-2">
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
                                                        "group cursor-pointer! shadow-sm rounded-sm! active:cursor-grabbing transform transition-all",
                                                        snapshot.isDragging &&
                                                        "scale-95 rotate-1 shadow-lg",
                                                    )}
                                                    onClick={() => handleEditIdea(idea, column.id)}
                                                >
                                                    <CardContent>
                                                        {idea.images && idea.images?.length > 0 && (
                                                            <div className="grid grid-cols-4 gap-1 mb-2">
                                                                {idea.images.slice(0, 4).map((image, index) => (
                                                                    <img
                                                                        key={index}
                                                                        src={image.url}
                                                                        alt={idea.title}
                                                                        className="w-full h-12 rounded object-cover 
                                    border"
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
                                        className="w-full h-10 mt-2 rounded-xl border border-dashed border-white/10 text-xs text-foreground/30 hover:text-foreground/60 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-200 flex items-center justify-center gap-1.5"
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