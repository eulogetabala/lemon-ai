"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FacebookPagePicker } from "@/components/settings/facebook-page-picker";

/**
 * Completes the Facebook reconnect flow started from the competitor page: the
 * OAuth callback comes back here with `fb_page_select=true`, so the Page picker
 * has to live on this screen too — otherwise the freshly granted token is never
 * attached to the channel.
 *
 * Reads search params, so it must be rendered inside a `<Suspense>` boundary.
 */
export function FacebookReconnectPicker({ onSelected }: { onSelected?: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [userClosed, setUserClosed] = React.useState(false);

  const pending = searchParams.get("fb_page_select") === "true";
  const error = searchParams.get("error");
  const connected = searchParams.get("connected");
  const open = pending && !userClosed;

  React.useEffect(() => {
    if (connected === "false" && error) {
      toast.error(error);
    } else if (connected === "true" && !pending) {
      toast.success("Facebook reconnecté");
    }
  }, [connected, error, pending]);

  const close = React.useCallback(() => {
    setUserClosed(true);
    if (pending || error || connected) router.replace(pathname);
  }, [connected, error, pathname, pending, router]);

  return (
    <FacebookPagePicker
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      onSelected={() => {
        // The OAuth flow runs in the tab opened by `startFacebookReconnect`:
        // hand the result back to the window that started it and close ourselves.
        const opener = window.opener as Window | null;
        if (opener && opener !== window) {
          try {
            opener.location.reload();
          } catch {
            // Cross-origin opener: fall through to the local handler.
          }
          window.close();
          return;
        }
        close();
        onSelected?.();
      }}
    />
  );
}
