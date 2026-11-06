import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./_common/app-sidebar";
import { Bell, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="border-none bg-[#F4F6FA]">
        <div className="flex h-screen flex-col overflow-hidden bg-[#F4F6FA]">
          {/* Top Navbar */}
          <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md">
            {/* Search Input */}
            <div className="relative flex w-full max-w-md items-center">
              <Search className="pointer-events-none absolute left-3.5 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une fonctionnalité... (⌘ + K)"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 transition-all focus:border-[#FF5722] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5722]/15"
              />
            </div>

            {/* Right actions: Notifications & User profile */}
            <div className="flex items-center gap-3">
              {/* Notification bell with badge */}
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Bell className="size-4" />
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#FF5722] text-[10px] font-bold text-white shadow-sm">
                  3
                </span>
              </button>

              {/* Clerk User Avatar / Profile */}
              <div className="flex items-center pl-1">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "size-9 rounded-xl border border-slate-200",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          {/* Main content viewport */}
          <main className="relative flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
