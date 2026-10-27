"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfile, useUser } from "@clerk/nextjs"
import { Layers, Palette, User } from "lucide-react"
import ChannelsTab from "@/components/settings/channels-tab"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const SettingsPage = () => {
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <header className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-accent-foreground">
          <Palette className="size-3.5" />
          Personnalisez votre studio
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-foreground sm:text-4xl">Votre espace, <span className="text-primary">vos règles.</span></h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Gérez votre profil, vos connexions sociales et l&apos;ambiance de votre espace de travail.</p>
      </header>

      <div>
          <Tabs defaultValue="channels">
            <div className="mb-5 w-full border-b border-border/70">
              <TabsList variant="line" className="h-12 w-fit gap-2 bg-transparent p-0">
                <TabsTrigger value="profile">
                  <User className="size-4" />
                  Profil</TabsTrigger>
                <TabsTrigger value="channels">
                  <Layers className="size-4" />
                  Canaux</TabsTrigger>
                <TabsTrigger value="appearance">
                  <Palette className="size-4" />
                  Apparence</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile">
              <Card className="rounded-[28px] border-border/70 bg-card shadow-[0_18px_50px_rgba(33,52,24,0.06)]">
                <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6">
                  <CardTitle>
                    Votre profil
                  </CardTitle>
                  <CardDescription>Gérez les informations de votre compte</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                    {user?.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt="Profil"
                        className="h-16 w-16 rounded-full"
                        width={64}
                        height={64}
                      />
                    ):(
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <User className="size-8 text-muted-foreground" />
                      </div>
                    )}

                    <div>
                      <p className="font-medium">{user?.fullName || "Aucun nom défini"}</p>
                      <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                   <div className="mt-6">
                    <UserProfile
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "border-0 shadow-none",
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="channels">
              <ChannelsTab  />
            </TabsContent>

            <TabsContent value="appearance">
              <Card className="rounded-[28px] border-border/70 bg-card shadow-[0_18px_50px_rgba(33,52,24,0.06)]">
                <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6">
                  <CardTitle>Apparence</CardTitle>
                  <CardDescription>Personnalisez l&apos;apparence de Lemon.ai</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-background/75 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="theme" className="text-sm font-bold">Mode sombre</Label>
                      <p className="text-sm text-muted-foreground">
                        Basculez entre le thème clair et le thème sombre.
                      </p>
                    </div>
                    <Switch
                      id="theme"
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </div>
  )
}

export default SettingsPage
