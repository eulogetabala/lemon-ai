"use client";

import { ChevronDown, Copy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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
  setSelectedStatus: (status: string) => void;
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
}: ScheduleToolbarProps) =>{
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
      {/* Status Filter */}
      {viewType === "calendar" && (

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="lg" className="h-9 gap-2 rounded-xl border border-border/70 bg-card/85 px-3 text-foreground shadow-sm hover:bg-muted">
              <Copy className="h-3.5 w-3.5" />
              <span className="font-medium text-sm text-muted-foreground!">
                {statusOptions.find((s) => s.id === selectedStatus)?.label || "Toutes les publications"}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="space-y-1">
              {statusOptions.map((option) => (
                <button
                  key={option.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors",
                    selectedStatus === option.id && "bg-muted font-medium"
                  )}
                  onClick={() => setSelectedStatus(option.id)}
                >
                  <Checkbox
                    checked={selectedStatus === option.id}
                    className="pointer-events-none"
                  />
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
          <Button variant="ghost" size="lg" className="h-9 gap-2 rounded-xl border border-border/70 bg-card/85 px-3 text-foreground shadow-sm hover:bg-muted">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="font-medium text-sm text-muted-foreground!">
              Canaux
            </span>
            {channelIds && channelIds?.length > 0 && (
              <Badge variant="default" className="size-4!">
                {channelIds.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-86 p-0" align="end">
          <Command>
            <CommandList>
              <CommandGroup heading="Canaux connectés">
                {connectedChannels?.length === 0 ? (
                  <div className="py-4 px-2 text-center">
                    <p className="text-xs text-muted-foreground mb-3">Aucun canal connecté</p>
                    <Button size="sm" className="w-fit px-5" asChild>
                      <Link href="/settings">Connecter un canal</Link>
                    </Button>
                  </div>
                ) : (
                  connectedChannels?.map((channel: ConnectedAccountType) => (
                    <CommandItem
                      key={channel.id}
                      onSelect={() => toggleChannel(channel.id)}
                      className="flex items-center justify-between gap-2 px-2 py-1.5"
                    >
                      <ChannelAvatar
                        size="sm"
                        className="flex-1 flex items-center justify-start gap-2"
                        type={channel.type}
                        color={channel.color}
                        profileImage={channel.profile_image}
                        name={channel.handle || channel.name}
                      />

                      <Checkbox
                        checked={channelIds.includes(channel.id)}
                        className="border-black!"
                      />
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
