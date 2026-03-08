import { useEffect, useState } from "react";
import { Save, Upload } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BrandingConfig {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
}

export default function Settings() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("organisations")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      const org = data as any;
      setOrgId(org.id);
      setCompanyName(org.name || "");
      setWebsite(org.website || "");
      setTimezone(org.timezone || "Europe/London");
      setBranding(org.branding_config || {});
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB");
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `branding/logo.${ext}`;
    const { error } = await supabase.storage.from("interview-videos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Failed to upload logo");
      return;
    }
    const { data: urlData } = supabase.storage.from("interview-videos").getPublicUrl(path);
    setBranding((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    toast.success("Logo uploaded!");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (orgId) {
        const { error } = await supabase
          .from("organisations")
          .update({
            name: companyName,
            website: website || null,
            timezone,
            branding_config: branding,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organisations")
          .insert({
            name: companyName,
            website: website || null,
            timezone,
            branding_config: branding,
          } as any);
        if (error) throw error;
      }
      toast.success("Settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">Organisation and branding configuration</p>
        </div>

        {/* General */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">General</h2>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {["Europe/London", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Branding */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Branding</h2>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            {branding.logo_url ? (
              <div className="space-y-2">
                <img src={branding.logo_url} alt="Logo" className="h-12 rounded bg-secondary/50 p-1" />
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer">
                    <Upload className="h-3 w-3" /> Replace
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setBranding((prev) => ({ ...prev, logo_url: undefined }))}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer w-fit">
                <Upload className="h-4 w-4" /> Upload logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            )}
            <p className="text-xs text-muted-foreground">Shown on candidate interview pages. Max 5 MB.</p>
          </div>

          {/* Colours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primary_color || "#6366f1"}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={branding.primary_color || "#6366f1"}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primary_color: e.target.value }))}
                  className="bg-secondary/50 border-border/50 font-mono text-xs"
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accent_color || "#8b5cf6"}
                  onChange={(e) => setBranding((prev) => ({ ...prev, accent_color: e.target.value }))}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={branding.accent_color || "#8b5cf6"}
                  onChange={(e) => setBranding((prev) => ({ ...prev, accent_color: e.target.value }))}
                  className="bg-secondary/50 border-border/50 font-mono text-xs"
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {(branding.primary_color || branding.accent_color || branding.logo_url) && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Preview</p>
              <div className="flex items-center gap-3">
                {branding.logo_url && <img src={branding.logo_url} alt="Logo preview" className="h-8" />}
                <span className="font-display font-semibold">{companyName || "Your Company"}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ background: branding.primary_color || "#6366f1" }}
                >
                  Primary Button
                </button>
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ background: branding.accent_color || "#8b5cf6" }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="glow-button flex items-center gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
