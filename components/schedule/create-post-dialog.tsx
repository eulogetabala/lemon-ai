"use client"
import React, { useEffect, useMemo, useState } from "react";
import { format, parse, set } from "date-fns"
import { getChannelIcon } from "@/constants/channels";
import { ConnectedAccountType } from "@/types/channel.type";
import { ImageObject } from "@/types/post.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Lightbulb, ScanEye, Wand2 } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { toast } from "sonner";
import { toggleVariants } from "../ui/toggle";
import ChannelAvatar from "../channel-avatar";
import ContentTextarea from "../content-textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import IdeasList from "./ideas-list";
import PreviewPanel from "./preview";
import { ButtonGroup } from "../ui/button-group";
import { POST_STATUS, PostStatus } from "@/constants/post";
import { ScheduleDatePicker } from "./schedule-date-picker";
import Link from "next/link";
import { Spinner } from "../ui/spinner";
import { AIAssistant } from "./ai-assitant";
import { getPlainTextLength, stripRichTextFormatting } from "@/lib/rich-text";

type PropsType = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate?: Date | null
}

type ChannelContent = {
    title: string
    text: string
    images: ImageObject[]
}

type ActionTabType = "ideas" | "ai" | "preview"

const rightTabs = [
    { id: "ideas" as ActionTabType, label: "Idées", icon: Lightbulb },
    { id: "ai" as ActionTabType, label: "Assistant IA", icon: Wand2 },
    { id: "preview" as ActionTabType, label: "Aperçu", icon: ScanEye },
]


