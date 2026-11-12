/**
 * Fréquences de rafraîchissement des concurrents, partagées par le cron et par
 * la synchro à la demande (ouverture d'une fiche concurrent).
 *
 * Le cron tourne toutes les 30 minutes : c'est le bon rythme pour les réseaux
 * lus via une API authentifiée. LinkedIn est lu par scraping public, où 48
 * passages par jour et par page finissent par faire bloquer l'IP du serveur.
 */
export const SYNC_INTERVAL_MINUTES: Record<string, number> = {
  linkedin: 360,
};

export const DEFAULT_SYNC_INTERVAL_MINUTES = 30;

// Décalage déterministe, propre à chaque plateforme : sans lui, toutes les
// pages LinkedIn arriveraient à échéance pendant la même exécution.
const MAX_JITTER_MINUTES = 30;

type SyncScheduleRow = {
  id: string;
  platform: string;
  synced_at: string | null;
};

function platformJitterMinutes(row: SyncScheduleRow): number {
  if (SYNC_INTERVAL_MINUTES[row.platform] === undefined) return 0;
  let hash = 0;
  for (let i = 0; i < row.id.length; i++) {
    hash = (hash * 31 + row.id.charCodeAt(i)) % 100_000;
  }
  return hash % MAX_JITTER_MINUTES;
}

export function syncIntervalMinutes(row: SyncScheduleRow): number {
  return (
    (SYNC_INTERVAL_MINUTES[row.platform] ?? DEFAULT_SYNC_INTERVAL_MINUTES) +
    platformJitterMinutes(row)
  );
}

/**
 * `synced_at` est écrit aussi bien après un succès qu'après un échec : une page
 * qui échoue respecte donc le même délai avant d'être retentée, ce qui sert de
 * temporisation (pas de nouvelle tentative à chaque passage du cron ni à chaque
 * ouverture de la fiche). Une plateforme jamais synchronisée est toujours due.
 */
export function isSyncDue(row: SyncScheduleRow, now = Date.now()): boolean {
  if (!row.synced_at) return true;
  const last = Date.parse(row.synced_at);
  if (!Number.isFinite(last)) return true;
  return now - last >= syncIntervalMinutes(row) * 60_000;
}
