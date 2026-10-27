
"use client"
import { Suspense, useEffect } from 'react'
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, RadioTower, RefreshCw } from 'lucide-react'
import { ChannelType, ConnectedAccountType } from '@/types/channel.type';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { Skeleton } from '../ui/skeleton';
import { getChannelIcon } from '@/constants/channels';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { FacebookPagePicker } from './facebook-page-picker';
import ChannelAvatar from '../channel-avatar';

function ChannelTabContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const fbPickerOpen = searchParams.get("fb_page_select") === "true"

    const { data: channelsData, isPending, isError, refetch } = useQuery({
        queryKey: ["channels"],
        queryFn: async () => {
            const res = await fetch("/api/channel");
            if (!res.ok) throw new Error("Impossible de charger les canaux");
            return res.json();
        }
    })
    const channels = (channelsData?.channels || []) as ChannelType[]
    const accounts = (channelsData?.accounts || []) as ConnectedAccountType[]
    const connectedCount = channelsData?.connectedCount ?? channels.filter((channel) => channel.connected).length
    const totalChannels = channelsData?.totalChannels ?? channels.length

    useEffect(() => {
        const connected = searchParams.get("connected")
        const error = searchParams.get("error")
        const channelType = searchParams.get("channelType")
        const fbPageSelect = searchParams.get("fb_page_select")

        if (fbPageSelect === "true") return

        if (connected === null && !error) return
        queryClient.invalidateQueries({ queryKey: ["channels"] })

        if (connected === "true") {
            toast.success(`Connexion réussie${channelType ? ` à ${channelType}` : ""}`)
        } else if (error) {
            toast.error(error || `Échec de la connexion${channelType ? ` à ${channelType}` : ""}`)
        } else if (connected === "false") {
            toast.error(`Échec de la connexion${channelType ? ` à ${channelType}` : ""}`)
        }
    }, [queryClient, searchParams])

    const connectMutation = useMutation({
        mutationFn: async ({ channelTypeId, targetWindow }: { channelTypeId: string; targetWindow: Window | null }) => {
            const res = await fetch("/api/channel/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelTypeId }),
            })
            const data = await res.json()
            if (!res.ok) {
                // Close the blank tab if request failed
                targetWindow?.close()
                throw new Error(data.error || "Échec du démarrage de la connexion")
            }
            return { ...data, targetWindow }
        },
        onSuccess: ({ url, targetWindow }) => {
            if (targetWindow && !targetWindow.closed) {
                targetWindow.location.href = url
            } else {
                // Popup was blocked — fallback to same tab
                window.location.href = url
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || "Échec du démarrage de la connexion")
        },
    })

    const disconnectMutation = useMutation({
        mutationFn: async (userChannelId: string) => {
            const res = await fetch("/api/channel/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userChannelId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Échec de la déconnexion")
            return data
        },
        onSuccess: () => {
            toast.success("Canal déconnecté avec succès")
            queryClient.invalidateQueries({ queryKey: ["channels"] })
        },
        onError: (error: Error) => {
            console.error("Disconnect error:", error)
            toast.error("Échec de la déconnexion du canal")
        },
    })

    const handleConnect = (channelTypeId: string) => {
        if (!channelTypeId) return
        if (connectMutation.isPending) return
        // Open blank tab NOW (synchronous = popup blockers won't fire)
        // Then fill it with the OAuth URL once the API responds
        const targetWindow = window.open("", "_blank")
        connectMutation.mutate({ channelTypeId, targetWindow })
    }
    const handleDisconnect = (userChannelId: string) => {
        if (!userChannelId) return
        if (disconnectMutation.isPending) return
        disconnectMutation.mutate(userChannelId)
    }
    return (
        <>
            <Card className="overflow-hidden rounded-[30px] border-border/70 bg-card shadow-sm">
                <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-accent/20 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Écosystème social</p>
                        <CardTitle className="mt-1 text-xl">Un seul studio. Tous vos réseaux.</CardTitle>
                        <CardDescription className="mt-1">
                            Reliez vos comptes pour planifier, publier et suivre vos contenus au même endroit.
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold">
                        {isPending ? "Chargement…" : isError ? "Indisponible" : `${connectedCount} / ${totalChannels} connectés`}
                    </Badge>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {isError ? (
                        <div role="alert" className="flex flex-col gap-4 rounded-3xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                                    <AlertCircle className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Impossible de charger vos réseaux</p>
                                    <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">Le service de données ne répond pas. Réessayez dans un instant.</p>
                                </div>
                            </div>
                            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => void refetch()}>
                                <RefreshCw className="size-4" />
                                Réessayer
                            </Button>
                        </div>
                    ) : !isPending && channels.length === 0 ? (
                        <Empty className="min-h-64 rounded-3xl border border-dashed border-border/80 bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon" className="size-14 rounded-2xl bg-accent text-accent-foreground">
                                    <RadioTower className="size-6" />
                                </EmptyMedia>
                                <EmptyTitle className="text-xl font-extrabold">La scène est prête.</EmptyTitle>
                                <EmptyDescription>Les plateformes disponibles apparaîtront ici dès que la liste des canaux sera configurée.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => void refetch()}>
                                    <RefreshCw className="size-4" />
                                    Recharger la liste
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                        {isPending ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className='flex items-center justify-between rounded-xl border p-4'>
                                    <div className='flex items-center gap-3'>
                                        <Skeleton className='size-6 rounded-sm bg-secondary' />
                                        <Skeleton className='h-5 w-24 bg-secondary' />
                                    </div>
                                    <Skeleton className='h-8 w-20 bg-secondary' />
                                </div>
                            ))
                        ) : (
                            channels?.map((channel) => {
                                const icon = getChannelIcon(channel.type)
                                const isFacebook = channel.type === "FACEBOOK"
                                const facebookAccounts = isFacebook
                                    ? accounts.filter((account) => account.channel_type_id === channel.id)
                                    : []

                                if (isFacebook && facebookAccounts.length > 0) {
                                    return (
                                        <div key={channel.id} className='space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-primary/30'>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-3'>
                                                    <span className='relative'>
                                                        {icon ? (
                                                            <HugeiconsIcon icon={icon}
                                                                color='currentColor'
                                                                className=" text-white! size-6! p-1 rounded-sm"
                                                                style={{ background: channel.color }}
                                                            />
                                                        ) : null}
                                                        <div className='absolute -right-1 -bottom-1 bg-card rounded-full p-0.5'>
                                                            <div className='size-2.5 bg-primary rounded-full' />
                                                        </div>
                                                    </span>
                                                    <span className='font-medium'>{channel.name}</span>
                                                </div>

                                                <Button size="sm" className="rounded-xl font-semibold"
                                                    disabled={connectMutation.isPending}
                                                    onClick={() => handleConnect(channel.id!)}
                                                >
                                                    {connectMutation.isPending && connectMutation.variables?.channelTypeId === channel.id && (
                                                        <Spinner className='size-4' />
                                                    )}
                                                    + Ajouter une page
                                                </Button>
                                            </div>

                                            <div className='space-y-2 pl-9'>
                                                {facebookAccounts.map((account) => (
                                                    <div key={account.id} className='flex items-center justify-between'>
                                                        <ChannelAvatar
                                                            size="sm"
                                                            type={account.type}
                                                            color={account.color}
                                                            profileImage={account.profile_image}
                                                            name={account.handle || account.name}
                                                        />
                                                        <Button variant="destructive" size="sm"
                                                            disabled={disconnectMutation.isPending}
                                                            onClick={() => handleDisconnect(account.id)}
                                                        >
                                                            {disconnectMutation.isPending && disconnectMutation.variables === account.id && (
                                                                <Spinner className='size-4' />
                                                            )}
                                                            Déconnecter
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={channel.id}
                                        className='flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-primary/30'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <span className='relative'>
                                                {icon ? (
                                                    <HugeiconsIcon icon={icon}
                                                        color='currentColor'
                                                        className=" text-white! size-6! p-1 rounded-sm"
                                                        style={{ background: channel.color }}
                                                    />
                                                ) : null}

                                                <div className={cn(`absolute -right-1 bottom-0 p-0.5 bg-card rounded-xs
                                           `,
                                                    {
                                                        "bg-transparent p-0 rounded-full -bottom-1 -right-0.5": channel.connected
                                                    }
                                                )}>
                                                    {channel.connected ? (
                                                        <div className='size-2.5 bg-primary rounded-full' />
                                                    ) : (
                                                        <HugeiconsIcon icon={PlusSignIcon} className="size-2!" />
                                                    )}
                                                </div>
                                            </span>

                                            <span className='font-medium'>{channel.name}</span>
                                        </div>

                                        <Button variant={channel.connected ? "destructive" : "default"} size="sm" className="rounded-xl font-semibold"
                                            disabled={connectMutation.isPending || disconnectMutation.isPending}
                                            onClick={() => channel.connected ? handleDisconnect(channel.user_channel_id!) : handleConnect(channel.id!)}
                                        >
                                            {((connectMutation.isPending && connectMutation.variables?.channelTypeId === channel.id) ||
                                              (disconnectMutation.isPending && disconnectMutation.variables === channel.user_channel_id)) && (
                                                <Spinner className='size-4' />
                                            )}
                                            {channel.connected ? "Déconnecter" : "Connecter"}
                                        </Button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                    )}
                </CardContent>
            </Card>

            <FacebookPagePicker
                open={fbPickerOpen}
                onOpenChange={(open) => {
                    if (!open) router.replace("/settings")
                }}
                onSelected={() => router.replace("/settings")}
            />
        </>
    )
}






const ChannelsTab = () => {
    return (
        <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement des canaux...</div>}>
            <ChannelTabContent />
        </Suspense>
    )
}

export default ChannelsTab;
