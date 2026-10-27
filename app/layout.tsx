import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Lemon.ai",
  title: "Lemon.ai — votre studio social",
  description:
    "Donnez vie à vos idées, planifiez vos publications et gardez une longueur d’avance sur les réseaux avec Lemon.ai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              disableTransitionOnChange
            >
              <TooltipProvider>
                {children}
              </TooltipProvider>

              <Toaster richColors />
            </ThemeProvider>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
