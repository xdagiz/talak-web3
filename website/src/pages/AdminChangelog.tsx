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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft, Save, Eye, Upload, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type ChangelogEntry = {
  id: string;
  version: string;
  date: string;
  kind: string;
  headline: string;
  highlights: string[];
  details: string;
  upgrade: string | null;
  cover_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── List view ─────────────────────────────────────────────────────────────────

export function AdminChangelogList() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const refresh = async () => {
    const { data, error } = await supabase
      .from("changelog_entries")
      .select("*")
      .order("date", { ascending: false });
    if (error) toast({ title: "Could not load changelog", description: error.message, variant: "destructive" });
    setEntries((data as ChangelogEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Changelog · admin";
    refresh();
    const channel = supabase
      .channel("admin-changelog")
      .on("postgres_changes", { event: "*", schema: "public", table: "changelog_entries" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this changelog entry?")) return;
    const { error } = await supabase.from("changelog_entries").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Entry deleted" });
  };

  const KIND_COLORS: Record<string, string> = {
    major: "bg-success/20 text-success border-success/30",
    minor: "bg-info/20 text-info border-info/30",
    patch: "bg-muted text-muted-foreground border-border",
    security: "bg-warning/20 text-warning border-warning/30",
  };

  return (
    <AdminLayout title="Changelog">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">{entries.length} entries</p>
          <Button onClick={() => navigate("/admin/changelog/new")} size="sm" className="h-8 text-[12px] gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New entry
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-[13px] text-muted-foreground mb-3">No entries yet.</p>
            <Button onClick={() => navigate("/admin/changelog/new")} size="sm" variant="outline" className="h-8 text-[12px]">
              Write your first entry
            </Button>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-card/40 transition-colors">
                <Link to={`/admin/changelog/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium truncate font-mono">v{e.version}</span>
                    <Badge className={cn("text-[10px] h-4 px-1 border", KIND_COLORS[e.kind] || KIND_COLORS.patch)}>
                      {e.kind}
                    </Badge>
                    {e.published
                      ? <Badge className="text-[10px] h-4 px-1 bg-foreground/10 text-foreground hover:bg-foreground/15">published</Badge>
                      : <Badge variant="outline" className="text-[10px] h-4 px-1">draft</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono truncate">
                    <span>{format(new Date(e.date), "MMM d, yyyy")}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(e.updated_at), { addSuffix: true })}</span>
                  </div>
                </Link>
                {e.published && (
                  <Link
                    to={`/changelog/${e.version}`}
                    className="text-muted-foreground hover:text-foreground"
                    title="View live"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(e.id)}>
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

export function AdminChangelogEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [version, setVersion] = useState("");
  const [kind, setKind] = useState("patch");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [headline, setHeadline] = useState("");
  const [highlightsText, setHighlightsText] = useState("");
  const [details, setDetails] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `changelog-covers/${crypto.randomUUID()}.${fileExt}`;

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
    document.title = isNew ? "New entry · admin" : "Edit entry · admin";
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("changelog_entries").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        toast({ title: "Entry not found", variant: "destructive" });
        navigate("/admin/changelog");
        return;
      }
      const e = data as ChangelogEntry;
      setVersion(e.version);
      setKind(e.kind);
      setDate(format(new Date(e.date), "yyyy-MM-dd"));
      setHeadline(e.headline);
      setHighlightsText((e.highlights ?? []).join("\n"));
      setDetails(e.details);
      setUpgrade(e.upgrade ?? "");
      setCoverUrl(e.cover_url ?? "");
      setPublished(e.published);
      setLoading(false);
    })();
  }, [id, isNew, navigate, toast]);

  const handleSave = async () => {
    if (!version.trim() || !headline.trim()) {
      toast({ title: "Version and headline are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const highlightsArr = highlightsText.split("\n").map(t => t.trim()).filter(Boolean);
    const payload = {
      version: version.trim(),
      kind,
      date: new Date(date).toISOString(),
      headline: headline.trim(),
      highlights: highlightsArr,
      details,
      upgrade: upgrade.trim() || null,
      cover_url: coverUrl.trim() || null,
      published,
      published_at: published ? new Date().toISOString() : null,
    };

    let savedId = id;
    if (isNew) {
      const { data, error } = await supabase.from("changelog_entries").insert(payload).select("id").maybeSingle();
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      savedId = data?.id;
    } else {
      const { error } = await supabase.from("changelog_entries").update(payload).eq("id", id!);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }
    setSaving(false);
    toast({ title: published ? "Published" : "Saved as draft" });
    if (isNew && savedId) navigate(`/admin/changelog/${savedId}`);
  };

  if (loading) {
    return (
      <AdminLayout title="Edit entry">
        <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? "New entry" : "Edit entry"}>
      <div className="p-4 md:p-6 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/admin/changelog" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> All entries
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
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px]">Version</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} className="h-9 text-[13px] font-mono" placeholder="1.0.0" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">major</SelectItem>
                  <SelectItem value="minor">minor</SelectItem>
                  <SelectItem value="patch">patch</SelectItem>
                  <SelectItem value="security">security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-[13px]" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[12px]">Cover image (optional)</Label>
            {coverUrl && (
              <div className="relative group">
                <img 
                  src={coverUrl} 
                  alt="" 
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
            <Label className="text-[12px]">Headline</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} className="h-9 text-[14px]" placeholder="A great release" />
          </div>

          <div className="space-y-1">
            <Label className="text-[12px]">Highlights (one per line)</Label>
            <Textarea
              value={highlightsText}
              onChange={e => setHighlightsText(e.target.value)}
              className="text-[13px] min-h-[100px]"
              placeholder="Fix retry loop\nImprove type narrowing\nReduce bundle size"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[12px]">Details (Markdown-flavored)</Label>
            <Textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              className="text-[13px] font-mono min-h-[200px] leading-[1.7]"
              placeholder="# Details\n\nMore context about this release…"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[12px]">Upgrade notes (optional)</Label>
            <Textarea
              value={upgrade}
              onChange={e => setUpgrade(e.target.value)}
              className="text-[13px] min-h-[80px]"
              placeholder="What users need to know to upgrade"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
