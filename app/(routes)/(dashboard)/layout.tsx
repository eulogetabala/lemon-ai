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
      <SidebarInset className="relative min-h-svh min-w-0 flex-1 border-none bg-background">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -right-28 -top-36 size-[28rem] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-48 left-[35%] size-[24rem] rounded-full bg-lime-200/20 blur-[120px] dark:bg-lime-500/5" />
        </div>

        <div className="relative z-10 flex min-h-svh min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-card text-foreground/70 shadow-sm hover:bg-muted" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.22em] text-foreground/70">Lemon studio</span>
                <span aria-hidden="true" className="size-1 rounded-full bg-primary" />
                <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Social intelligence</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-500" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Studio actif</span>
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
