import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft, Save, Eye, Upload, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_id: string | null;
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

// ─── List view ─────────────────────────────────────────────────────────────────

export function AdminBlogList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const refresh = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load posts", description: error.message, variant: "destructive" });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Blog · admin";
    refresh();
    const channel = supabase
      .channel("admin-blog-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Post deleted" });
  };

  return (
    <AdminLayout title="Blog">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">{posts.length} posts</p>
          <Button onClick={() => navigate("/admin/blog/new")} size="sm" className="h-8 text-[12px] gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New post
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : posts.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-[13px] text-muted-foreground mb-3">No posts yet.</p>
            <Button onClick={() => navigate("/admin/blog/new")} size="sm" variant="outline" className="h-8 text-[12px]">
              Write your first post
            </Button>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {posts.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-card/40 transition-colors">
                <Link to={`/admin/blog/${p.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium truncate">{p.title || "(untitled)"}</span>
                    {p.published
                      ? <Badge className="text-[10px] h-4 px-1 bg-foreground/10 text-foreground hover:bg-foreground/15">published</Badge>
                      : <Badge variant="outline" className="text-[10px] h-4 px-1">draft</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono truncate">
                    <span>/{p.slug}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}</span>
                  </div>
                </Link>
                {p.published && (
                  <Link
                    to={`/blog/${p.slug}`}
                    className="text-muted-foreground hover:text-foreground"
                    title="View live"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Editor (new + existing) ───────────────────────────────────────────────────

export function AdminBlogEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(isNew);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `blog-covers/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    document.title = isNew ? "New post · admin" : "Edit post · admin";
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        toast({ title: "Post not found", variant: "destructive" });
        navigate("/admin/blog");
        return;
      }
      const p = data as Post;
      setTitle(p.title);
      setSlug(p.slug);
      setExcerpt(p.excerpt ?? "");
      setContent(p.content);
      setCoverUrl(p.cover_url ?? "");
      setTags((p.tags ?? []).join(", "));
      setPublished(p.published);
      setAutoSlug(false);
      setLoading(false);
    })();
  }, [id, isNew, navigate, toast]);

  useEffect(() => {
    if (autoSlug) setSlug(slugify(title));
  }, [title, autoSlug]);

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content,
      cover_url: coverUrl.trim() || null,
      tags: tagArr,
      published,
      published_at: published ? new Date().toISOString() : null,
      author_id: user?.id ?? null,
    };

    let savedId = id;
    if (isNew) {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").maybeSingle();
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      savedId = data?.id;
    } else {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", id!);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    setSaving(false);
    toast({ title: published ? "Published" : "Saved as draft" });
    if (isNew && savedId) navigate(`/admin/blog/${savedId}`);
  };

  if (loading) {
    return (
      <AdminLayout title="Edit post">
        <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? "New post" : "Edit post"}>
      <div className="p-4 md:p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/admin/blog" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> All posts
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-muted-foreground">Published</span>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 text-[12px] gap-1.5">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-[12px]">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-[14px]" placeholder="A great post" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px]">Slug</Label>
              <Input
                value={slug}
                onChange={e => { setSlug(slugify(e.target.value)); setAutoSlug(false); }}
                className="h-8 text-[13px] font-mono"
                placeholder="auto-from-title"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[12px]">Cover image (optional)</Label>
            {coverUrl && (
              <div className="relative group">
                <img 
                  src={coverUrl} 
                  alt="Cover preview" 
                  className="w-full max-h-64 object-cover rounded-md border border-border"
                />
                <button
                  onClick={() => setCoverUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded-full border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                className="h-8 text-[13px]"
                placeholder="Or paste an image URL…"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 text-[12px] gap-1.5"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Tags (comma-separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} className="h-8 text-[13px]" placeholder="siwe, rpc, release" />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Excerpt</Label>
            <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} className="text-[13px] min-h-[60px]" placeholder="One line shown on the listing." />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Content (Markdown-flavored — paragraphs, lines starting with # for headings, ``` for code)</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="text-[13px] font-mono min-h-[420px] leading-[1.7]"
              placeholder={"# Heading\n\nParagraphs go here…\n\n```ts\nimport { createTalak } from 'talak-web3';\n```"}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
