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
import { Calendar, CreditCard, Lightbulb, Plus, PlusCircleIcon, Settings, TrendingUp } from 'lucide-react';
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
  { name: "Idées", href: "/ideas", icon: Lightbulb },
  { name: "Planning", href: "/schedule", icon: Calendar },
  { name: "Veille", href: "/competitor-watch", icon: TrendingUp },
  { name: "Facturation", href: "/billing", icon: CreditCard },
  { name: "Paramètres", href: "/settings", icon: Settings },
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className={cn("p-4 pb-5", isCollapsed && "p-2")}>
          <div className="flex items-center justify-between gap-2">
            <Logo hideName={isCollapsed} />
            <SidebarTrigger className="size-8 rounded-xl border border-sidebar-border text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          </div>

          <Button
            className={cn(
              "mt-5 h-11 w-full justify-start gap-2.5 rounded-2xl bg-gradient-to-r from-[#c4f264] to-[#9bd83c] font-bold tracking-tight text-[#17200f] shadow-[0_10px_26px_rgba(163,230,53,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(163,230,53,0.24)]",
              isCollapsed && "justify-center px-0"
            )}
            size={isCollapsed ? "icon" : "default"}
            onClick={() => setIsCreatePostOpen(true)}
          >
            <Plus className="size-4 shrink-0" />
            {!isCollapsed && <span>Nouvelle publication</span>}
          </Button>
        </SidebarHeader>

        {/* ── Nav Items ── */}
        <SidebarContent className={cn(!isCollapsed && "px-2")}>
          <SidebarGroup className="px-2 pt-2">
            {!isCollapsed && <SidebarGroupLabel className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/35">Votre studio</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mainNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={cn(
                          "h-10 rounded-2xl border border-transparent font-medium transition-all duration-200",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(196,242,100,0.06)]"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-2.5">
                          <item.icon className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-sidebar-foreground/45"
                          )} />
                          <span className='text-sm'>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Separator ── */}
          {!isCollapsed && (
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent my-1" />
          )}

          {/* ── Connected Channels ── */}
          {connectedChannels.length > 0 && (
            <SidebarGroup className={cn(isCollapsed && "px-1")}>
              {!isCollapsed && (
                <SidebarGroupLabel className='text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/35 px-2 mb-1'>
                  Canaux connectés
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {isPending ? (
                    <div className='flex flex-col gap-1.5 px-1'>
                      <Skeleton className='h-8 w-full bg-sidebar-accent' />
                      <Skeleton className='h-8 w-full bg-sidebar-accent' />
                      <Skeleton className='h-8 w-full bg-sidebar-accent' />
                    </div>
                  ) : (
                    connectedChannels?.map((channel: ChannelType) => {
                      const profileUrl = buildChannelProfileUrl(channel.type, channel.handle, channel.profile_url)
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            className="rounded-xl h-9 hover:bg-sidebar-accent transition-colors"
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
                                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-400 ring-[1.5px] ring-sidebar animate-status-pulse" />
                                </div>
                                {!isCollapsed && (
                                  <span className="truncate text-sm text-sidebar-foreground/80">
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
                                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-400 ring-[1.5px] ring-sidebar animate-status-pulse" />
                                </div>
                                {!isCollapsed && (
                                  <span className="truncate text-sm text-sidebar-foreground/80">
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
              <SidebarGroupLabel className='text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/35 px-2 mb-1'>
                Connecter des canaux
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {isPending ? (
                  <div className='flex flex-col gap-1.5 px-1'>
                    <Skeleton className='h-8 w-full bg-sidebar-accent' />
                    <Skeleton className='h-8 w-full bg-sidebar-accent' />
                    <Skeleton className='h-8 w-full bg-sidebar-accent' />
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
                            className="rounded-xl h-9 hover:bg-sidebar-accent transition-colors"
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
                                      className="text-white! size-6! p-1 rounded-lg opacity-70"
                                      style={{ background: channel.color }}
                                    />
                                  ) : null}
                                  <div className={`absolute -right-1 bottom-0 p-0.5
                                    bg-sidebar dark:bg-sidebar rounded-sm
                                  `}>
                                    <HugeiconsIcon icon={PlusSignIcon} className="size-2! text-sidebar-foreground/60" />
                                  </div>
                                </div>
                              </span>
                              {!isCollapsed && (
                                <span className='truncate text-sm text-sidebar-foreground/60'>{channel.name}</span>
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
                          className='w-full flex items-center gap-2.5 rounded-xl h-9 hover:bg-sidebar-accent transition-colors px-2 text-sidebar-foreground/45 hover:text-sidebar-foreground/70'
                        >
                          <PlusCircleIcon className='size-4 shrink-0' />
                          {!isCollapsed && <span className='text-sm'>Plus de canaux</span>}
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
        <SidebarFooter className="p-3">
          {/* Channel count indicator */}
          {!isCollapsed && (
            <div className="mb-2 px-2">
              <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/35 mb-1">
                <span className="uppercase tracking-widest font-semibold">Canaux</span>
                <span>{connectedCount}/{totalChannels}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-sidebar-accent overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#84cc16] transition-all duration-500"
                  style={{ width: totalChannels > 0 ? `${(connectedCount / totalChannels) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* User profile card */}
          <div className={cn(
            "flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-sidebar-accent cursor-pointer",
            isCollapsed && "justify-center"
          )}>
            <UserButton
              showName={false}
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7 rounded-lg ring-1 ring-primary/20",
                },
              }}
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-sidebar-foreground/90 truncate leading-tight">
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
