import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
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
  content: string;
  cover_url: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

/**
 * Tiny markdown-ish renderer — handles headings (#, ##, ###), code fences,
 * inline code, paragraphs, blockquotes and lists. No external deps.
 */
function renderMarkdownBlocks(src: string): React.ReactNode[] {
  const lines = src.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const start = i + 1;
      let end = start;
      while (end < lines.length && !lines[end].startsWith("```")) end++;
      const code = lines.slice(start, end).join("\n");
      out.push(
        <pre
          key={key++}
          className="my-5 rounded border border-border bg-[#0d1117] text-foreground/90 px-4 py-3 overflow-x-auto text-[12.5px] font-mono leading-[1.65]"
        >
          {lang && <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
      i = end + 1;
      continue;
    }

    // Headings
    if (/^###\s+/.test(line)) {
      out.push(<h3 key={key++} className="mt-7 mb-2 text-[15px] font-medium">{line.replace(/^###\s+/, "")}</h3>);
      i++; continue;
    }
    if (/^##\s+/.test(line)) {
      out.push(<h2 key={key++} className="mt-9 mb-3 text-[19px] font-medium tracking-[-0.01em]">{line.replace(/^##\s+/, "")}</h2>);
      i++; continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(<h1 key={key++} className="mt-10 mb-4 text-[24px] font-medium tracking-[-0.02em]">{line.replace(/^#\s+/, "")}</h1>);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const start = i;
      while (i < lines.length && lines[i].startsWith(">")) i++;
      const text = lines.slice(start, i).map(l => l.replace(/^>\s?/, "")).join(" ");
      out.push(
        <blockquote key={key++} className="my-5 border-l-2 border-border pl-4 text-foreground/70 italic">
          {renderInline(text)}
        </blockquote>
      );
      continue;
    }

    // List
    if (/^[-*]\s+/.test(line)) {
      const start = i;
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) i++;
      out.push(
        <ul key={key++} className="my-4 space-y-1.5 list-disc list-outside pl-5 text-foreground/85">
          {lines.slice(start, i).map((l, idx) => (
            <li key={idx} className="text-[14px] leading-[1.7]">{renderInline(l.replace(/^[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") { i++; continue; }

    // Paragraph (consume until blank)
    const start = i;
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("```") && !lines[i].startsWith(">") && !/^[-*]\s+/.test(lines[i])) i++;
    const text = lines.slice(start, i).join(" ");
    out.push(<p key={key++} className="my-4 text-[14.5px] leading-[1.75] text-foreground/80">{renderInline(text)}</p>);
  }
  return out;
}

function renderInline(text: string): React.ReactNode {
  // inline code `…`, bold **…**, links [text](url)
  const parts: React.ReactNode[] = [];
  let i = 0; let key = 0;
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(<code key={key++} className="font-mono text-[13px] px-1 py-0.5 rounded bg-muted text-foreground">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      parts.push(<strong key={key++} className="text-foreground font-medium">{tok.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (linkMatch) parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
          {linkMatch[1]}
        </a>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      const p = (data as Post) ?? null;
      setPost(p);
      if (p) {
        document.title = `${p.title} — talak-web3`;
        
        // Update meta tags
        const updateMeta = (name: string, content: string, isProperty = false) => {
          let meta = document.querySelector(isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`);
          if (!meta) {
            meta = document.createElement("meta");
            if (isProperty) {
              meta.setAttribute("property", name);
            } else {
              meta.setAttribute("name", name);
            }
            document.head.appendChild(meta);
          }
          meta.setAttribute("content", content);
        };
        
        const url = window.location.href;
        const description = p.excerpt || "A post from talak-web3 blog";
        const image = p.cover_url || "https://eshyhdttxyumbmyenpso.supabase.co/storage/v1/object/public/public/opengraph.jpg";
        
        updateMeta("description", description);
        updateMeta("og:title", p.title, true);
        updateMeta("og:description", description, true);
        updateMeta("og:type", "article", true);
        updateMeta("og:url", url, true);
        updateMeta("og:image", image, true);
        updateMeta("twitter:card", "summary_large_image");
        updateMeta("twitter:title", p.title);
        updateMeta("twitter:description", description);
        updateMeta("twitter:image", image);
      }
    };
    load();
    const channel = supabase
      .channel(`blog-post-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts", filter: `slug=eq.${slug}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [slug]);

  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (post === null) return <Navigate to="/blog" replace />;

  const date = post.published_at ?? post.created_at;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 -ml-0.5">
            <TalakMark className="h-7 w-7 text-foreground" />
            <span className="text-[15px] font-bold text-foreground tracking-[0.04em]">talak-web3</span>
          </Link>
          <Link to="/blog" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> All posts
          </Link>
        </div>
      </nav>

      <article className="px-6 pt-12 pb-24">
        <div className="mx-auto max-w-[760px]">
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-mono mb-3">
            <Calendar className="h-3 w-3" /> {format(new Date(date), "MMMM d, yyyy")}
            {post.tags.length > 0 && (
              <>
                <span>·</span>
                <Tag className="h-3 w-3" /> {post.tags.join(" · ")}
              </>
            )}
          </div>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-[500] tracking-[-0.025em] leading-[1.1] mb-3">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-[15px] text-foreground/65 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          {post.cover_url && (
            <div className="relative mt-8 overflow-hidden rounded-lg border border-border">
              <img 
                src={post.cover_url} 
                alt="" 
                className="w-full max-h-[500px] object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
            </div>
          )}

          <div className="mt-8">
            {renderMarkdownBlocks(post.content)}
          </div>

          <div className="mt-12 pt-6 border-t border-border">
            <Link to="/blog" className="inline-flex items-center gap-1 text-[13px] text-foreground/70 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to all posts <ArrowRight className="h-3 w-3 ml-1 opacity-0" />
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
