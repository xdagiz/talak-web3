import { Link, Navigate, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Activity, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SERVICES,
  INCIDENTS,
  getService,
  type ServiceStatus,
} from "@/data/services";

const STATUS_TONE: Record<ServiceStatus, string> = {
  operational: "text-success",
  degraded: "text-warning",
  outage: "text-destructive",
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
};

function Sparkline({ degraded = 0 }: { degraded?: number }) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const isDegraded =
      degraded > 0 &&
      i % Math.max(8, Math.floor(90 / Math.max(1, degraded))) === 7;
    return isDegraded;
  });
  return (
    <div className="flex items-end gap-[3px] h-10">
      {days.map((d, i) => (
        <span
          key={i}
          className={cn(
            "w-[5px] h-full rounded-[1px]",
            d ? "bg-warning/70" : "bg-success/70",
          )}
          title={`Day ${90 - i}`}
        />
      ))}
    </div>
  );
}

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? getService(slug) : undefined;
  if (!service) return <Navigate to="/status" replace />;

  const related = INCIDENTS.filter((i) => i.affected.includes(service.slug));
  const others = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[920px] px-6 py-12">
        <Link
          to="/status"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All services
        </Link>

        <header className="mb-10">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono inline-flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Status
          </span>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                STATUS_DOT[service.status],
                service.status === "operational" && "animate-pulse",
              )}
            />
            <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-[500] tracking-[-0.02em] leading-[1.1]">
              {service.name}
            </h1>
          </div>
          <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7] max-w-[640px]">
            {service.description}
          </p>
        </header>

        {/* Stat tiles */}
        <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-4">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
              Status
            </p>
            <p
              className={cn(
                "mt-1 text-[14px] capitalize font-medium",
                STATUS_TONE[service.status],
              )}
            >
              {service.status}
            </p>
          </div>
          <div className="bg-background p-4">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
              90-day uptime
            </p>
            <p className="mt-1 text-[14px] font-mono">
              {(service.uptime * 100).toFixed(3)}%
            </p>
          </div>
          <div className="bg-background p-4">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
              p50 latency
            </p>
            <p className="mt-1 text-[14px] font-mono">{service.latencyMs}ms</p>
          </div>
          <div className="bg-background p-4">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
              Region
            </p>
            <p className="mt-1 text-[13.5px]">{service.region}</p>
          </div>
        </section>

        {/* 90-day chart */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-medium">90-day history</h2>
            <p className="text-[11.5px] text-muted-foreground font-mono inline-flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-success" /> live
            </p>
          </div>
          <div className="border border-border rounded-md p-5">
            <Sparkline degraded={service.uptime < 0.9998 ? 2 : 0} />
            <div className="mt-3 flex items-center justify-between text-[11.5px] font-mono text-muted-foreground">
              <span>90 days ago</span>
              <span>today</span>
            </div>
          </div>
        </section>

        {/* SLA + endpoint */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-5">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">
              SLA
            </p>
            <p className="text-[13.5px]">{service.sla}</p>
          </div>
          {service.endpoint && (
            <div className="bg-background p-5">
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">
                Endpoint
              </p>
              <a
                href={service.endpoint}
                target="_blank"
                rel="noreferrer"
                className="text-[12.5px] font-mono text-muted-foreground hover:text-foreground break-all"
              >
                {service.endpoint}
              </a>
            </div>
          )}
        </section>

        {/* Related incidents */}
        <section className="mb-10">
          <h2 className="text-[14px] font-medium mb-3">Recent incidents</h2>
          {related.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center text-[13px] text-muted-foreground">
              No incidents in the last 90 days for this service.
            </div>
          ) : (
            <ol className="space-y-3">
              {related.map((i) => (
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
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Other services */}
        <section className="border-t border-border pt-8">
          <h2 className="text-[14px] font-medium mb-3">Other services</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {others.map((s) => (
              <li key={s.slug} className="bg-background">
                <Link
                  to={`/status/${s.slug}`}
                  className="block p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        STATUS_DOT[s.status],
                      )}
                    />
                    <p className="text-[13.5px] font-medium">{s.name}</p>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground inline-flex items-center gap-1.5">
                    {(s.uptime * 100).toFixed(3)}% · {s.latencyMs}ms
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
