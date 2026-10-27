"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfile, useUser } from "@clerk/nextjs"
import { Layers, Moon, Palette, ShieldCheck, Sparkles, Sun, User } from "lucide-react"
import ChannelsTab from "@/components/settings/channels-tab"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SettingsPage = () => {
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <header className="relative isolate mb-6 overflow-hidden rounded-[30px] border border-[#25351f] bg-[#11190f] px-5 py-6 text-white shadow-[0_22px_60px_rgba(27,48,18,0.14)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(196,242,100,0.17),transparent_48%)]" />
        <div aria-hidden="true" className="absolute -right-20 -top-32 size-80 rounded-full border border-white/[0.07]" />
        <div aria-hidden="true" className="absolute -right-10 -top-20 size-60 rounded-full border border-primary/15" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#d7f99d]">
              <Sparkles className="size-3.5" />
              Réglages du studio
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
              Votre espace, <span className="text-[#c4f264]">vos règles.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Façonnez un studio qui vous ressemble, connectez vos réseaux et gardez tout à portée de main.
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:min-w-[320px]">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ? `Photo de profil de ${user.fullName}` : "Photo de profil"}
                  className="size-11 object-cover"
                  width={44}
                  height={44}
                />
              ) : (
                <User className="size-5 text-white/65" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Compte Lemon.ai</p>
              <p className="mt-1 truncate text-sm font-bold text-white">{user?.fullName || "Mon compte"}</p>
              <p className="truncate text-xs text-white/50">{user?.primaryEmailAddress?.emailAddress || "Profil en cours de chargement"}</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[#c4f264]" aria-hidden="true">
              <ShieldCheck className="size-4" />
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="channels" className="gap-0">
        <div className="mb-5 border-b border-border/70">
          <TabsList variant="line" className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 sm:w-fit">
            <TabsTrigger value="profile" className="h-12 flex-none gap-2 rounded-none px-3 text-xs font-semibold sm:px-4">
              <User className="size-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="channels" className="h-12 flex-none gap-2 rounded-none px-3 text-xs font-semibold sm:px-4">
              <Layers className="size-4" />
              Canaux
            </TabsTrigger>
            <TabsTrigger value="appearance" className="h-12 flex-none gap-2 rounded-none px-3 text-xs font-semibold sm:px-4">
              <Palette className="size-4" />
              Apparence
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-5">
          <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card shadow-[0_18px_50px_rgba(33,52,24,0.06)]">
            <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Votre profil</CardTitle>
                  <CardDescription className="mt-1">Gérez les informations et préférences de votre compte.</CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold">
                  <ShieldCheck className="size-3.5" />
                  Compte sécurisé
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                {user?.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={user.fullName ? `Photo de profil de ${user.fullName}` : "Photo de profil"}
                    className="size-14 rounded-full object-cover ring-2 ring-primary/20"
                    width={56}
                    height={56}
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-primary/15">
                    <User className="size-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{user?.fullName || "Aucun nom défini"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "Aucune adresse e-mail associée"}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/40 p-2 sm:p-4">
                <UserProfile
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "w-full border-0 bg-transparent shadow-none",
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-5">
          <ChannelsTab />
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card shadow-[0_18px_50px_rgba(33,52,24,0.06)]">
              <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-5 sm:p-6">
                <CardTitle>Apparence</CardTitle>
                <CardDescription className="mt-1">Choisissez l&apos;ambiance de votre espace de travail.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-accent-foreground">
                      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="theme" className="text-sm font-bold">Mode sombre</Label>
                      <p className="max-w-md text-xs leading-5 text-muted-foreground">
                        Une interface plus douce pour travailler quand la lumière baisse.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="theme"
                    aria-label="Activer le mode sombre"
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={cn(
                    "rounded-2xl border p-3 transition-colors",
                    !isDark ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background/60",
                  )}>
                    <div aria-hidden="true" className="rounded-xl border border-[#e4e8df] bg-white p-3">
                      <div className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-[#a3e635]" />
                        <span className="size-2 rounded-full bg-[#e4e8df]" />
                        <span className="size-2 rounded-full bg-[#e4e8df]" />
                      </div>
                      <div className="mt-3 grid grid-cols-[32px_1fr] gap-2">
                        <div className="h-9 rounded-md bg-[#f0f4eb]" />
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="h-1.5 w-3/4 rounded-full bg-[#dfe7d8]" />
                          <span className="h-1.5 w-1/2 rounded-full bg-[#edf1e9]" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/80">
                        <Sun className="size-3.5" />
                        Clair
                      </span>
                      {!isDark && <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px]">Actif</Badge>}
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-2xl border p-3 transition-colors",
                    isDark ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background/60",
                  )}>
                    <div aria-hidden="true" className="rounded-xl border border-white/10 bg-[#11190f] p-3">
                      <div className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-[#c4f264]" />
                        <span className="size-2 rounded-full bg-white/15" />
                        <span className="size-2 rounded-full bg-white/15" />
                      </div>
                      <div className="mt-3 grid grid-cols-[32px_1fr] gap-2">
                        <div className="h-9 rounded-md bg-white/[0.08]" />
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="h-1.5 w-3/4 rounded-full bg-white/25" />
                          <span className="h-1.5 w-1/2 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/80">
                        <Moon className="size-3.5" />
                        Sombre
                      </span>
                      {isDark && <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px]">Actif</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <aside className="relative isolate overflow-hidden rounded-[28px] border border-[#25351f] bg-[#11190f] p-6 text-white shadow-[0_18px_50px_rgba(27,48,18,0.14)] sm:p-7">
              <div aria-hidden="true" className="absolute -right-10 -top-12 size-56 rounded-full border border-primary/15" />
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(196,242,100,0.15),transparent_54%)]" />
              <div className="relative z-10">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-[#c4f264] ring-1 ring-primary/20">
                  <Palette className="size-5" />
                </div>
                <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#d7f99d]">Une ambiance qui vous suit</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.04em]">
                  Clair le jour, <span className="text-[#c4f264]">profond la nuit.</span>
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Votre préférence s&apos;applique à tout le studio et reste enregistrée pour vos prochaines visites.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-semibold text-white/65">
                  <span className="size-2 rounded-full bg-[#c4f264]" />
                  Thème {isDark ? "sombre" : "clair"} actif
                </div>
              </div>
            </aside>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
