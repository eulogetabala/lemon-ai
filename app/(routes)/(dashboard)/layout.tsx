import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./_common/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="border-none bg-[#edf2eb]">
        <div className="relative m-2 flex h-[calc(100vh-16px)] flex-col overflow-hidden rounded-[26px] border border-[#e3e8df] bg-[linear-gradient(180deg,#f7f9f4_0%,#edf2ea_100%)] shadow-[0_30px_60px_-36px_rgba(17,20,16,0.18)]">
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-40" />

          <header className="relative z-10 flex items-center justify-between gap-4 border-b border-[#e5e9e1] bg-[#fbfcf8]/90 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[#dfe8dc] bg-[#f0f7dd] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#204d2f]">
                Studio
              </span>
              <div className="hidden items-center gap-2 text-sm text-[#5f6b62] sm:flex">
                <span className="inline-flex size-2 rounded-full bg-[#27C93F]" />
                8 canaux en ligne
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="rounded-full border border-[#e5e8df] bg-white px-3 py-2 text-xs font-semibold text-[#111410] shadow-sm transition-colors hover:bg-[#f8faf6]">
                Alerte veille
              </button>
              <button className="rounded-full bg-[#0d1714] px-3 py-2 text-xs font-bold text-[#f8fffb] transition-colors hover:bg-[#142b25]">
                + Nouveau projet
              </button>
            </div>
          </header>

          <div className="relative z-10 flex-1 overflow-auto px-4 pb-5 pt-4 sm:px-6">
            <div className="mx-auto max-w-7xl py-2">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}