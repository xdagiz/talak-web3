import { Link, Navigate, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft,
  ArrowRight,
  Github,
  Twitter,
  Mail,
  MapPin,
  CalendarDays,
  Globe,
  ExternalLink,
  User,
} from "lucide-react";
import { TEAM, getPerson } from "@/data/team";

export default function AboutPerson() {
  const { slug } = useParams<{ slug: string }>();
  const person = slug ? getPerson(slug) : undefined;
  if (!person) return <Navigate to="/about" replace />;

  const others = TEAM.filter((p) => p.slug !== person.slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[920px] px-6 py-12">
        {/* Back */}
        <Link
          to="/about"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> About
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start gap-5">
            <a
              href={person.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
              aria-label={`${person.name} on GitHub`}
            >
              <img
                src={`https://github.com/${person.github}.png?size=200`}
                alt={`${person.name} avatar`}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border border-border object-cover bg-muted"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.onerror = null;
                  img.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='%23222'/><text x='50%' y='54%' font-family='monospace' font-size='40' fill='%23999' text-anchor='middle' dominant-baseline='middle'>${person.name.charAt(
                    0,
                  )}</text></svg>`;
                }}
              />
            </a>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-2">
                {person.role}
              </p>
              <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-[500] tracking-[-0.02em] leading-[1.1]">
                {person.name}
              </h1>
              <p className="mt-2 text-[14px] text-muted-foreground leading-[1.7]">
                {person.tagline}
              </p>
            </div>
          </div>

          {/* Quick facts */}
          <dl className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
            <div className="bg-background p-3">
              <dt className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                Location
              </dt>
              <dd className="mt-1 text-[12.5px] inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {person.location}
              </dd>
            </div>
            <div className="bg-background p-3">
              <dt className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                Pronouns
              </dt>
              <dd className="mt-1 text-[12.5px] inline-flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                {person.pronouns}
              </dd>
            </div>
            <div className="bg-background p-3">
              <dt className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                Joined
              </dt>
              <dd className="mt-1 text-[12.5px] inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                {person.joined}
              </dd>
            </div>
            <div className="bg-background p-3">
              <dt className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                Handle
              </dt>
              <dd className="mt-1 text-[12.5px] font-mono">@{person.handle}</dd>
            </div>
          </dl>

          {/* Links */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={person.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
            >
              <Github className="h-3.5 w-3.5" /> github.com/{person.github}
            </a>
            {person.x && person.xUrl && (
              <a
                href={person.xUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" /> x.com/
                {person.x.replace("@", "")}
              </a>
            )}
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" /> {person.email}
              </a>
            )}
            {person.website && person.websiteUrl && (
              <a
                href={person.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> {person.website}
              </a>
            )}
          </div>
        </header>

        {/* Bio */}
        <section className="mb-12">
          <h2 className="text-[18px] font-[500] tracking-[-0.02em] mb-3">Bio</h2>
          <div className="space-y-4">
            {person.longBio.map((p, i) => (
              <p
                key={i}
                className="text-[14px] text-foreground/85 leading-[1.8]"
              >
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Focus + Skills */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-5">
            <h3 className="text-[14px] font-medium mb-3">Focus areas</h3>
            <ul className="space-y-1.5 text-[13px] text-foreground/85 leading-[1.65]">
              {person.focus.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1.5">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-background p-5">
            <h3 className="text-[14px] font-medium mb-3">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {person.skills.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-mono px-2 py-0.5 border border-border rounded-sm text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements timeline */}
        <section className="mb-12">
          <h2 className="text-[18px] font-[500] tracking-[-0.02em] mb-5">
            Milestones
          </h2>
          <ol className="space-y-5 relative pl-7">
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
              aria-hidden="true"
            />
            {person.achievements.map((a) => (
              <li key={a.year + a.title} className="relative">
                <span className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border border-border bg-background flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                </span>
                <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  {a.year}
                </p>
                <h3 className="text-[14px] font-medium mt-0.5">{a.title}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-[1.7] mt-1">
                  {a.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Contributions */}
        <section className="mb-12">
          <h2 className="text-[18px] font-[500] tracking-[-0.02em] mb-5">
            Notable contributions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {person.contributions.map((c) => {
              const isExternal = c.href?.startsWith("http");
              const inner = (
                <>
                  <h3 className="text-[13.5px] font-medium flex items-center gap-1.5">
                    {c.title}
                    {isExternal && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    )}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.7]">
                    {c.body}
                  </p>
                </>
              );
              if (!c.href) {
                return (
                  <div key={c.title} className="bg-background p-4">
                    {inner}
                  </div>
                );
              }
              return isExternal ? (
                <a
                  key={c.title}
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-background p-4 hover:bg-muted/30 transition-colors"
                >
                  {inner}
                </a>
              ) : (
                <Link
                  key={c.title}
                  to={c.href}
                  className="bg-background p-4 hover:bg-muted/30 transition-colors"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Press */}
        {person.press && person.press.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[18px] font-[500] tracking-[-0.02em] mb-5">
              Press &amp; mentions
            </h2>
            <ul className="space-y-2">
              {person.press.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between border border-border p-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-[13px] font-medium">{p.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {p.outlet}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Now / Fun facts */}
        {(person.nowPlaying || person.funFacts) && (
          <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {person.nowPlaying && (
              <div className="bg-background p-5">
                <h3 className="text-[14px] font-medium mb-3">Right now</h3>
                <dl className="space-y-2 text-[12.5px]">
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase text-[10.5px] tracking-[0.14em] text-muted-foreground w-20 shrink-0 pt-0.5">
                      Listening
                    </dt>
                    <dd>{person.nowPlaying.listening}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase text-[10.5px] tracking-[0.14em] text-muted-foreground w-20 shrink-0 pt-0.5">
                      Reading
                    </dt>
                    <dd>{person.nowPlaying.reading}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase text-[10.5px] tracking-[0.14em] text-muted-foreground w-20 shrink-0 pt-0.5">
                      Building
                    </dt>
                    <dd>{person.nowPlaying.building}</dd>
                  </div>
                </dl>
              </div>
            )}
            {person.funFacts && (
              <div className="bg-background p-5">
                <h3 className="text-[14px] font-medium mb-3">Fun facts</h3>
                <ul className="space-y-1.5 text-[12.5px] text-foreground/85 leading-[1.65]">
                  {person.funFacts.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-muted-foreground/50 mt-1.5">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Other people */}
        {others.length > 0 && (
          <section className="border-t border-border pt-8">
            <h2 className="text-[14px] font-medium mb-3">Also on the team</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
              {others.map((p) => (
                <li key={p.slug} className="bg-background">
                  <Link
                    to={`/about/${p.slug}`}
                    className="block p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                      {p.role}
                    </p>
                    <p className="text-[14px] font-medium mt-1">{p.name}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
                      Read profile
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
