import { useEffect, useState } from "react";

export type NpmStats = {
  version: string | null;
  monthlyDownloads: number | null;
  unpackedSize: number | null;
  license: string | null;
  publishedAt: string | null;
  loading: boolean;
  error: boolean;
};

const cache = new Map<string, NpmStats>();
const inflight = new Map<string, Promise<NpmStats>>();

async function fetchOne(pkg: string): Promise<NpmStats> {
  const encoded = encodeURIComponent(pkg).replace("%40", "@");
  const stats: NpmStats = {
    version: null,
    monthlyDownloads: null,
    unpackedSize: null,
    license: null,
    publishedAt: null,
    loading: false,
    error: false,
  };

  try {
    const [meta, downloads] = await Promise.all([
      fetch(`https://registry.npmjs.org/${encoded}/latest`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`https://api.npmjs.org/downloads/point/last-month/${encoded}`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    if (meta) {
      stats.version = meta.version ?? null;
      stats.unpackedSize = meta.dist?.unpackedSize ?? null;
      stats.license = meta.license ?? null;
    }
    if (downloads && typeof downloads.downloads === "number") {
      stats.monthlyDownloads = downloads.downloads;
    }

    if (meta || downloads) {
      try {
        const time = await fetch(`https://registry.npmjs.org/${encoded}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);
        if (time?.time && stats.version && time.time[stats.version]) {
          stats.publishedAt = time.time[stats.version];
        }
      } catch {
        /* ignore */
      }
    } else {
      stats.error = true;
    }
  } catch {
    stats.error = true;
  }

  cache.set(pkg, stats);
  return stats;
}

export function useNpmStats(pkg: string | null | undefined): NpmStats {
  const [stats, setStats] = useState<NpmStats>(() =>
    pkg && cache.has(pkg)
      ? cache.get(pkg)!
      : {
          version: null,
          monthlyDownloads: null,
          unpackedSize: null,
          license: null,
          publishedAt: null,
          loading: !!pkg,
          error: false,
        }
  );

  useEffect(() => {
    if (!pkg) return;
    if (cache.has(pkg)) {
      setStats(cache.get(pkg)!);
      return;
    }
    let cancelled = false;
    setStats(s => ({ ...s, loading: true, error: false }));

    let pending = inflight.get(pkg);
    if (!pending) {
      pending = fetchOne(pkg);
      inflight.set(pkg, pending);
    }
    pending.then(result => {
      inflight.delete(pkg);
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return stats;
}

export function formatDownloads(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return n.toLocaleString();
}

export function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " MB";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " KB";
  return n + " B";
}
