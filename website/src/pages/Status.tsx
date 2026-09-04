import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Activity, Radio, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICES, INCIDENTS, type ServiceStatus } from "@/data/services";

const STATUS_TONE: Record<ServiceStatus, string> = {
  operational: "text-success",
  degraded: "text-warning",
  outage: "text-destructive",
};

const OVERALL = SERVICES.every((s) => s.status === "operational");

function Sparkline({ degraded = 0 }: { degraded?: number }) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const isDegraded =
      degraded > 0 &&
      i % Math.max(8, Math.floor(90 / Math.max(1, degraded))) === 7;
    return isDegraded;
  });
  return (
    <div className="flex items-end gap-[2px] h-7">
      {days.map((d, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] h-full rounded-[1px]",
            d ? "bg-warning/70" : "bg-success/70",
          )}
        />
      ))}
    </div>
  );
}

export default function Status() {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[1100px] px-6 py-12">
        {/* Headline */}
        <header className="mb-8">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono inline-flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Status
          </span>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                OVERALL ? "bg-success animate-pulse" : "bg-warning",
              )}
            />
            <h1 className="text-[28px] md:text-[32px] font-[500] tracking-[-0.02em]">
              {OVERALL ? "All systems operational" : "Some systems degraded"}
            </h1>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground font-mono inline-flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-success" /> live · last checked{" "}
            {now.toLocaleTimeString()}
          </p>
        </header>

        {/* Services */}
        <section className="mb-14">
          <h2 className="text-[16px] font-medium mb-3">
            Services · last 90 days
          </h2>
          <p className="text-[12px] text-muted-foreground mb-3">
            Click any service for its dedicated page with 90-day chart, SLA, and incident history.
          </p>
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Service
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                    Region
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    90-day
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                    Uptime
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                    p50 latency
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground w-8" />
                </tr>
              </thead>
              <tbody>
                {SERVICES.map((s) => (
                  <tr
                    key={s.slug}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer group"
                    onClick={() => {
                      window.location.href = `/status/${s.slug}`;
                    }}
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        to={`/status/${s.slug}`}
                        className="hover:text-foreground"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                      {s.region}
                    </td>
                    <td className="px-3 py-2.5">
                      <Sparkline degraded={s.uptime < 0.9998 ? 2 : 0} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">
                      {(s.uptime * 100).toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted-foreground hidden md:table-cell">
                      {s.latencyMs}ms
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right text-[12px] capitalize",
                        STATUS_TONE[s.status],
                      )}
                    >
                      {s.status}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      <ArrowRight className="h-3.5 w-3.5 inline group-hover:translate-x-0.5 transition-transform" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incidents */}
        <section>
          <h2 className="text-[16px] font-medium mb-3">Recent incidents</h2>
          {INCIDENTS.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center text-[13px] text-muted-foreground">
              No incidents in the last 90 days.
            </div>
          ) : (
            <ol className="space-y-3">
              {INCIDENTS.map((i) => (
                <li
                  key={i.id}
                  className="border border-border rounded-md p-4 bg-card/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11.5px] font-mono text-muted-foreground">
                      {i.date}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] font-mono px-1.5 py-0.5 border border-success/40 text-success rounded-sm">
                      {i.status}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-medium">{i.title}</h3>
                  <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.7]">
                    {i.body}
                  </p>
                  {i.affected.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {i.affected.map((slug) => (
                        <Link
                          key={slug}
                          to={`/status/${slug}`}
                          className="text-[11px] font-mono px-1.5 py-0.5 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                        >
                          {slug}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
