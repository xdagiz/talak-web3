import { Link, Navigate, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import { ArrowLeft, ArrowRight, BookOpen, Zap, ExternalLink } from "lucide-react";
import { INTEGRATIONS, getIntegration } from "@/data/integrations";
import { brandIcons } from "@/components/icons/brand-icons";

export default function IntegrationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const integration = slug ? getIntegration(slug) : undefined;
  if (!integration) return <Navigate to="/integrations" replace />;

  const others = INTEGRATIONS.filter((i) => i.slug !== integration.slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <Link
          to="/integrations"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All integrations
        </Link>

        <header className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono">Integration</p>
          <div className="mt-4 mb-4 flex items-center gap-3">
            {(() => {
              const Icon = brandIcons[integration.icon];
              return Icon ? <Icon className="h-12 w-12 shrink-0" /> : null;
            })()}
          </div>
          <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-[500] tracking-[-0.02em] leading-[1.1]">
            {integration.label}
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7] max-w-[680px]">
            {integration.tagline}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-[14px] font-medium mb-3">About</h2>
          <p className="text-[13.5px] text-foreground/85 leading-[1.8]">
            {integration.description}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[14px] font-medium mb-3">Install</h2>
          <CodeBlock
            filename="terminal"
            language="sh"
            showLineNumbers={false}
            code={integration.install}
          />
        </section>

        <section className="mb-10">
          <h2 className="text-[14px] font-medium mb-3">Wire it up</h2>
          <CodeBlock
            filename={integration.usageFile}
            code={integration.usage}
          />
        </section>

        <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-5">
            <h3 className="text-[14px] font-medium mb-3">What you get</h3>
            <ul className="space-y-1.5 text-[13px] text-foreground/85 leading-[1.65]">
              {integration.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1.5">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-background p-5">
            <h3 className="text-[14px] font-medium mb-3">Requirements</h3>
            <ul className="space-y-1.5 text-[13px] text-foreground/85 leading-[1.65]">
              {integration.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1.5">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
          <Link
            to="/keys"
            className="bg-background hover:bg-muted/30 transition-colors p-4 group"
          >
            <Zap className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[13px] font-medium">Generate an API key</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Tokens for server-to-server calls.
            </p>
          </Link>
          <Link
            to="/projects"
            className="bg-background hover:bg-muted/30 transition-colors p-4 group"
          >
            <Zap className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[13px] font-medium">Create a project</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Group events by environment.
            </p>
          </Link>
          <Link
            to="/webhooks"
            className="bg-background hover:bg-muted/30 transition-colors p-4 group"
          >
            <Zap className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[13px] font-medium">Wire a webhook</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              React to events on your backend.
            </p>
          </Link>
        </section>

        <section className="mb-10">
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" /> Read full docs
            <ExternalLink className="h-3 w-3" />
          </Link>
        </section>

        {/* Other integrations */}
        <section className="border-t border-border pt-8">
          <h2 className="text-[14px] font-medium mb-3">Other integrations</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
            {others.map((i) => (
              <li key={i.slug} className="bg-background">
                <Link
                  to={`/integrations/${i.slug}`}
                  className="block p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = brandIcons[i.icon];
                      return Icon ? <Icon className="h-5 w-5 shrink-0" /> : null;
                    })()}
                    <p className="text-[13px] font-medium">{i.label}</p>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground inline-flex items-center gap-1.5">
                    Open
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
