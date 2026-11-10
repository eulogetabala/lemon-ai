"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  SendHorizontal,
  Calendar,
  BarChart3,
  ScanSearch,
  Layers,
  Users,
  Settings,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { useQuery } from "@tanstack/react-query";
import { ChannelType } from "@/types/channel.type";
import ChannelAvatar from "@/components/channel-avatar";
import WorkspaceSwitcher from "@/components/workspace-switcher";

const navItems = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Publier", href: "/schedule", icon: SendHorizontal, isAction: true },
  { name: "Calendrier", href: "/schedule", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Veille concurrentielle", href: "/competitor-watch", icon: ScanSearch },
  { name: "Content Studio", href: "/ideas", icon: Layers },
  { name: "Espace d'équipe", href: "/team", icon: Users },
  { name: "Paramètres", href: "/settings", icon: Settings },
  { name: "Aide & Support", href: "/support", icon: HelpCircle },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useUser();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const { data: channelsData } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      return res.json();
    },
  });

  const channels = (channelsData?.channels || []) as ChannelType[];
  const connectedChannels = channels.filter((c: ChannelType) => c.connected);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="sidebar-premium h-svh border-r border-white/[0.08] text-white"
        style={{
          background: "linear-gradient(180deg, #0e111e 0%, #090c16 100%)",
        }}
      >
        {/* Subtle, non-saturated ambient glow in bottom corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-20 blur-[90px]"
          style={{
            background: "radial-gradient(circle, #ff5722 0%, transparent 70%)",
          }}
        />

        <SidebarContent
          className={cn(
            "relative flex flex-col justify-between overflow-y-auto py-5 scrollbar-none",
            isCollapsed ? "px-2" : "px-3.5"
          )}
        >
          {/* Top section: Logo + Navigation */}
          <div className="flex flex-col gap-6">
            {/* Header: Logo & collapse toggle */}
            <div
              className={cn(
                "flex items-center",
                isCollapsed ? "justify-center" : "justify-between px-1.5"
              )}
            >
              <Link href="/dashboard" className="flex items-center">
                <Logo
                  hideName={isCollapsed}
                  showSubtitle={!isCollapsed}
                  theme="dark"
                  size="md"
                />
              </Link>
              {!isCollapsed && (
                <SidebarTrigger className="hidden h-7 w-7 rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/10 hover:text-white md:flex" />
              )}
            </div>

            {/* Workspace switcher */}
            <WorkspaceSwitcher isCollapsed={isCollapsed} />

            {/* Navigation items */}
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <ul className="flex w-full flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard" || pathname === "/"
                        : item.href === "/schedule" && item.name === "Calendrier"
                        ? pathname === "/schedule"
                        : pathname.startsWith(item.href);

                    if (item.isAction) {
                      return (
                        <li key={item.name}>
                          <button
                            type="button"
                            onClick={() => setIsCreatePostOpen(true)}
                            className={cn(
                              "group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 transition-all duration-150 text-left",
                              "text-white/65 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center text-white/50 group-hover:text-white">
                              <item.icon className="size-4" />
                            </span>
                            {!isCollapsed && (
                              <div className="flex flex-1 items-center justify-between">
                                <span className="text-[13.5px] font-medium tracking-tight">
                                  {item.name}
                                </span>
                                <Plus className="size-3.5 text-white/40 group-hover:text-white" />
                              </div>
                            )}
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 transition-all duration-150",
                            isActive
                              ? "bg-[#FF5722] text-white font-semibold shadow-[0_4px_16px_rgba(255,87,34,0.32)]"
                              : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center transition-colors",
                              isActive
                                ? "text-white"
                                : "text-white/50 group-hover:text-white"
                            )}
                          >
                            <item.icon className="size-4" />
                          </span>

                          {!isCollapsed && (
                            <span className="text-[13.5px] tracking-tight">
                              {item.name}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Connected Channels Section */}
            {connectedChannels.length > 0 && !isCollapsed && (
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Pages connectées ({connectedChannels.length})
                  </span>
                  <Link
                    href="/settings"
                    className="text-[10px] font-bold text-[#FF5722] hover:underline"
                  >
                    Gérer
                  </Link>
                </div>
                <ul className="flex flex-col gap-1">
                  {connectedChannels.map((ch) => (
                    <li key={ch.id}>
                      <Link
                        href="/settings"
                        className="group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-all hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChannelAvatar
                            type={ch.type}
                            color={ch.color || "#FF5722"}
                            profileImage={ch.profile_image}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-semibold text-white/90 group-hover:text-white">
                              {ch.handle ? `@${ch.handle}` : ch.name}
                            </span>
                            <span className="text-[10px] text-white/40 capitalize">
                              {ch.type?.toLowerCase()}
                            </span>
                          </div>
                        </div>
                        <span className="size-1.5 rounded-full bg-[#FF5722] shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {connectedChannels.length > 0 && isCollapsed && (
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/[0.06]">
                {connectedChannels.map((ch) => (
                  <Link
                    key={ch.id}
                    href="/settings"
                    title={`${ch.handle ? `@${ch.handle}` : ch.name} (${ch.type})`}
                    className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.08] transition-colors"
                  >
                    <ChannelAvatar
                      type={ch.type}
                      color={ch.color || "#FF5722"}
                      profileImage={ch.profile_image}
                      size="sm"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section: Pro upgrade card + User workspace profile */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Upgrade to Pro Card */}
            {!isCollapsed ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#171A2B] to-[#121422] p-4 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5722]/15 text-[#FF5722]">
                    <ShieldCheck className="size-4" />
                  </div>
                  <span className="text-xs font-bold tracking-tight text-white">
                    Passez au plan Pro
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                  Débloquez plus de puissance pour votre croissance.
                </p>
                <Link
                  href="/billing"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF5722] py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#F4511E] active:scale-[0.98]"
                >
                  Voir les offres
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <Link
                href="/billing"
                title="Passez au plan Pro"
                className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-[#FF5722] transition-colors hover:bg-white/10"
              >
                <ShieldCheck className="size-4" />
              </Link>
            )}

            {/* User Profile / Workspace selector */}
            {!isCollapsed ? (
              <Link
                href="/settings"
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5722] text-xs font-bold text-white shadow-sm">
                    {user?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      user?.firstName?.slice(0, 1) || "JD"
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-semibold text-white">
                      {user?.fullName || user?.firstName || "Mon compte"}
                    </span>
                    <span className="truncate text-[10px] text-white/45">
                      {user?.primaryEmailAddress?.emailAddress || "Workspace KORAPULSE"}
                    </span>
                  </div>
                </div>
                <ChevronDown className="size-3.5 text-white/40 shrink-0 ml-1" />
              </Link>
            ) : (
              <Link
                href="/settings"
                title="Paramètres de compte"
                className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/70 hover:bg-white/10"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5722] text-[10px] font-bold text-white">
                  {user?.firstName?.slice(0, 1) || "JD"}
                </div>
              </Link>
            )}
          </div>
        </SidebarContent>
      </Sidebar>

      <CreatePostDialog
        open={isCreatePostOpen}
        onOpenChange={setIsCreatePostOpen}
      />
    </>
  );
};

export default AppSidebar;
