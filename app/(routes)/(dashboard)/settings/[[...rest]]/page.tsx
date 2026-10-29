"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfile, useUser } from "@clerk/nextjs"
import { Layers, Moon, Palette, Settings, Sun, User } from "lucide-react"
import ChannelsTab from "@/components/settings/channels-tab"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const SettingsPage = () => {
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto w-full h-full">
        {/* ── Header — Studio Editorial ── */}
        <div className="flex items-center gap-3 pt-2 pb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
            <Settings className="size-[18px] text-moss" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Paramètres</h1>
            <p className="text-[13px] text-mute mt-0.5">Configurez votre espace de travail Lemon.ai</p>
          </div>
        </div>

        <div>
          <Tabs defaultValue="channels">
            <div className="mb-6 w-full">
              <div className="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-white dark:bg-card p-0.5">
                <TabsTrigger
                  value="profile"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all duration-200",
                    "data-[state=active]:bg-ink data-[state=active]:text-lemon data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-mute data-[state=inactive]:hover:bg-mist data-[state=inactive]:hover:text-ink"
                  )}
                >
                  <User className="size-3.5" />
                  Profil
                </TabsTrigger>
                <TabsTrigger
                  value="channels"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all duration-200",
                    "data-[state=active]:bg-ink data-[state=active]:text-lemon data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-mute data-[state=inactive]:hover:bg-mist data-[state=inactive]:hover:text-ink"
                  )}
                >
                  <Layers className="size-3.5" />
                  Canaux
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all duration-200",
                    "data-[state=active]:bg-ink data-[state=active]:text-lemon data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-mute data-[state=inactive]:hover:bg-mist data-[state=inactive]:hover:text-ink"
                  )}
                >
                  <Palette className="size-3.5" />
                  Apparence
                </TabsTrigger>
              </div>
            </div>

            <TabsContent value="profile">
              <div className="rounded-2xl border border-hairline bg-white dark:bg-card overflow-hidden">
                {/* Profile card header */}
                <div className="relative border-b border-hairline px-6 py-5">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lemon/40 to-transparent" />
                  <h2 className="text-sm font-extrabold tracking-tight text-ink">Votre profil</h2>
                  <p className="text-xs text-mute mt-0.5">Gérez les informations de votre compte</p>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-mist/20 p-4">
                    {user?.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt="Profil"
                        className="h-14 w-14 rounded-xl ring-2 ring-lemon/20"
                        width={56}
                        height={56}
                      />
                    ):(
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
                        <User className="size-6 text-moss" />
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-ink">{user?.fullName || "Aucun nom défini"}</p>
                      <p className="text-sm text-mute">{user?.primaryEmailAddress?.emailAddress}</p>
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="channels">
              <ChannelsTab  />
            </TabsContent>

            <TabsContent value="appearance">
              <div className="rounded-2xl border border-hairline bg-white dark:bg-card overflow-hidden">
                {/* Appearance card header */}
                <div className="relative border-b border-hairline px-6 py-5">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lemon/40 to-transparent" />
                  <h2 className="text-sm font-extrabold tracking-tight text-ink">Apparence</h2>
                  <p className="text-xs text-mute mt-0.5">Personnalisez l'apparence de Lemon AI</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Theme toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-hairline bg-mist/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-lemon/15 border border-lemon/25">
                        {theme === "dark" ? (
                          <Moon className="size-[18px] text-moss" />
                        ) : (
                          <Sun className="size-[18px] text-moss" />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="theme" className="text-sm font-bold text-ink">Mode sombre</Label>
                        <p className="text-xs text-mute mt-0.5">
                          Basculer entre le thème clair et le thème sombre
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="theme"
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>

                  {/* Color preview */}
                  <div className="rounded-2xl border border-hairline bg-mist/20 p-4">
                    <p className="tag-code text-mute mb-3">Aperçu de la palette</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { name: "Lemon", color: "bg-lemon", textColor: "text-ink" },
                        { name: "Moss", color: "bg-moss", textColor: "text-white" },
                        { name: "Ink", color: "bg-ink", textColor: "text-lemon" },
                        { name: "Paper", color: "bg-paper border border-hairline", textColor: "text-ink" },
                        { name: "Mist", color: "bg-mist", textColor: "text-ink" },
                        { name: "Stamp", color: "bg-stamp", textColor: "text-white" },
                      ].map((swatch) => (
                        <div
                          key={swatch.name}
                          className={cn(
                            "flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold",
                            swatch.color,
                            swatch.textColor
                          )}
                        >
                          {swatch.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
