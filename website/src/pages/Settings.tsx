import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User, Settings as SettingsIcon, Shield, Trash2, Loader2, Camera, Wallet as WalletIcon, LayoutGrid } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CHAINS } from "@/data/chains";
import type { Tables, Json } from "@/integrations/supabase/types";

// ─── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Avatar must be under 5 MB.", variant: "destructive" });
      return;
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      toast({ title: "Invalid file extension", description: "Please upload a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) toast({ title: "Error", description: updateError.message, variant: "destructive" });
    else { toast({ title: "Avatar updated" }); await refreshProfile(); }
  };

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setJobTitle(profile.job_title || ""); }
  }, [profile]);

  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, job_title: jobTitle }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated" }); await refreshProfile(); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated" }); setNewPassword(""); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Profile Information</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative group">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ""} className="object-contain" />
              <AvatarFallback className="text-[12px]">{initials || "?"}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Camera className="h-3.5 w-3.5 text-white" />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </div>
          <div>
            <p className="text-[13px] font-medium">{fullName || "Your Name"}</p>
            <p className="text-[12px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <div className="space-y-1">
            <Label className="text-[12px]">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="h-8 text-[13px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Smart Contract Engineer" className="h-8 text-[13px]" />
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="h-7 text-[12px] mt-3">
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Save
        </Button>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Change Password</p>
        <div className="max-w-xs space-y-1">
          <Label className="text-[12px]">New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-8 text-[13px]" />
        </div>
        <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" size="sm" className="h-7 text-[12px] mt-3">
          {changingPassword && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Update Password
        </Button>
      </div>
    </div>
  );
}

// ─── Wallets Tab ────────────────────────────────────────────────────────────────

type Wallet = {
  id: string;
  address: string;
  chain_id: number;
  is_primary: boolean;
  label: string | null;
  created_at: string;
};

function WalletsTab() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
    setWallets(data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) refresh(); }, [user]);

  const handleAdd = async () => {
    if (!user || !newAddress.trim()) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress.trim())) {
      toast({ title: "Invalid address", description: "Enter a valid 0x… Ethereum address", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("wallets").insert({
      user_id: user.id,
      address: newAddress.trim().toLowerCase(),
      chain_id: 1,
      is_primary: wallets.length === 0,
      label: "",
    });
    setAdding(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Wallet linked" }); setNewAddress(""); refresh(); }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Wallet removed" }); refresh(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Link Wallet</p>
        <div className="flex gap-2 max-w-lg">
          <Input
            placeholder="0x…"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="h-8 text-[13px] font-mono flex-1"
          />
          <Button onClick={handleAdd} disabled={adding || !newAddress} size="sm" className="h-8 text-[12px] gap-1">
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <WalletIcon className="h-3 w-3" />} Link
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Linked Wallets · {wallets.length}</p>
        <div className="space-y-1">
          {wallets.length === 0 && <p className="text-[12px] text-muted-foreground">No wallets linked yet.</p>}
          {wallets.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <WalletIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[13px] font-mono truncate">{w.address}</span>
                {w.is_primary && <Badge variant="outline" className="text-[10px] h-4 px-1">primary</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(w.id)} className="h-6 w-6 p-0">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Tab ───────────────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  user_agent: string | null;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function SessionsTab() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from("sessions").select("*").order("issued_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) refresh(); }, [user]);

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Session revoked" }); refresh(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="px-4 md:px-6 py-4">
      <p className="text-[12px] text-muted-foreground font-medium mb-3">Active Sessions · {sessions.length}</p>
      <div className="space-y-1">
        {sessions.length === 0 && <p className="text-[12px] text-muted-foreground">No sessions recorded yet.</p>}
        {sessions.map((s) => {
          const expired = new Date(s.expires_at) < new Date();
          const state = s.revoked_at ? "revoked" : expired ? "expired" : "active";
          return (
            <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[13px] truncate">{s.user_agent || "—"}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">{state}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(s.issued_at), { addSuffix: true })}
                </span>
              </div>
              {state === "active" && (
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(s.id)} className="h-6 px-2 text-[11px]">
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── General Tab ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") return document.documentElement.classList.contains("dark") ? "dark" : "light";
    return "dark";
  });

  const toggleTheme = (value: string) => {
    setThemeState(value);
    if (value === "dark") { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Appearance</p>
        <div className="flex items-center justify-between max-w-lg">
          <span className="text-[13px]">Theme</span>
          <Select value={theme} onValueChange={toggleTheme}>
            <SelectTrigger className="w-[100px] h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Tab ───────────────────────────────────────────────────────────

type WorkspaceSettings = Tables<"workspace_settings">;

function WorkspaceTab() {
  const { user } = useAuth();
  const [defaultChain, setDefaultChain] = useState<number>(1);
  const [notifications, setNotifications] = useState({ email: true, rpc_alerts: false, webhook_failures: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("workspace_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const row = data as WorkspaceSettings;
        setDefaultChain(row.default_chain);
        const notif = row.notifications as Record<string, unknown> | null;
        if (notif) {
          setNotifications({
            email: Boolean(notif.email),
            rpc_alerts: Boolean(notif.rpc_alerts),
            webhook_failures: Boolean(notif.webhook_failures),
          });
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      default_chain: defaultChain,
      notifications: notifications as unknown as Json,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("workspace_settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Workspace settings saved" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="px-4 md:px-6 py-4 divide-y divide-border">
      <div className="pb-4 space-y-3">
        <p className="text-[12px] text-muted-foreground font-medium mb-1">Default Chain</p>
        <div className="flex items-center justify-between max-w-lg">
          <span className="text-[13px]">Used as the default network for new RPC calls.</span>
          <Select value={String(defaultChain)} onValueChange={(v) => setDefaultChain(Number(v))}>
            <SelectTrigger className="w-[160px] h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHAINS.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="py-4 space-y-3">
        <p className="text-[12px] text-muted-foreground font-medium mb-1">Notifications</p>
        {([
          ["email", "Email notifications"],
          ["rpc_alerts", "RPC alerts"],
          ["webhook_failures", "Webhook failures"],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between max-w-lg">
            <span className="text-[13px]">{label}</span>
            <Switch
              checked={notifications[key]}
              onCheckedChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={saving} size="sm" className="h-7 text-[12px]">
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Save Changes
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function Settings() {
  const tabs = [
    { id: "profile", label: "Profile", icon: User, component: <ProfileTab /> },
    { id: "wallets", label: "Wallets", icon: WalletIcon, component: <WalletsTab /> },
    { id: "sessions", label: "Sessions", icon: Shield, component: <SessionsTab /> },
    { id: "workspace", label: "Workspace", icon: LayoutGrid, component: <WorkspaceTab /> },
    { id: "general", label: "General", icon: SettingsIcon, component: <GeneralTab /> },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium">Settings</h1>
        </div>
        <Tabs defaultValue="profile" className="flex-1 flex flex-col md:flex-row min-h-0">
          <TabsList className="md:flex-col md:h-auto md:items-stretch md:justify-start md:w-48 md:border-r border-border bg-transparent rounded-none p-2 gap-px md:shrink-0 overflow-x-auto md:overflow-x-visible">
            {tabs.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="md:justify-start text-[13px] h-8 px-2 gap-2 data-[state=active]:bg-muted"
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex-1 overflow-auto">
            {tabs.map(t => (
              <TabsContent key={t.id} value={t.id} className="mt-0 max-w-3xl">
                {t.component}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
