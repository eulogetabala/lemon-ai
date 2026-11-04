"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
import ChannelAvatar from '@/components/channel-avatar';
import { toast } from 'sonner';
import { useState } from 'react';
import CreatePostDialog from '@/components/schedule/create-post-dialog';

const mainNav = [
  { name: "Idées",       href: "/ideas",            icon: Lightbulb,  description: "Capturer"   },
  { name: "Planning",    href: "/schedule",          icon: Calendar,   description: "Organiser"  },
  { name: "Veille",      href: "/competitor-watch",  icon: TrendingUp, description: "Surveiller" },
  { name: "Facturation", href: "/billing",           icon: CreditCard, description: "Gérer"      },
  { name: "Paramètres",  href: "/settings",          icon: Settings,   description: "Configurer" },
];

const AppSidebar = () => {
  const pathname   = usePathname();
  const { state }  = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);

  const connectMutation = useMutation({
    mutationFn: async (channelTypeId: string) => {
      const res  = await fetch("/api/channel/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelTypeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la connexion du canal");
      return data;
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError:   ()        => { toast.error("Échec de la connexion du canal"); },
  });

  const { data: channelsData, isPending } = useQuery({
    queryKey: ["channels"],
    queryFn:  async () => {
      const res  = await fetch("/api/channel");
      return res.json();
    },
  });

  const channels           = (channelsData?.channels || []) as ChannelType[];
  const unconnectedChannels = channels.filter((c: ChannelType) => !c.connected);
  const connectedChannels   = channels.filter((c: ChannelType) =>  c.connected);
  const limitedChannels     = unconnectedChannels.slice(0, 4);

  const handleConnect = (channelTypeId: string) => {
    if (connectMutation.isPending) return;
    connectMutation.mutate(channelTypeId);
  };

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="sidebar-premium h-svh border-none text-white"
        style={{ background: "linear-gradient(160deg, #0d2b1f 0%, #0a2318 50%, #081a13 100%)" }}
      >
        {/* ── Déco ambiance ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-30 blur-[80px]"
          style={{ background: "radial-gradient(circle, #c6ff1a 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full opacity-15 blur-[60px]"
          style={{ background: "radial-gradient(circle, #2dff7e 0%, transparent 65%)" }}
        />

        <SidebarContent className={cn("relative flex flex-col gap-0 overflow-y-auto py-5 scrollbar-none", isCollapsed ? "px-2" : "px-3")}>

          {/* ── Logo + trigger ── */}
          <div className={cn("mb-6 flex items-center", isCollapsed ? "justify-center" : "justify-between px-1")}>
            <Logo hideName={isCollapsed} />
            <SidebarTrigger className={cn(
              "hidden h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-white/70 backdrop-blur-sm",
              "transition-all duration-200 hover:bg-white/10 hover:text-white md:flex",
              isCollapsed && "hidden"
            )} />
          </div>

          {/* ── CTA ── */}
          <Button
            className={cn(
              "sidebar-cta mb-6 w-full rounded-2xl border-0 font-semibold tracking-tight",
              "bg-[#c6ff1a] text-[#0a1a0d] shadow-[0_0_24px_-4px_rgba(198,255,26,0.55)]",
              "transition-all duration-300 hover:bg-[#d4ff45] hover:shadow-[0_0_36px_-4px_rgba(198,255,26,0.75)] hover:-translate-y-0.5",
              "active:translate-y-0 active:shadow-none",
              isCollapsed ? "size-10 rounded-xl p-0" : "h-10"
            )}
            size={isCollapsed ? "icon" : "default"}
            onClick={() => setIsCreatePostOpen(true)}
          >
            <Plus className="size-4 shrink-0" />
            {!isCollapsed && <span className="ml-1.5">Nouvelle publication</span>}
          </Button>

          {/* ── Navigation principale ── */}
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <ul className="flex w-full flex-col gap-1">
                {mainNav.map((item, i) => {
                  const isActive = pathname === item.href;
                  return (
                    <li
                      key={item.name}
                      style={{ animationDelay: `${i * 55}ms` }}
                      className="animate-slide-in-up"
                    >
                      <Link
                        href={item.href}
                        style={isActive ? {
                          background: '#ffffff',
                          boxShadow: '0 4px 24px -6px rgba(255,255,255,0.25)',
                        } : undefined}
                        className={cn(
                          "group relative flex h-11 w-full items-center gap-3 rounded-2xl px-3 transition-all duration-200",
                          isActive
                            ? "text-[#0d2b1f]"
                            : "bg-transparent text-white/50 hover:bg-white/12 hover:text-white"
                        )}
                      >
                        {/* Icône */}
                        <span className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-[#0d2b1f]/10 text-[#0a7c30]"
                            : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                        )}>
                          <item.icon className="size-[15px]" />
                        </span>

                        {!isCollapsed && (
                          <span className="flex min-w-0 flex-col">
                            <span className={cn(
                              "text-[13.5px] font-semibold leading-none tracking-[-0.01em]",
                              isActive ? "text-[#0a2318]" : "text-inherit"
                            )}>
                              {item.name}
                            </span>
                            <span className={cn(
                              "mt-[3px] text-[9px] font-semibold uppercase tracking-[0.15em]",
                              isActive ? "text-[#1a5c35]/60" : "text-white/30 group-hover:text-white/50"
                            )}>
                              {item.description}
                            </span>
                          </span>
                        )}

                        {/* Point actif */}
                        {isActive && !isCollapsed && (
                          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[#1aab54] shadow-[0_0_6px_1px_rgba(26,171,84,0.7)]" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Séparateur ── */}
          {!isCollapsed && (
            <div className="mx-1 my-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          )}
          {isCollapsed && <div className="my-3" />}

          {/* ── Canaux connectés ── */}
          {connectedChannels.length > 0 && (
            <SidebarGroup className="p-0">
              {!isCollapsed && (
                <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                  Connectés
                </p>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {isPending ? (
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-9 w-full rounded-xl bg-white/5" />
                      <Skeleton className="h-9 w-full rounded-xl bg-white/5" />
                    </div>
                  ) : connectedChannels.map((channel: ChannelType) => {
                    const profileUrl = buildChannelProfileUrl(channel.type, channel.handle, channel.profile_url);
                    const inner = (
                      <>
                        <div className="relative shrink-0">
                          <ChannelAvatar size="sm" type={channel.type} color={channel.color} profileImage={channel.profile_image} name="" />
                          <span className="animate-status-pulse absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#0a2318] bg-[#27C93F]" />
                        </div>
                        {!isCollapsed && (
                          <span className="truncate text-[13px] font-medium text-white/60 transition-colors group-hover:text-[#0d2b1f]">
                            {channel.handle || channel.name}
                          </span>
                        )}
                      </>
                    );
                    return (
                      <SidebarMenuItem key={channel.id}>
                        <SidebarMenuButton asChild className="sidebar-connected-item group h-10 rounded-2xl bg-transparent transition-all duration-200 hover:bg-white/12 hover:text-[#0d2b1f]">
                          {profileUrl
                            ? <a href={profileUrl} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-2.5">{inner}</a>
                            : <div className="flex w-full items-center gap-2.5 px-2.5">{inner}</div>
                          }
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* ── Canaux à connecter ── */}
          <SidebarGroup className="p-0 mt-3">
            {!isCollapsed && (
              <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                Connecter
              </p>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {isPending ? (
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-9 w-full rounded-xl bg-white/5" />
                    <Skeleton className="h-9 w-full rounded-xl bg-white/5" />
                  </div>
                ) : (
                  <>
                    {limitedChannels.map((channel: ChannelType) => {
                      const icon = getChannelIcon(channel.type);
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            tooltip={`Connecter ${channel.name}`}
                            className="group h-10 rounded-2xl bg-transparent text-white/40 transition-all duration-200 hover:bg-white/12 hover:text-[#0d2b1f]"
                          >
                            <button
                              className="flex w-full items-center gap-2.5 px-2.5"
                              disabled={connectMutation.isPending}
                              onClick={() => handleConnect(channel.id)}
                            >
                              <span className="relative shrink-0">
                                {icon && (
                                  <HugeiconsIcon icon={icon} color="currentColor" className="size-6 rounded-xl p-1 text-white" style={{ background: channel.color }} />
                                )}
                                <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-[6px] border border-[#081a13] bg-[#0f2a1a] text-white/70">
                                  <HugeiconsIcon icon={PlusSignIcon} className="size-2" />
                                </span>
                              </span>
                              {!isCollapsed && (
                                <span className="truncate text-[13px] font-medium">{channel.name}</span>
                              )}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/settings"
                          className="group flex h-10 w-full items-center gap-2.5 rounded-2xl border border-dashed border-white/10 bg-transparent px-2.5 text-white/30 transition-all duration-200 hover:border-white/20 hover:bg-white/12 hover:text-[#0d2b1f]"
                        >
                          <PlusCircleIcon className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                          {!isCollapsed && <span className="text-[13px] font-medium">Plus de canaux</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Collapse trigger en bas (collapsed only) ── */}
          {isCollapsed && (
            <div className="mt-auto pt-4">
              <SidebarTrigger className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-white" />
            </div>
          )}
        </SidebarContent>
      </Sidebar>

      <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} />
    </>
  );
};

export default AppSidebar;