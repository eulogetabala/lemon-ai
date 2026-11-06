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
  X,
  Mail,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Administrateur" | "Éditeur" | "Lecteur";
  status: "Actif" | "Invité";
  isOwner?: boolean;
}

export default function TeamPage() {
  const { user } = useUser();
  const { has } = useAuth();
  const isTeamOrEnterprise = has ? (has({ plan: "team" }) || has({ plan: "enterprise" })) : false;
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Administrateur" | "Éditeur" | "Lecteur">("Éditeur");

  const [invitedMembers, setInvitedMembers] = useState<TeamMember[]>([]);

  const ownerName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Administrateur");
  const ownerEmail = user?.primaryEmailAddress?.emailAddress || "admin@workspace.com";
  const ownerInitials = (
    (user?.firstName?.[0] || "A") + (user?.lastName?.[0] || "D")
  ).toUpperCase();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      name: inviteName.trim() || inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "Invité",
    };

    setInvitedMembers((prev) => [...prev, newMember]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Éditeur");
    setIsInviteOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const totalMembers = 1 + invitedMembers.length;

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
            onClick={() => {
              if (!isTeamOrEnterprise) {
                setIsUpgradeModalOpen(true);
                return;
              }
              setIsInviteOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF5722] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#F4511E] active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="size-4" />
            Inviter un collaborateur
          </button>
        </div>

        {/* Workspace Info Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm">
              {ownerInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Espace de travail — {ownerName}
                </h2>
                <span className="rounded-full bg-orange-50 border border-[#FF5722]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#FF5722]">
                  Workspace Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalMembers} collaborateur{totalMembers > 1 ? "s" : ""} actif{totalMembers > 1 ? "s" : ""} · Rôles granulaires
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Building2 className="size-4 text-slate-400" />
            Organisation principale
          </div>
        </div>

        {/* Team Members List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Membres et permissions
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {totalMembers} membre{totalMembers > 1 ? "s" : ""}
            </span>
          </div>

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
                {/* 1. Real logged-in user (Owner) */}
                <tr className="transition-colors hover:bg-slate-50/70">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-[#FF5722] text-white font-bold text-xs shadow-sm">
                        {ownerInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {ownerName}
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            Vous
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{ownerEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                      <ShieldCheck className="size-3.5 text-[#FF5722]" />
                      Propriétaire / Admin
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-bold text-[#FF5722]">
                      <CheckCircle2 className="size-3" />
                      Actif
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-medium text-slate-400">
                    Principal
                  </td>
                </tr>

                {/* 2. Real invited members */}
                {invitedMembers.map((member) => {
                  const initials = member.name.slice(0, 2).toUpperCase();
                  return (
                    <tr key={member.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-800 text-white font-bold text-xs">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{member.name}</span>
                            <span className="block text-slate-400 text-[11px]">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-700">
                        {member.role}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Retirer"
                          className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Nom complet
              </label>
              <div className="relative mt-1 flex items-center">
                <User className="absolute left-3 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ex : Sarah Diallo"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Adresse email
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
                onChange={(e) =>
                  setInviteRole(e.target.value as "Administrateur" | "Éditeur" | "Lecteur")
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
              >
                <option value="Éditeur">Éditeur (Créer et modifier des publications)</option>
                <option value="Administrateur">Administrateur (Gestion totale des réseaux et membres)</option>
                <option value="Lecteur">Lecteur (Consultation des statistiques et plannings)</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#F4511E]"
              >
                Envoyer l&apos;invitation
              </button>
            </div>
          </form>
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
