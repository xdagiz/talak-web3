import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

type SettingRow = { key: string; value: Record<string, unknown> };

export default function AdminSite() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // hero
  const [heroBadge, setHeroBadge] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");

  // announcement
  const [annEnabled, setAnnEnabled] = useState(false);
  const [annText, setAnnText] = useState("");
  const [annHref, setAnnHref] = useState("");

  // socials
  const [github, setGithub] = useState("");
  const [x, setX] = useState("");
  const [discord, setDiscord] = useState("");

  useEffect(() => {
    document.title = "Site settings · admin";
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_settings").select("*");
      if (cancelled) return;
      const map: Record<string, Record<string, unknown>> = {};
      for (const row of (data as SettingRow[]) ?? []) map[row.key] = row.value || {};
      setHeroBadge(String(map.hero?.badge ?? ""));
      setHeroTitle(String(map.hero?.title ?? ""));
      setHeroSubtitle(String(map.hero?.subtitle ?? ""));
      setAnnEnabled(Boolean(map.announcement?.enabled));
      setAnnText(String(map.announcement?.text ?? ""));
      setAnnHref(String(map.announcement?.href ?? ""));
      setGithub(String(map.socials?.github ?? ""));
      setX(String(map.socials?.x ?? ""));
      setDiscord(String(map.socials?.discord ?? ""));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveSetting = async (key: string, value: Record<string, unknown>) => {
    setSaving(key);
    const { data: existing } = await supabase.from("site_settings").select("key").eq("key", key).maybeSingle();
    const jsonValue = value as unknown as import("@/integrations/supabase/types").Json;
    const op = existing
      ? supabase.from("site_settings").update({ value: jsonValue, updated_at: new Date().toISOString() }).eq("key", key)
      : supabase.from("site_settings").insert({ key, value: jsonValue });
    const { error } = await op;
    setSaving(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: `${key} saved` });
  };

  if (loading) {
    return (
      <AdminLayout title="Site settings">
        <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Site settings">
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        <Section
          title="Hero section"
          desc="Top of the landing page — badge, headline and subtitle."
          saving={saving === "hero"}
          onSave={() => saveSetting("hero", { badge: heroBadge, title: heroTitle, subtitle: heroSubtitle })}
        >
          <Field label="Badge"   value={heroBadge}    onChange={setHeroBadge} />
          <Field label="Title"   value={heroTitle}    onChange={setHeroTitle} />
          <Field label="Subtitle" value={heroSubtitle} onChange={setHeroSubtitle} multiline />
        </Section>

        <Section
          title="Announcement bar"
          desc="A single-line banner shown above the hero. Disable to hide."
          saving={saving === "announcement"}
          onSave={() => saveSetting("announcement", { enabled: annEnabled, text: annText, href: annHref })}
        >
          <div className="flex items-center justify-between max-w-md">
            <Label className="text-[12px]">Enabled</Label>
            <Switch checked={annEnabled} onCheckedChange={setAnnEnabled} />
          </div>
          <Field label="Text" value={annText} onChange={setAnnText} />
          <Field label="URL"  value={annHref} onChange={setAnnHref} />
        </Section>

        <Section
          title="Social links"
          desc="Used in the footer and the hero."
          saving={saving === "socials"}
          onSave={() => saveSetting("socials", { github, x, discord })}
        >
          <Field label="GitHub"  value={github}  onChange={setGithub} />
          <Field label="X (Twitter)" value={x}   onChange={setX} />
          <Field label="Discord" value={discord} onChange={setDiscord} />
        </Section>
      </div>
    </AdminLayout>
  );
}

function Section({
  title, desc, saving, onSave, children,
}: {
  title: string;
  desc: string;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border">
      <header className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium">{title}</h2>
          <p className="text-[11.5px] text-muted-foreground">{desc}</p>
        </div>
        <Button onClick={onSave} disabled={saving} size="sm" className="h-7 text-[12px] gap-1.5">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
        </Button>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1 max-w-2xl">
      <Label className="text-[12px]">{label}</Label>
      {multiline
        ? <Textarea value={value} onChange={e => onChange(e.target.value)} className="text-[13px] min-h-[80px]" />
        : <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 text-[13px]" />}
    </div>
  );
}
