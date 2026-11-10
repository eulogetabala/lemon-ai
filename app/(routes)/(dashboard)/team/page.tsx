"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Building2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Mail,
  User,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { canCollaborate, type PlanId } from "@/lib/plan-limits";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Éditeur",
  viewer: "Lecteur",
};

export default function TeamPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch user billing status to check plan
  const { data: billingData } = useQuery({
    queryKey: ["billing-payments"],
    queryFn: async () => {
      const res = await fetch("/api/billing/payments");
      return res.json();
    },
  });
  const planId: PlanId = billingData?.plan || "free";
  const isAllowedToCollaborate = canCollaborate(planId);

  // 2. Fetch workspaces to find active workspace
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      return res.json();
    },
  });

  const activeWorkspace =
    workspacesData?.activeWorkspace || workspacesData?.workspaces?.[0];
  const workspaceId = activeWorkspace?.id;

  // 3. Fetch members of the active workspace
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { members: [] };
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      return res.json();
    },
    enabled: !!workspaceId,
  });

  // 4. Fetch pending invitations
  const { data: invitesData } = useQuery({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { invitations: [] };
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`);
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const members: any[] = membersData?.members || [];
  const invitations: any[] = invitesData?.invitations || [];

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible d'envoyer l'invitation.");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", workspaceId] });
      setCreatedInviteUrl(data.inviteUrl || null);
      setInviteEmail("");
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Erreur lors de l'invitation");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de retirer ce membre.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
    },
  });

  const handleCopyLink = () => {
    if (createdInviteUrl) {
      navigator.clipboard.writeText(createdInviteUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleOpenInvite = () => {
    if (!isAllowedToCollaborate) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setCreatedInviteUrl(null);
    setErrorMessage(null);
    setIsInviteOpen(true);
  };

  const totalCount = members.length + invitations.length;

  return (
    <>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Espace d&apos;équipe &amp; Rôles
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gérez les accès de vos collaborateurs et vos autorisations de publication.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenInvite}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF5722] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#F4511E] active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="size-4" />
            Inviter un collaborateur
          </button>
        </div>

        {/* Workspace Info Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm uppercase">
              {activeWorkspace?.name?.slice(0, 2) || "EP"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {activeWorkspace?.name || "Espace Principal"}
                </h2>
                <span className="rounded-full bg-orange-50 border border-[#FF5722]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#FF5722]">
                  Workspace Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalCount} membre{totalCount > 1 ? "s" : ""} · Rôles granulaires
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Building2 className="size-4 text-slate-400" />
            Slug : <span className="font-mono text-slate-500">{activeWorkspace?.slug || "principal"}</span>
          </div>
        </div>

        {/* Team Members List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Membres et permissions</h2>
            <span className="text-xs font-medium text-slate-500">
              {totalCount} collaborateur{totalCount > 1 ? "s" : ""}
            </span>
          </div>

          {isLoadingMembers ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="size-5 animate-spin mr-2" />
              Chargement des membres...
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="pb-3 font-semibold uppercase tracking-wider">Collaborateur</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Rôle</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Statut</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Real members */}
                  {members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const initials = (member.name || "U").slice(0, 2).toUpperCase();
                    return (
                      <tr key={member.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs shadow-2xs">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                {member.name}
                                {isCurrentUser && (
                                  <span className="rounded bg-[#FF5722] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    Vous
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-400 text-[11px]">
                                {member.email || "Non renseigné"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                            {member.role === "owner" && (
                              <ShieldCheck className="size-3.5 text-[#FF5722]" />
                            )}
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                            <CheckCircle2 className="size-3" />
                            Actif
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-medium text-slate-400">
                          {member.role === "owner" ? (
                            "Propriétaire"
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeMemberMutation.mutate(member.user_id)}
                              disabled={removeMemberMutation.isPending}
                              title="Retirer le collaborateur"
                              className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Pending invitations */}
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="transition-colors hover:bg-slate-50/70 opacity-80">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
                            <Mail className="size-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{inv.email}</div>
                            <span className="text-slate-400 text-[11px]">Invitation envoyée</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-700">
                        {ROLE_LABELS[inv.role] || inv.role}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 font-semibold text-amber-800 text-[10px]">
                          En attente
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-400 text-[11px]">
                        Lien actif
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Inviter un collaborateur
            </DialogTitle>
          </DialogHeader>

          {errorMessage && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {createdInviteUrl ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <span className="font-bold">Invitation créée !</span> Partagez ce lien sécurisé avec votre collaborateur pour qu&apos;il rejoigne cet espace.
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInviteUrl}
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-[#FF5722] transition-colors cursor-pointer"
                >
                  {hasCopied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{hasCopied ? "Copié" : "Copier"}</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
              }}
              className="mt-4 flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Adresse email du collaborateur
                </label>
                <div className="relative mt-1 flex items-center">
                  <Mail className="absolute left-3 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="collaborateur@entreprise.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Rôle &amp; Permissions
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
                >
                  <option value="editor">Éditeur (Créer et modifier des publications)</option>
                  <option value="admin">Administrateur (Gestion totale des réseaux et membres)</option>
                  <option value="viewer">Lecteur (Consultation des statistiques et plannings)</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#F4511E] cursor-pointer"
                >
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Génération du lien...</span>
                    </>
                  ) : (
                    "Générer l'invitation"
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Plan Gate Modal */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5722] mb-2">
              <Users className="size-5" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">
              Collaboration d&apos;équipe &amp; Rôles
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed mt-1">
              L&apos;invitation de collaborateurs et la gestion des rôles d&apos;équipe sont réservées aux forfaits <strong>Équipe</strong> (30 000 FCFA/mois) et <strong>Entreprise</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900">Inclus dans le forfait Équipe :</div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-[#FF5722] font-bold">•</span>
                <span>Espaces de travail illimités</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF5722] font-bold">•</span>
                <span>Collaboration d&apos;équipe et rôles granulaires</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF5722] font-bold">•</span>
                <span>Workflows de relecture &amp; d&apos;approbation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF5722] font-bold">•</span>
                <span>Rapports en marque blanche</span>
              </li>
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Plus tard
            </button>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A0D14] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#FF5722] transition-colors cursor-pointer shadow-sm"
            >
              <span>Découvrir l&apos;offre Équipe</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
