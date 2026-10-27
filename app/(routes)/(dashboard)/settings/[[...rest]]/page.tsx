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
      <header className="relative isolate mb-6 overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-sm">
        <div aria-hidden="true" className="absolute -right-20 -top-28 size-80 rounded-full bg-accent/35 blur-3xl" />
        <div aria-hidden="true" className="absolute right-24 top-7 size-36 rounded-full border border-primary/10" />

        <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-secondary-foreground">
              <Sparkles className="size-3.5" />
              Le studio, en mieux
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-4xl">
              Un espace <span className="text-gradient-lime-simple">à votre image.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Personnalisez votre studio, reliez vos réseaux et gardez vos préférences au même endroit.
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm sm:min-w-[320px]">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary ring-1 ring-border/70">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ? `Photo de profil de ${user.fullName}` : "Photo de profil"}
                  className="size-11 object-cover"
                  width={44}
                  height={44}
                />
              ) : (
                <User className="size-5 text-secondary-foreground/70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Compte Lemon.ai</p>
              <p className="mt-1 truncate text-sm font-bold text-foreground">{user?.fullName || "Mon compte"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "Profil en cours de chargement"}</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-hidden="true">
              <ShieldCheck className="size-4" />
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="channels" className="gap-0">
        <div className="mb-5 w-full overflow-x-auto">
          <TabsList className="h-auto w-full justify-start gap-1.5 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-sm sm:w-fit">
            <TabsTrigger value="profile" className="h-10 flex-none gap-2 rounded-xl border border-transparent px-4 text-xs font-semibold transition-all data-active:border-primary/15 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm">
              <User className="size-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="channels" className="h-10 flex-none gap-2 rounded-xl border border-transparent px-4 text-xs font-semibold transition-all data-active:border-primary/15 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm">
              <Layers className="size-4" />
              Canaux
            </TabsTrigger>
            <TabsTrigger value="appearance" className="h-10 flex-none gap-2 rounded-xl border border-transparent px-4 text-xs font-semibold transition-all data-active:border-primary/15 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm">
              <Palette className="size-4" />
              Apparence
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-5">
          <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card shadow-sm">
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
            <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card shadow-sm">
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
                    <div aria-hidden="true" className="rounded-xl border border-[#e8e0e6] bg-[#fffdf8] p-3">
                      <div className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-[#6749d7]" />
                        <span className="size-2 rounded-full bg-[#e8e0e6]" />
                        <span className="size-2 rounded-full bg-[#e8e0e6]" />
                      </div>
                      <div className="mt-3 grid grid-cols-[32px_1fr] gap-2">
                        <div className="h-9 rounded-md bg-[#f1ede5]" />
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="h-1.5 w-3/4 rounded-full bg-[#e8e0e6]" />
                          <span className="h-1.5 w-1/2 rounded-full bg-[#f1ede5]" />
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
                    <div aria-hidden="true" className="rounded-xl border border-[#403746] bg-[#17141b] p-3">
                      <div className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-[#eff669]" />
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

            <aside className="relative isolate overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground shadow-lg sm:p-7">
              <div aria-hidden="true" className="absolute -right-10 -top-12 size-56 rounded-full border border-primary-foreground/15" />
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(255,255,255,0.15),transparent_54%)]" />
              <div className="relative z-10">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/15">
                  <Palette className="size-5" />
                </div>
                <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-primary-foreground/70">Une ambiance qui vous suit</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.04em]">
                  Clair le jour, <span className="text-primary-foreground/70">profond la nuit.</span>
                </h2>
                <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
                  Votre préférence s&apos;applique à tout le studio et reste enregistrée pour vos prochaines visites.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-[10px] font-semibold text-primary-foreground/80">
                  <span className="size-2 rounded-full bg-primary-foreground" />
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
