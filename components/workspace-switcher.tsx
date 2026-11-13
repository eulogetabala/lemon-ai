"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Shield,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { WORKSPACE_COOKIE } from "@/lib/workspace-types";

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
}

export default function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      return res.json();
    },
  });

  const workspaces: any[] = data?.workspaces || [];
  const usage = data?.usage || { owned: 1, max: 1 };
  const planId = data?.planId || "free";

  // Get active workspace ID from document.cookie
  const getActiveCookie = () => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(^| )${WORKSPACE_COOKIE}=([^;]+)`));
    return match ? match[2] : null;
  };

  const activeId = getActiveCookie() || workspaces[0]?.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeId) || workspaces[0];

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Impossible de créer l'espace.");
      return resJson;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setIsCreateOpen(false);
      setNewWorkspaceName("");
      setErrorMessage(null);
      // Select newly created workspace
      if (result.workspace?.id) {
        document.cookie = `${WORKSPACE_COOKIE}=${result.workspace.id}; path=/; max-age=31536000`;
        window.location.reload();
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Erreur de création");
    },
  });

  const handleSelectWorkspace = (wsId: string) => {
    document.cookie = `${WORKSPACE_COOKIE}=${wsId}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const handleOpenCreate = () => {
    if (usage.max !== Infinity && usage.owned >= usage.max) {
      setIsUpgradeOpen(true);
      return;
    }
    setErrorMessage(null);
    setNewWorkspaceName("");
    setIsCreateOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left transition-all hover:bg-white/[0.08] hover:border-white/20 cursor-pointer focus:outline-none",
              isCollapsed ? "justify-center w-10 h-10 p-0 mx-auto" : "w-full justify-between px-3 py-2"
            )}
            title={activeWorkspace?.name || "Espace de travail"}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FF5722] text-white font-black text-xs uppercase shadow-sm">
                {activeWorkspace?.name?.slice(0, 2) || "EP"}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="truncate text-xs font-bold text-white leading-tight">
                    {activeWorkspace?.name || "Espace Principal"}
                  </div>
                  <div className="text-[10px] text-white/50 font-medium">
                    {activeWorkspace?.role === "owner" ? "Propriétaire" : activeWorkspace?.role || "Membre"}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown className="size-3.5 text-white/40 group-hover:text-white/70 transition-transform" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isCollapsed ? "center" : "start"}
          side={isCollapsed ? "right" : "bottom"}
          className="w-64 rounded-2xl border border-slate-800 bg-[#0E111E] p-1.5 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <DropdownMenuLabel className="p-0 text-[11px] font-bold uppercase tracking-wider text-white/40">
              Espaces de travail
            </DropdownMenuLabel>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 font-mono">
              {usage.owned} / {usage.max === Infinity ? "∞" : usage.max}
            </span>
          </div>

          <DropdownMenuSeparator className="bg-white/10 my-1" />

          <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
            {workspaces.map((ws) => {
              const isSelected = ws.id === (activeWorkspace?.id || activeId);
              return (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors",
                    isSelected
                      ? "bg-white/10 text-white font-bold"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-black uppercase text-[#FF5722]">
                      {ws.name.slice(0, 2)}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {isSelected && <Check className="size-3.5 text-[#FF5722] shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="bg-white/10 my-1" />

          <DropdownMenuItem
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-[#FF5722] hover:bg-[#FF5722]/10 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Créer un nouvel espace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: Create Workspace */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Créer un espace de travail
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Séparez vos marques, clients ou projets dans un environnement dédié.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newWorkspaceName.trim()) return;
              createMutation.mutate(newWorkspaceName.trim());
            }}
            className="mt-4 flex flex-col gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Nom de l&apos;espace de travail
              </label>
              <div className="relative mt-1 flex items-center">
                <Building2 className="absolute left-3 size-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="ex : Agence Kora, Marque Beta..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#F4511E] cursor-pointer"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  "Créer l'espace"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Upgrade Required for Workspace Limit */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5722] mb-2">
              <Building2 className="size-5" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">
              Limite d&apos;espaces de travail atteinte
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed mt-1">
              Votre forfait actuel ({planId.toUpperCase()}) est limité à {usage.max} espace de travail. Passez au forfait supérieur pour créer des espaces supplémentaires.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900">Quotas d&apos;espaces par forfait :</div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center justify-between">
                <span>Gratuit :</span>
                <span className="font-bold">1 espace</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Pro (12 000 FCFA/mois) :</span>
                <span className="font-bold text-[#FF5722]">5 espaces</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Équipe (30 000 FCFA/mois) :</span>
                <span className="font-bold text-emerald-700">Espaces illimités</span>
              </li>
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsUpgradeOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => {
                setIsUpgradeOpen(false);
                router.push("/billing");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A0D14] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#FF5722] transition-colors cursor-pointer shadow-sm"
            >
              <span>Mettre à niveau</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

