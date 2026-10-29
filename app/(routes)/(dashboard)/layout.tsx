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
      <SidebarInset className="bg-background! border-none">
        {/* Main content wrapper — Studio Editorial */}
        <div
          className="
            relative
            m-2 rounded-2xl border border-border
            bg-paper dark:bg-paper
            h-[calc(100vh-16px)]
            overflow-hidden
            flex flex-col
          "
        >
          {/* Subtle wireframe grid behind content */}
          <div
            aria-hidden
            className="grid-lines pointer-events-none absolute inset-0 opacity-30 dark:hidden"
          />
          <div
            aria-hidden
            className="dark-grid-lines pointer-events-none absolute inset-0 opacity-30 hidden dark:block"
          />

          {/* Top accent bar — lemon line matching landing hero */}
          <div className="relative h-[3px] w-full shrink-0">
            <div className="absolute inset-0 bg-lemon" />
            <div className="absolute inset-0 bg-gradient-to-r from-lemon via-lemon/80 to-moss/40" />
          </div>

          {/* Content area */}
          <div className="relative flex-1 overflow-auto px-5 pb-5">
            <div className="py-4">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}