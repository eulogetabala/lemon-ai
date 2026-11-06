"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Plus, Lightbulb, Search, LayoutGrid, ListFilter, Layers } from "lucide-react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import IdeaDialog from "./idea-dialog"
import { IdeaType } from "@/types/idea.type"
import { GenerateIdeasPopover } from "./generate-ideas-popover"

type Column = {
    id: string
    title: string
    ideas: IdeaType[]
}

const columnColors: Record<string, string> = {
    "À explorer": "bg-lemon/20 text-moss border-lemon/30",
    "En cours": "bg-[#E8F0FE] text-[#1A4A8A] border-[#1A4A8A]/20",
    "Validée": "bg-[#E8F5E9] text-moss border-moss/20",
    "Archivée": "bg-mist text-mute border-hairline",
}

const IdeaKanban = () => {
    const queryClient = useQueryClient()
    const [localColumns, setLocalColumns] = useState<Column[]>([])
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

    const columns = localColumns.length > 0 ? localColumns : (ideaData?.groups ?? []) as Column[]

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

    const totalIdeas = columns.reduce((sum, col) => sum + col.ideas.length, 0)

    return (
        <>
            <div className="flex min-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[26px] bg-[#f3f5f2]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e7e0] bg-[#f8faf6]/80 px-4 py-3 backdrop-blur-sm sm:px-5">
                    <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-[#dde3d9] bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        <Search className="size-4 text-[#6b7369]" />
                        <input
                            value=""
                            readOnly
                            placeholder="Rechercher une idée, un contenu..."
                            className="w-full border-0 bg-transparent text-sm text-[#3b433d] placeholder:text-[#7b837d] focus:outline-none"
                        />
                        <span className="rounded-md border border-[#e1e5df] bg-[#f4f7f3] px-1.5 py-0.5 text-[10px] font-semibold text-[#5d675d]">⌘K</span>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-auto">
                        <span className="hidden rounded-full border border-[#dfe5dd] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#405742] sm:inline-flex">
                            {totalIdeas} idées
                        </span>
                        <button className="inline-flex items-center gap-2 rounded-full border border-[#dfe5dd] bg-white px-3 py-2 text-[12px] font-semibold text-[#1a1f1b] shadow-sm transition hover:bg-[#f5f7f3]">
                            <LayoutGrid className="size-3.5" />
                            Tableau
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-full border border-[#dfe5dd] bg-white px-3 py-2 text-[12px] font-semibold text-[#1a1f1b] shadow-sm transition hover:bg-[#f5f7f3]">
                            <ListFilter className="size-3.5" />
                            Liste
                        </button>
                        <GenerateIdeasPopover onGenerated={handleGeneratedIdea} />
                        <Button
                            className="h-9 rounded-full bg-[#0d1714] px-4 text-[12px] font-bold text-white hover:bg-[#142b25]"
                            onClick={() => handleAddIdea(columns[0]?.id ?? "")}
                        >
                            <Plus className="mr-1.5 size-3.5" />
                            Nouvelle idée
                        </Button>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
                    <div className="flex items-center gap-3 pb-1">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-[#dfe9d8] bg-[#eef6e4] text-[#1f4d2d]">
                            <Lightbulb className="size-[18px]" />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-extrabold tracking-[-0.04em] text-[#171c18]">Idées</h1>
                            <p className="text-[13px] text-[#5a655d]">Capturez et organisez vos idées de contenu</p>
                        </div>
                    </div>

                    <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
                        <div className="h-full overflow-hidden rounded-[24px] border border-[#e0e6de] bg-[#eef2ec] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            {isPending ? (
                                <div className="grid h-full gap-3 md:grid-cols-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="rounded-[18px] border border-[#e2e6e0] bg-white p-3 shadow-sm">
                                            <Skeleton className="mb-3 h-7 w-24 rounded-full" />
                                            <div className="space-y-2.5">
                                                <Skeleton className="h-20 w-full rounded-xl" />
                                                <Skeleton className="h-24 w-full rounded-xl" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full overflow-x-auto pb-2">
                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <div className="flex h-full min-h-[420px] gap-3">
                                            {columns?.map((column) => {
                                                const colorClass = columnColors[column.title] ?? "bg-mist text-mute border-hairline"

                                                return (
                                                    <div
                                                        key={column.id}
                                                        className="flex min-h-[420px] w-[270px] shrink-0 flex-col rounded-[20px] border border-[#dfe5dd] bg-[#f7faf6] p-3 shadow-[0_8px_18px_-16px_rgba(17,20,16,0.25)]"
                                                    >
                                                        <div className="mb-3 flex items-center justify-between px-1 pt-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]", colorClass)}>
                                                                    {column.title}
                                                                </span>
                                                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef1eb] px-1.5 text-[10px] font-bold text-[#525a54]">
                                                                    {column.ideas.length}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddIdea(column.id)}
                                                                className="inline-flex size-7 items-center justify-center rounded-full border border-[#e1e7e0] bg-white text-[#1c201d] hover:bg-[#f3f7f2]"
                                                            >
                                                                <Plus className="size-3.5" />
                                                            </button>
                                                        </div>

                                                        <Droppable droppableId={column.id}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.droppableProps}
                                                                    className={cn(
                                                                        "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[16px] p-1 transition-all duration-200",
                                                                        snapshot.isDraggingOver && "bg-[#edf6d9]/60 ring-1 ring-[#d5ef7d]"
                                                                    )}
                                                                >
                                                                    {column?.ideas.map((idea, index) => (
                                                                        <Draggable key={idea.id || `idea-${index}`} draggableId={idea.id || `idea-${index}`} index={index}>
                                                                            {(provided, snapshot) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    className={cn(
                                                                                        "group rounded-[16px] border border-[#dfe5dd] bg-white p-3 text-left shadow-[0_10px_14px_-18px_rgba(17,20,16,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d7efc5] hover:shadow-[0_18px_24px_-20px_rgba(17,20,16,0.3)]",
                                                                                        snapshot.isDragging && "scale-[0.98] border-[#d4ef8b]"
                                                                                    )}
                                                                                    onClick={() => handleEditIdea(idea, column.id)}
                                                                                >
                                                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                                                        <h3 className="text-[13px] font-bold leading-snug text-[#171c18]">{idea.title}</h3>
                                                                                        <DropdownMenu>
                                                                                            <DropdownMenuTrigger asChild>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="inline-flex size-6 items-center justify-center rounded-md text-[#66716a] opacity-0 transition group-hover:opacity-100 hover:bg-[#f3f6f2]"
                                                                                                >
                                                                                                    <MoreHorizontal className="size-3.5" />
                                                                                                </button>
                                                                                            </DropdownMenuTrigger>
                                                                                            <DropdownMenuContent>
                                                                                                <DropdownMenuItem onClick={() => handleEditIdea(idea, column.id)}>Modifier</DropdownMenuItem>
                                                                                                <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteIdea(column.id, idea.id || "")}>Supprimer</DropdownMenuItem>
                                                                                            </DropdownMenuContent>
                                                                                        </DropdownMenu>
                                                                                    </div>

                                                                                    {idea.description && (
                                                                                        <p className="text-[12px] leading-relaxed text-[#59635d]">{idea.description}</p>
                                                                                    )}

                                                                                    <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-[#67736b]">
                                                                                        <span className="inline-flex items-center rounded-full border border-[#e3e7e1] bg-[#f5f7f3] px-2 py-1">{idea.title.includes('React') ? 'React' : idea.title.includes('JavaScript') ? 'JavaScript' : 'Idée'}</span>
                                                                                        <span className="inline-flex items-center rounded-full border border-[#e3e7e1] bg-[#f5f7f3] px-2 py-1">3 min</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </DragDropContext>
                                </div>
                            )}
                        </div>

                        <aside className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-[#FF5722] text-white">
                                            <Layers className="size-4" />
                                        </div>
                                        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-900">Content Studio</span>
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">Guide</span>
                                </div>

                                <h2 className="text-[17px] font-black tracking-tight text-slate-900">Transformez vos idées en contenu prêt à diffuser</h2>
                                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">Chaque idée peut être déclinée en carrousel, post court ou thread adapté à vos canaux.</p>

                                <div className="mt-4 rounded-[16px] border border-[#d7e7d0] bg-white p-3">
                                    <div className="flex items-center justify-between text-[12px] font-semibold text-[#2c3a2d]">
                                        <span>Objectif</span>
                                        <span className="text-[#1f6a3d]">9/10</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1eb]">
                                        <div className="h-full w-[75%] rounded-full bg-[#b7e87f]" />
                                    </div>
                                </div>

                                <div className="mt-5 space-y-2">
                                    {[
                                        "Vos objectifs",
                                        "Éduquer la communauté",
                                        "Renforcer votre personal brand",
                                        "Créer des opportunités"
                                    ].map((item) => (
                                        <div key={item} className="flex items-center gap-2 rounded-full border border-[#dbe3d9] bg-white/80 px-2.5 py-2 text-[12px] text-[#27322d]">
                                            <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#d9f7b2] text-[10px] text-[#234b2b]">✓</span>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
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