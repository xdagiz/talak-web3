import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col justify-center flex-1 px-4 max-w-5xl mx-auto">
      <section className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fd-primary/10 text-fd-primary text-sm font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fd-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-fd-primary"></span>
          </span>
          v1.0 Now Available
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-fd-foreground to-fd-muted-foreground bg-clip-text text-transparent">
          Talak Web3
        </h1>
        <p className="text-xl text-fd-muted-foreground max-w-2xl mx-auto mb-8">
          Server-side SIWE authentication, RPC failover, and account abstraction for modern Web3
          applications.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/docs/introduction"
            className="px-6 py-2.5 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium hover:bg-fd-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/docs/api-reference"
            className="px-6 py-2.5 rounded-lg border border-fd-border font-medium hover:bg-fd-accent transition-colors"
          >
            API Reference
          </Link>
        </div>
      </section>
    </div>
  );
}