const CreatePostDialog = ({ open, onOpenChange, selectedDate }: PropsType) => {

    const queryClient = useQueryClient();
    const [globalContent, setGlobalContent] = useState<ChannelContent>({ title: "", text: "", images: [] })
    const [channelContent, setChannelContent] = useState<Record<string, ChannelContent>>({})
    const [selectedChannels, setSelectedChannels] = useState<string[]>([])
    const [selectedRightTab, setSelectedRightTab] = useState<ActionTabType | null>(null)
    const [activePreview, setActivePreview] = useState<string>("")
    const [activeAccordion, setActiveAccordion] = useState<string>("")
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [timeSlot, setTimeSlot] = useState<string>("")

    const { data, isPending } = useQuery({
        queryKey: ["channels"],
        queryFn: async () => {
            const res = await fetch("/api/channel");
            const data = await res.json();
            return data
        },
    });

    const channelsData = data?.accounts ?? []
    const hasConnectedChannel = channelsData.length > 0

    const channels = useMemo(() => {
        if (isPending) {
            return []
        }
        return (channelsData || []).map((channel: any) => ({
            ...channel,
            icon: getChannelIcon(channel.type)
        })) as ConnectedAccountType[]
    }, [isPending, channelsData])

     useEffect(() => {
       if(selectedDate){
        setDate(selectedDate)
       }
    }, [selectedDate])

   
    useEffect(() => {
        if (channels.length > 0 && Object.keys(channelContent).length === 0) {
            const initialContent: Record<string, ChannelContent> = {}
            channels.forEach(channel => {
                initialContent[channel.id] = { title: "", text: "", images: [] }
            })
            setChannelContent(initialContent)
        }
    }, [channels])

    const connectedChannels = channels
    const selectedChannelsList = channels.filter((channel) => selectedChannels.includes(channel.id))
    const previewChannel = channels.find((c) => c.id === activePreview) ?? null;
    const previewContent = channelContent?.[activePreview] ?? { title: "", text: "", images: [] }

    const createPostMutation = useMutation({
        mutationFn: async ({ posts, scheduledAt, status }:
            { posts: any[], scheduledAt: string, status?: PostStatus }) => {
            const response = await fetch("/api/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    posts,
                    scheduledAt,
                    status
                })
            });
            if (!response.ok) {
                throw new Error("Failed to create posts");
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`${data.posts.length} publication(s) ${variables.status === POST_STATUS.DRAFT ? 'enregistrée(s) en brouillon' : 'planifiée(s)'} avec succès`);
            queryClient.invalidateQueries({
                predicate: (query) => query.queryKey[0] === "posts",
            });
            handleOpenChange(false)
        },
        onError: (error: any) => {
            console.log("failed to create post", error)
            toast.error("Échec de l'enregistrement de la publication")
        }
    })

    const handleSelectRightTab = (tab: ActionTabType) => {
        setSelectedRightTab((prev) => (prev === tab ? null : tab));
    }

    const handleSelectAll = () => {
        setSelectedChannels((prev) => {
            if (prev.length === connectedChannels.length) {
                setActivePreview("")
                return []
            }

            setChannelContent((prev) => {
                const update = { ...prev }
                const hasGlobalContent = Boolean(globalContent.title || globalContent.text || globalContent.images.length)
                connectedChannels.forEach((channel) => {
                    const existing = update[channel.id]
                    const channelIsEmpty = !existing || (!existing.title && !existing.text && !existing.images.length)

                    if (channelIsEmpty && hasGlobalContent) {
                        const limit = Number(channel.character_limit);

                        update[channel.id] = {
                            title: globalContent.title,
                            text: globalContent.text.slice(0, limit),
                            images: [...globalContent.images]
                        }
                    } else if (!existing) {
                        update[channel.id] = { title: "", text: "", images: [] }
                    }
                })
                return update;
            })
            return connectedChannels.map(channel => channel.id)
        })
    }

    const handleGlobalContentChange = (text: string, images?: ImageObject[], title?: string) => {
        setGlobalContent((prev) => ({
            ...prev,
            title: title ?? prev.title,
            text,
            images: images || prev.images
        }))
    }

    const handleAccordionChange = (value: string) => {
        setActiveAccordion(value)
        setActivePreview(value)
    }

    const handleTextChange = (
        channelId: string,
        text: string,
        character_limit: number
    ) => {
        const limit = Number(character_limit);
        if (getPlainTextLength(text) <= limit) {
            setChannelContent((prev) => ({
                ...prev,
                [channelId]: {
                    ...(prev[channelId] ?? { title: "", text: "", images: [] }),
                    text
                }
            }))
        }
    }

    const handleTitleChange = (channelId: string, title: string) => {
        setChannelContent((prev) => ({
            ...prev,
            [channelId]: {
                ...(prev[channelId] ?? { title: "", text: "", images: [] }),
                title,
            }
        }))
    }

    const toggleChannel = (channelId: string, character_limit: number) => {
        setSelectedChannels((prev) => {
            if (prev.includes(channelId) && activePreview === channelId) setActivePreview("")
            const isSelected = prev.includes(channelId);

            const newChannels = isSelected ? prev.filter((id) => id != channelId) : [...prev, channelId];

            if (!isSelected) {
                const existing = channelContent[channelId]
                const channelIsEmpty = !existing || (!existing.title && !existing.text && !existing.images?.length)
                const hasGlobalContent = Boolean(globalContent.title || globalContent.text || globalContent.images.length)

                if (channelIsEmpty && hasGlobalContent) {
                    const limit = Number(character_limit);
                    setChannelContent((prev) => ({
                        ...prev,
                        [channelId]: {
                            ...prev[channelId],
                            title: globalContent.title,
                            text: globalContent.text.slice(0, limit),
                            images: [...globalContent.images]
                        }
                    }))
                }
            } else {
                setChannelContent((prev) => ({
                    ...prev,
                    [channelId]: { title: "", text: "", images: [] }
                }))
            }
            return newChannels;
        })

        if (!selectedChannels.includes(channelId)) {
            setActiveAccordion(channelId)
            setActivePreview(channelId)
        }
    }

    const handleIdeaSelect = (idea: any) => {
        if (!hasConnectedChannel) {
            toast.error("Connectez au moins un canal pour ajouter une idée")
            return
        }
        if (selectedChannels.length === 0) {
            setGlobalContent({
                title: idea.title || "",
                text: idea.description || "",
                images: idea.images || []
            })
            return
        }
        setChannelContent((prev) => {
            return ({
                ...prev,
                [activeAccordion]: {
                    title: idea.title || "",
                    text: idea.description || "",
                    images: idea.images || []
                }
            })
        })
    }

    const handleCreatePost = (status?: PostStatus) => {
        if (selectedChannels.length === 0) {
            toast.error("Sélectionnez au moins un canal")
            return;
        }
        const postToCreate = selectedChannelsList.map((channel) => {
            const content = channelContent[channel.id] ?? { title: "", text: "", images: [] }
            const finalContent = [content.title, content.text].filter((value) => stripRichTextFormatting(value).trim()).join("\n\n")
            return {
                userChannelId: channel.id,
                content: finalContent,
                images: content.images
            }
        })
        if (postToCreate.some((post) => !stripRichTextFormatting(post.content).trim())) {
            toast.error("Chaque canal sélectionné doit avoir du contenu")
            return
        }

        const parsedTime = parse(timeSlot, "h:mm a", new Date());
        const scheduleAt = set(date || new Date(), {
            hours: parsedTime.getHours(),
            minutes: parsedTime.getMinutes(),
            seconds: 0,
            milliseconds: 0
        })

        createPostMutation.mutate({
            posts: postToCreate,
            scheduledAt: scheduleAt.toISOString(),
            status
        })
    }


    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        setGlobalContent({ title: "", text: "", images: [] });
        setChannelContent({});
        setActiveAccordion("")
        setActivePreview("")
        setSelectedRightTab(null)
        setDate(new Date())
        setTimeSlot("")
        setSelectedChannels([])
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "sm:w-full sm:min-w-[700px] gap-0 px-0 pt-0 pb-0",
                selectedRightTab && "sm:max-w-[950px]"
            )}>
                <div>
                    <DialogHeader className="px-8 py-3 border-b">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="font-semibold">Créer une publication</DialogTitle>
                            <div className="flex items-center gap-px">
                                {rightTabs.map((tab) => (
                                    <Button
                                        key={tab.id}
                                        variant={selectedRightTab === tab.id ? "default" : "ghost"}
                                        className={cn(!selectedRightTab && "size-8")}
                                        onClick={() => handleSelectRightTab(tab.id)}
                                    >
                                        <tab.icon className="size-4" />
                                        <span className={cn(!selectedRightTab && "hidden")}> {tab.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </DialogHeader>


                    <div className="w-full flex flex-1 min-w-0 overflow-hidden h-[580px]">

                        {/* Left — channel list */}
                        <div className="flex flex-1 flex-col min-w-0 w-[300px] pb-5">
                            <div className="channel--selector py-5  px-8">
                                {channels?.length > 0 && !isPending && (
                                    <button
                                        className="mb-4 text-[13px] font-medium cursor-pointer"
                                        onClick={handleSelectAll}
                                    >
                                        {selectedChannels.length === connectedChannels.length ? "Tout désélectionner" : "Tout sélectionner"}
                                    </button>
                                )}
                                <div className="flex flex-wrap gap-4">
                                    {isPending ? (
                                        Array.from({ length: 6 }).map((_, index) => (
                                            <Skeleton key={index} className="size-[50px] rounded-xl" />
                                        ))
                                    ) : (
                                        channels?.map((channel) => {
                                            const selected = selectedChannels.includes(channel.id)
                                            return (
                                                <Tooltip key={channel.id}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            style={{ "--channel-color": channel.color } as React.CSSProperties}
                                                            className={cn(
                                                                "relative shrink-0 rounded-xl p-0 transition-all cursor-pointer",
                                                                selected ? "ring-2 ring-(--channel-color) ring-offset-1" : "grayscale!"
                                                            )}
                                                            onClick={() => {
                                                                toggleChannel(
                                                                    channel.id,
                                                                    channel.character_limit
                                                                )
                                                            }}>

                                                            <ChannelAvatar
                                                                className=""
                                                                type={channel.type}
                                                                color={channel.color}
                                                                profileImage={channel.profile_image}
                                                            />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Aperçu {channel.handle || channel.name}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="channel--content relative 
                                        flex flex-col px-8 min-h-[300px] 
                                        h-full overflow-y-auto">
                                {selectedChannels.length === 0 ? (
                                    <div className="border rounded-xl p-4">
                                        <ContentTextarea
                                            value={globalContent?.text || ""}
                                            title={globalContent?.title || ""}
                                            images={globalContent?.images || []}
                                            placeholder="Rédigez votre contenu principal ici... Il sera copié vers les canaux lorsque vous les sélectionnerez"
                                            minHeight={270}
                                            showAIAssistant={true}
                                            disabled={!hasConnectedChannel}
                                            showTitleInput={true}
                                            contentClass="text-sm placeholder:opacity-50 pt-0!"
                                            onChange={(text) => handleGlobalContentChange(text, globalContent.images, globalContent.title)}
                                            onTitleChange={(title) => handleGlobalContentChange(globalContent.text, globalContent.images, title)}
                                            onImagesChange={(images) =>
                                                handleGlobalContentChange(globalContent.text, images, globalContent.title)
                                            }
                                        />
                                    </div>
                                ) : (
                                    <Accordion
                                        type="single"
                                        collapsible
                                        value={activeAccordion}
                                        className="w-full space-y-3"
                                        onValueChange={(val) => {
                                            handleAccordionChange(val)
                                        }}
                                    >
                                        {selectedChannelsList?.map((channel) => {
                                            const content = channelContent[channel.id] || { title: "", text: "", images: [] };
                                            const isExpanded = activeAccordion === channel.id;
                                            const icon = getChannelIcon(channel.type);
                                            return (
                                                <AccordionItem
                                                    key={channel.id}
                                                    value={channel.id}
                                                    className="border rounded-xl"
                                                >
                                                    {!isExpanded && (
                                                        <AccordionTrigger
                                                            className="w-full px-3 cursor-pointer [&>svg]:hidden! hover:bg-muted
hover:no-underline! justify-start gap-3 
"
                                                        >
                                                            <span>
                                                                <HugeiconsIcon
                                                                    icon={icon}
                                                                    className={cn(
                                                                        "shrink-0 text-white! size-5! p-[3px] rounded-sm",
                                                                    )}
                                                                    style={{ background: channel.color }}
                                                                />
                                                            </span>
                                                            {content.title || content.text ? (
                                                                <p className="text-sm text-muted-foreground/80 
truncate flex-1 text-left max-w-[400px]">
                                                                    {stripRichTextFormatting(content.title ? `${content.title}\n\n${content.text}` : content.text)}
                                                                </p>
                                                            ) : (
                                                                <p className="text-sm tex-muted">Que souhaitez-vous partager ?</p>
                                                            )}
                                                        </AccordionTrigger>
                                                    )}

                                                    <AccordionContent className="overflow-visible">
                                                        <div className="flex pt-3 px-3 gap-3">
                                                            {isExpanded && (
                                                                <span>
                                                                    <HugeiconsIcon
                                                                        icon={icon}
                                                                        className={cn(
                                                                            "shrink-0 text-white! size-5! p-[3px] rounded-sm",
                                                                        )}
                                                                        style={{ background: channel.color }}
                                                                    />
                                                                </span>
                                                            )}

                                                            <div className="flex-1">
                                                                {!content?.title && !content?.text && !content?.images?.length && (
                                                                    <div className="w-full flex items-center gap-2 rounded-md
bg-[#ffefd0] px-3 py-1 text-xs text-amber-700
dark:bg-amber-950/40
dark:text-amber-400">
                                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                                        <p>Veuillez inclure au moins du texte ou une pièce jointe.</p>
                                                                    </div>
                                                                )}

                                                                <ContentTextarea
                                                                    value={content?.text || ""}
                                                                    title={content?.title || ""}
                                                                    images={content?.images || []}
                                                                    placeholder="Commencez à écrire ou laissez-vous inspirer par l'IA"
                                                                    minHeight={260}
                                                                    contentClass="text-sm placeholder:opacity-50 pt-0"
                                                                    showAIAssistant={true}
                                                                    showTitleInput={true}
                                                                    onAIAssistantClick={() => {
                                                                        setSelectedRightTab("ai")
                                                                    }}
                                                                    onChange={(text) => handleTextChange(
                                                                        channel.id, text, channel.character_limit
                                                                    )}
                                                                    onTitleChange={(title) => handleTitleChange(channel.id, title)}
                                                                    onImagesChange={(images) => {
                                                                        setChannelContent((prev) => (
                                                                            {
                                                                                ...prev,
                                                                                [channel.id]: {
                                                                                    ...content,
                                                                                    images,
                                                                                }
                                                                            }
                                                                        ))
                                                                    }}

                                                                    renderToolbarRight={
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={cn(
                                                                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                                                (getPlainTextLength(content?.text || "") >= Number(channel.character_limit) * 0.9)
                                                                                    ? "bg-orange-100 text-orange-600"
                                                                                    : "bg-muted text-muted-foreground"
                                                                            )}>
                                                                                {getPlainTextLength(content?.text || "")} / {channel.character_limit}
                                                                            </span>
                                                                        </div>
                                                                    }

                                                                />
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                )}

                            </div>
                        </div>


                        {/* Right — channel preview */}
                        {selectedRightTab && (
                            <div className="w-[350px] flex flex-col shrink-0 border-l border-border
            bg-muted/30 h-full
            ">
                                <div className="py-4 flex-1 flex flex-col h-full">
                                    {selectedRightTab === "ai" && (
                                        <div className="px-6">
                                            <AIAssistant 
                            content={stripRichTextFormatting(channelContent[activeAccordion]?.text || 
                                globalContent?.text || "")}
                            channelId={channels.find((c) => c.id === activeAccordion)?.channel_type_id}
                            onGenerate={(content:any) => {
                                if(globalContent?.text){
                                    setGlobalContent((prev) => ({
                                        ...prev,
                                        text: content,
                                    }))
                                }
                                setChannelContent((prev) => ({
                                ...prev,
                                [activeAccordion]: {
                                    ...prev[activeAccordion],
                                    text: content,
                                }
                                }))
                            }}
                        />
                                        </div>
                                    )}

                                    {selectedRightTab === "ideas" && (
                                        <IdeasList
                                            onSelect={handleIdeaSelect}
                                        />
                                    )}

                                    {selectedRightTab === "preview" && (
                                        <PreviewPanel
                                            channel={previewChannel}
                                            content={previewContent}
                                        />
                                    )}
                                </div>
                            </div>

                        )}

                    </div>
                </div>

                <DialogFooter className="px-8 pt-5 pb-4 m-0!">
                    {hasConnectedChannel ? (
                        <div className="w-full flex items-center justify-between
                        gap-2
                        ">
                            <Button
                                size="lg"
                                variant="ghost"
                                disabled={createPostMutation.isPending}
                                onClick={() => handleCreatePost(POST_STATUS.DRAFT)}
                            >
                                {createPostMutation.isPending && createPostMutation.variables.status === POST_STATUS.DRAFT && <Spinner />}
                                Enregistrer le brouillon
                            </Button>
                            <ButtonGroup className="p-0!">
                                <ScheduleDatePicker
                                    date={date}
                                    setDate={setDate}
                                    time={timeSlot}
                                    setTime={setTimeSlot}
                                    renderButton={(isDatePassed, isTimeNotAvailable) => <Button
                                        size="lg"
                                        className="border py-4.5 px-4"
                                        disabled={createPostMutation.isPending || !date || !timeSlot || isDatePassed || isTimeNotAvailable}
                                        onClick={() => {
                                            if (isDatePassed || isTimeNotAvailable) {
                                                toast.error("Veuillez sélectionner une date et une heure valides")
                                                return;
                                            }
                                            handleCreatePost()
                                        }}
                                    >
                                        {createPostMutation.isPending && createPostMutation.variables.status === undefined && <Spinner />}
                                        Planifier la publication
                                    </Button>}

                                />
                            </ButtonGroup>
                        </div>
                    ) : (
                        <Button size="lg" asChild>
                            <Link href="/settings">Connectez un canal pour publier</Link>
                        </Button>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}

export default CreatePostDialog
