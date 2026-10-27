import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./_common/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative min-h-svh min-w-0 flex-1 border-none bg-transparent">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 size-[30rem] rounded-full bg-accent/25 blur-[140px]" />
          <div className="absolute -bottom-52 left-[28%] size-[26rem] rounded-full bg-chart-1/8 blur-[130px]" />
        </div>

        <div className="relative z-10 flex min-h-svh min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-card text-foreground/70 shadow-sm hover:bg-muted" />
              <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
                <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground">L</span>
                <span className="truncate text-xs font-extrabold uppercase tracking-[0.18em] text-foreground">Lemon studio</span>
                <span aria-hidden="true" className="text-border">/</span>
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Créer · publier · grandir</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-2 shadow-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-4 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-chart-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Studio actif</span>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
