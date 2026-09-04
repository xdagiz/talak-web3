import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Loader2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalakMark } from "@/components/TalakMark";
import { Footer } from "@/components/Footer";
import { format } from "date-fns";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

export default function Blog() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Blog — talak-web3";
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_url, tags, published_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setPosts([]);
      } else {
        setError(null);
        setPosts((data as Post[]) ?? []);
      }
    };
    load();
    const channel = supabase
      .channel("public-blog-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 -ml-0.5">
            <TalakMark className="h-7 w-7 text-foreground" />
            <span className="text-[15px] font-bold text-foreground tracking-[0.04em]">talak-web3</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-foreground/70">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/packages" className="hover:text-foreground transition-colors">Packages</Link>
            <Link to="/blog" className="text-foreground">Blog</Link>
          </div>
          <Link to="/" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <section className="pt-16 pb-12 px-6">
        <div className="mx-auto max-w-[900px]">
          <p className="text-[13px] uppercase tracking-[0.18em] text-foreground/50 mb-3 font-mono">
            blog
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-[500] tracking-[-0.035em] leading-[1.05]">
            Notes from the talak-web3 team.
          </h1>
          <p className="mt-5 text-[15px] text-foreground/65 max-w-[640px] leading-relaxed">
            Releases, deep-dives, and engineering notes — written by the people building the SDK.
          </p>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-[900px]">
          {posts === null ? (
            <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="border border-border p-8 text-[13px] text-muted-foreground">
              The blog isn't reachable yet — make sure the <code className="font-mono">blog_posts</code> table is created.
            </div>
          ) : posts.length === 0 ? (
            <div className="border border-border p-12 text-center">
              <p className="text-[14px] text-foreground/70">No posts yet — check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map(p => {
                const date = p.published_at ?? p.created_at;
                return (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="group block border border-border rounded-lg overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    {p.cover_url && (
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={p.cover_url} 
                          alt="" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                      </div>
                    )}
                    <div className="px-6 py-5">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mb-3">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(date), "MMM d, yyyy")}
                        {p.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <Tag className="h-3 w-3" />
                            <span>{p.tags.slice(0, 3).join(" · ")}</span>
                          </>
                        )}
                      </div>
                      <h2 className="text-[20px] md:text-[22px] font-[500] tracking-[-0.02em] mb-3 group-hover:text-foreground/80">
                        {p.title}
                      </h2>
                      {p.excerpt && (
                        <p className="text-[13.5px] text-foreground/65 leading-[1.65] max-w-[640px]">
                          {p.excerpt}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-foreground/55 group-hover:text-foreground transition-colors">
                        Read post <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
