
"use client"
import { Suspense,useState, useEffect } from 'react'
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation'
import { ChannelType, ConnectedAccountType } from '@/types/channel.type';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
    const [fbPickerOpen, setFbPickerOpen] = useState(false)

    const { data: channelsData, isPending } = useQuery({
        queryKey: ["channels"],
        queryFn: async () => {
            const res = await fetch("/api/channel");
            const data = await res.json();
            return data
        }
    })
    const channels = (channelsData?.channels || []) as ChannelType[]
    const accounts = (channelsData?.accounts || []) as ConnectedAccountType[]

    useEffect(() => {
        const connected = searchParams.get("connected")
        const error = searchParams.get("error")
        const channelType = searchParams.get("channelType")
        const fbPageSelect = searchParams.get("fb_page_select")

        if (fbPageSelect === "true") {
            setFbPickerOpen(true)
            return
        }

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
                <div className='relative border-b border-hairline px-5 py-4'>
                    <div className='absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lemon/40 to-transparent' />
                    <h2 className='text-sm font-extrabold tracking-tight text-ink'>Canaux</h2>
                    <p className='text-xs text-mute mt-0.5'>Connectez vos comptes de réseaux sociaux pour commencer à planifier</p>
                </div>
                <div className='p-4 space-y-2'>
                        {isPending ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className='flex items-center justify-between rounded-xl border border-hairline bg-mist/20 p-4'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-8 rounded-lg bg-mist animate-pulse' />
                                        <div className='h-4 w-24 bg-mist rounded-full animate-pulse' />
                                    </div>
                                    <div className='h-8 w-20 bg-mist rounded-full animate-pulse' />
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
                                        <div key={channel.id} className='rounded-xl border p-4 space-y-3'>
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
                                                        <div className='absolute -right-1 -bottom-1 bg-white dark:bg-background rounded-full p-0.5'>
                                                            <div className='size-2.5 bg-[#27C93F] rounded-full' />
                                                        </div>
                                                    </span>
                                                    <span className='font-medium'>{channel.name}</span>
                                                </div>

                                                <Button size="sm"
                                                    disabled={connectMutation.isPending}
                                                    onClick={() => handleConnect(channel.id!)}
                                                    className='rounded-full bg-ink text-lemon hover:bg-ink/90 font-bold text-xs h-8 px-4'
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
                                        className='flex items-center justify-between rounded-xl border border-hairline bg-white dark:bg-card p-4'
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

                                                <div className={cn(`absolute -right-1 bottom-0 p-0.5 bg-white dark:bg-background rounded-xs
                                           `,
                                                    {
                                                        "bg-transparent p-0 rounded-full -bottom-1 -right-0.5": channel.connected
                                                    }
                                                )}>
                                                    {channel.connected ? (
                                                        <div className='size-2.5 bg-[#27C93F] rounded-full' />
                                                    ) : (
                                                        <HugeiconsIcon icon={PlusSignIcon} className="size-2!" />
                                                    )}
                                                </div>
                                            </span>

                                            <span className='font-medium'>{channel.name}</span>
                                        </div>

                                        <Button
                                            variant={channel.connected ? "destructive" : "default"}
                                            size="sm"
                                            disabled={connectMutation.isPending || disconnectMutation.isPending}
                                            onClick={() => channel.connected ? handleDisconnect(channel.user_channel_id!) : handleConnect(channel.id!)}
                                            className={cn(
                                              'rounded-full font-bold text-xs h-8 px-4',
                                              channel.connected
                                                ? 'bg-stamp/10 text-stamp border border-stamp/25 hover:bg-stamp hover:text-white'
                                                : 'bg-ink text-lemon hover:bg-ink/90'
                                            )}
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
                </div>
            </div>

            <FacebookPagePicker
                open={fbPickerOpen}
                onOpenChange={setFbPickerOpen}
                onSelected={() => {
                    setFbPickerOpen(false)
                    router.replace("/settings")
                }}
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
