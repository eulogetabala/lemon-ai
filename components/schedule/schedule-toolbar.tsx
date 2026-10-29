"use client";

import { ChevronDown, Copy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ConnectedAccountType } from "@/types/channel.type";
import ChannelAvatar from "../channel-avatar";

interface ScheduleToolbarProps {
  viewType?: "calendar" | "list";
  channelIds: string[];
  toggleChannel: (id: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string | any) => void;
}

const statusOptions = [
  { id: "all", label: "Toutes les publications" },
  { id: "draft", label: "Brouillons" },
  { id: "queue", label: "File d'attente" },
  { id: "published", label: "Publiées" },
  { id: "failed", label: "Échouées" },
];

const ScheduleToolbar = ({
  viewType = "calendar",
  channelIds,
  toggleChannel,
  selectedStatus,
  setSelectedStatus,
}: ScheduleToolbarProps) => {
  const { data: channelsData } = useQuery({
    queryKey: ["channels-connected"],
    queryFn: async () => {
      const res = await fetch("/api/channel?filter=connected");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
  });
  const connectedChannels = channelsData?.accounts || [];

  return (
    <div className="flex items-center gap-2">
      {/* Status Filter — calendar only */}
      {viewType === "calendar" && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex h-7 items-center gap-1.5 rounded-full border border-hairline bg-white dark:bg-card px-2.5 tag-code text-mute hover:text-ink hover:border-lemon/30 transition-all duration-200">
              <Copy className="h-3.5 w-3.5" />
              <span>{statusOptions.find((s) => s.id === selectedStatus)?.label || "Toutes"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 rounded-2xl border-hairline shadow-lg" align="end">
            <div className="space-y-0.5">
              {statusOptions.map((option) => (
                <button
                  key={option.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-150",
                    selectedStatus === option.id
                      ? "bg-lemon/15 text-moss"
                      : "text-mute hover:bg-mist hover:text-ink"
                  )}
                  onClick={() => setSelectedStatus(option.id)}
                >
                  <span className={cn(
                    "size-3.5 rounded-full border-2 flex items-center justify-center",
                    selectedStatus === option.id ? "border-moss bg-moss" : "border-mute/40"
                  )}>
                    {selectedStatus === option.id && (
                      <span className="size-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Channels Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex h-7 items-center gap-1.5 rounded-full border border-hairline bg-white dark:bg-card px-2.5 tag-code text-mute hover:text-ink hover:border-lemon/30 transition-all duration-200">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Canaux</span>
            {channelIds && channelIds?.length > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-lemon text-ink text-[10px] font-bold px-1 tabular-nums">
                {channelIds.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 rounded-2xl border-hairline shadow-lg" align="end">
          <Command>
            <CommandList>
              <CommandGroup heading="Canaux connectés">
                {connectedChannels?.length === 0 ? (
                  <div className="py-5 px-3 text-center">
                    <p className="text-xs text-mute mb-3">Aucun canal connecté</p>
                    <Button size="sm" className="w-fit px-5 rounded-full bg-ink text-lemon hover:bg-ink/90 font-bold" asChild>
                      <Link href="/settings">Connecter un canal</Link>
                    </Button>
                  </div>
                ) : (
                  connectedChannels?.map((channel: ConnectedAccountType) => (
                    <CommandItem
                      key={channel.id}
                      onSelect={() => toggleChannel(channel.id)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer"
                    >
                      <ChannelAvatar
                        size="sm"
                        className="flex-1 flex items-center justify-start gap-2"
                        type={channel.type}
                        color={channel.color}
                        profileImage={channel.profile_image}
                        name={channel.handle || channel.name}
                      />

                      <div className={cn(
                        "size-4 rounded border-2 flex items-center justify-center transition-all",
                        channelIds.includes(channel.id)
                          ? "border-moss bg-moss"
                          : "border-mute/40"
                      )}>
                        {channelIds.includes(channel.id) && (
                          <span className="text-white text-[10px] font-bold">✓</span>
                        )}
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

    </div>
  );
}

export default ScheduleToolbar;