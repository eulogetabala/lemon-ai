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
        {/* Main content wrapper with premium dark aesthetic */}
        <div
          className="
            m-1.5 rounded-2xl border h-[calc(100vh-12px)]
            border-white/[0.06] dark:border-white/[0.06]
            border-border/60
            bg-background
            dark:bg-[#070d1a]
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]
            overflow-hidden
            flex flex-col
          "
        >
          {/* Subtle top gradient accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent shrink-0" />

          {/* Content area */}
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="py-2">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}