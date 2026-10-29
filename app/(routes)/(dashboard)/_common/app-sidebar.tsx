"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Calendar, CreditCard, Lightbulb, Plus, PlusCircleIcon, Settings, TrendingUp, Sparkles } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getChannelIcon } from '@/constants/channels';
import { buildChannelProfileUrl } from '@/lib/channel-urls';
import { ChannelType } from '@/types/channel.type';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { UserButton, useUser } from '@clerk/nextjs';
import ChannelAvatar from '@/components/channel-avatar';
import { toast } from 'sonner';
import { useState } from 'react';
import CreatePostDialog from '@/components/schedule/create-post-dialog';

const mainNav = [
  { name: "Idées", href: "/ideas", icon: Lightbulb, description: "Capturer" },
  { name: "Planning", href: "/schedule", icon: Calendar, description: "Organiser" },
  { name: "Veille", href: "/competitor-watch", icon: TrendingUp, description: "Surveiller" },
  { name: "Facturation", href: "/billing", icon: CreditCard, description: "Gérer" },
  { name: "Paramètres", href: "/settings", icon: Settings, description: "Configurer" },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { user } = useUser()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false)

  const connectMutation = useMutation({
    mutationFn: async (channelTypeId: string) => {
      const res = await fetch("/api/channel/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelTypeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Échec de la connexion du canal")
      }
      return data
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: () => {
      toast.error("Échec de la connexion du canal")
    }
  })

  const { data: channelsData, isPending } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      const data = await res.json();
      return data
    }
  })

  const channels = (channelsData?.channels || []) as ChannelType[]
  const unconnectedChannels = channels.filter((channel: ChannelType) => !channel.connected);
  const connectedChannels = channels.filter((channel: ChannelType) => channel.connected);
  const connectedCount = channelsData?.connectedCount || 0;
  const totalChannels = channelsData?.totalChannels || 0;
  const limitedChannels = unconnectedChannels.slice(0, 4);

  const handleConnect = (channelTypeId: string) => {
    if (connectMutation.isPending) return;
    connectMutation.mutate(channelTypeId);
  }

  return (
    <>
      <Sidebar collapsible="icon">
        {/* ── Header ── */}
        <SidebarHeader className={cn(
          "relative overflow-hidden border-b border-sidebar-border",
          isCollapsed ? "p-2" : "p-4 pb-3"
        )}>
          {/* Subtle grid background on header */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(17,20,16,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,20,16,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className='relative flex items-center justify-between'>
            <Logo hideName={isCollapsed} />
            <SidebarTrigger className="hidden md:flex -mx-8 mb-0 hover:bg-sidebar-accent transition-colors rounded-md" />
          </div>

          {/* Create post CTA — lemon glow style matching landing */}
          <Button
            className={cn(
              'relative mt-4 w-full rounded-full font-bold tracking-tight transition-all duration-200',
              'bg-lemon text-ink hover:bg-lemon/90',
              'shadow-[0_8px_24px_-6px_rgba(198,255,26,0.45)]',
              'hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(198,255,26,0.55)]',
              isCollapsed ? 'size-9 p-0 rounded-xl' : 'h-10'
            )}
            size={isCollapsed ? "icon" : "default"}
            onClick={() => setIsCreatePostOpen(true)}
          >
            <Plus className="size-4 shrink-0" />
            {!isCollapsed && <span>Nouvelle publication</span>}
          </Button>
        </SidebarHeader>

        {/* ── Nav Items ── */}
        <SidebarContent className={cn(
          "relative",
          !isCollapsed && "px-2 pt-3"
        )}>
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className='tag-code text-sidebar-foreground/30 px-3 mb-2'>
                Navigation
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mainNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={cn(
                          "relative rounded-xl h-10 transition-all duration-200 font-semibold text-sm group/nav-item",
                          isActive
                            ? "bg-lemon/15 text-ink border border-lemon/30"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 border border-transparent"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          {/* Active indicator bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-lemon rounded-r-full" />
                          )}
                          <item.icon className={cn(
                            "size-[18px] shrink-0 transition-colors",
                            isActive ? "text-moss" : "text-sidebar-foreground/35 group-hover/nav-item:text-sidebar-foreground/60"
                          )} />
                          <div className="flex flex-col min-w-0">
                            <span className={cn(
                              "leading-tight",
                              isActive && "text-ink"
                            )}>{item.name}</span>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Separator — hairline style ── */}
          {!isCollapsed && (
            <div className="mx-3 h-px bg-sidebar-border/60 my-2" />
          )}

          {/* ── Connected Channels ── */}
          {connectedChannels.length > 0 && (
            <SidebarGroup className={cn(isCollapsed && "px-1")}>
              {!isCollapsed && (
                <SidebarGroupLabel className='tag-code text-sidebar-foreground/30 px-3 mb-1.5'>
                  Canaux connectés
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {isPending ? (
                    <div className='flex flex-col gap-1.5 px-1'>
                      <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                      <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                      <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                    </div>
                  ) : (
                    connectedChannels?.map((channel: ChannelType) => {
                      const profileUrl = buildChannelProfileUrl(channel.type, channel.handle, channel.profile_url)
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            className="rounded-xl h-9 hover:bg-sidebar-accent/80 transition-all duration-200 border border-transparent hover:border-sidebar-border/50"
                          >
                            {profileUrl ? (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full! relative flex items-center gap-2.5"
                              >
                                {/* Connected status dot */}
                                <div className="relative shrink-0">
                                  <ChannelAvatar
                                    size="sm"
                                    type={channel.type}
                                    color={channel.color}
                                    profileImage={channel.profile_image}
                                    name=""
                                  />
                                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#27C93F] ring-2 ring-sidebar animate-pulse-soft" />
                                </div>
                                {!isCollapsed && (
                                  <span className="truncate text-sm font-medium text-sidebar-foreground/70">
                                    {channel.handle || channel.name}
                                  </span>
                                )}
                              </a>
                            ) : (
                              <div className="w-full! relative flex items-center gap-2.5">
                                <div className="relative shrink-0">
                                  <ChannelAvatar
                                    size="sm"
                                    type={channel.type}
                                    color={channel.color}
                                    profileImage={channel.profile_image}
                                    name=""
                                  />
                                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#27C93F] ring-2 ring-sidebar animate-pulse-soft" />
                                </div>
                                {!isCollapsed && (
                                  <span className="truncate text-sm font-medium text-sidebar-foreground/70">
                                    {channel.handle || channel.name}
                                  </span>
                                )}
                              </div>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* ── Unconnected Channels ── */}
          <SidebarGroup className={cn(isCollapsed && "px-1")}>
            {!isCollapsed && (
              <SidebarGroupLabel className='tag-code text-sidebar-foreground/30 px-3 mb-1.5'>
                Connecter des canaux
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {isPending ? (
                  <div className='flex flex-col gap-1.5 px-1'>
                    <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                    <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                    <Skeleton className='h-9 w-full rounded-xl bg-sidebar-accent' />
                  </div>
                ) : (
                  <>
                    {limitedChannels.map((channel: ChannelType) => {
                      const icon = getChannelIcon(channel.type)
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            tooltip={`Connecter ${channel.name}`}
                            className="rounded-xl h-9 hover:bg-sidebar-accent/80 transition-all duration-200 border border-transparent hover:border-sidebar-border/50"
                          >
                            <button
                              className='w-full flex items-center gap-2.5'
                              disabled={connectMutation.isPending}
                              onClick={() => handleConnect(channel.id)}
                            >
                              <span>
                                <div className='relative'>
                                  {icon ? (
                                    <HugeiconsIcon
                                      icon={icon}
                                      color='currentColor'
                                      className="text-white! size-6! p-1 rounded-lg opacity-60"
                                      style={{ background: channel.color }}
                                    />
                                  ) : null}
                                  <div className={`absolute -right-1 bottom-0 p-0.5
                                    bg-sidebar dark:bg-sidebar rounded-sm
                                  `}>
                                    <HugeiconsIcon icon={PlusSignIcon} className="size-2! text-sidebar-foreground/50" />
                                  </div>
                                </div>
                              </span>
                              {!isCollapsed && (
                                <span className='truncate text-sm font-medium text-sidebar-foreground/45'>{channel.name}</span>
                              )}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}

                    {/* "More channels" link */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/settings"
                          className='w-full flex items-center gap-2.5 rounded-xl h-9 hover:bg-sidebar-accent/80 transition-all duration-200 px-2 text-sidebar-foreground/35 hover:text-sidebar-foreground/60 border border-transparent hover:border-sidebar-border/50'
                        >
                          <PlusCircleIcon className='size-4 shrink-0' />
                          {!isCollapsed && <span className='text-sm font-medium'>Plus de canaux</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="relative p-3 border-t border-sidebar-border">
          {/* Channel count indicator — editorial progress bar */}
          {!isCollapsed && (
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between mb-2">
                <span className="tag-code text-sidebar-foreground/35">Canaux</span>
                <span className="tag-code text-sidebar-foreground/50 tabular-nums">{connectedCount}/{totalChannels}</span>
              </div>
              {/* Progress bar — lemon fill */}
              <div className="h-1 w-full rounded-full bg-sidebar-accent overflow-hidden">
                <div
                  className="h-full rounded-full bg-lemon transition-all duration-700 ease-out"
                  style={{ width: totalChannels > 0 ? `${(connectedCount / totalChannels) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* User profile card — editorial feel */}
          <div className={cn(
            "flex items-center gap-2.5 rounded-xl p-2.5 transition-all duration-200",
            "hover:bg-sidebar-accent/80 cursor-pointer border border-transparent hover:border-sidebar-border/50",
            isCollapsed && "justify-center p-2"
          )}>
            <UserButton
              showName={false}
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 rounded-xl ring-2 ring-lemon/20",
                },
              }}
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-sidebar-foreground/85 truncate leading-tight">
                  {user?.fullName || "Mon compte"}
                </span>
                <span className="text-[10px] text-sidebar-foreground/40 truncate leading-tight">
                  {user?.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <CreatePostDialog
        open={isCreatePostOpen}
        onOpenChange={setIsCreatePostOpen}
      />
    </>
  )
}

export default AppSidebar