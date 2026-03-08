import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingConfig {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
}

interface OrgBranding {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  loading: boolean;
}

const DEFAULT_PRIMARY = "#6366f1";
const DEFAULT_ACCENT = "#8b5cf6";

function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useBranding(applyCSS = false): OrgBranding {
  const [branding, setBranding] = useState<OrgBranding>({
    companyName: "",
    logoUrl: null,
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    loading: true,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("organisations")
        .select("name, branding_config")
        .limit(1)
        .maybeSingle();

      if (data) {
        const org = data as any;
        const config: BrandingConfig = org.branding_config || {};
        setBranding({
          companyName: org.name || "",
          logoUrl: config.logo_url || null,
          primaryColor: config.primary_color || DEFAULT_PRIMARY,
          accentColor: config.accent_color || DEFAULT_ACCENT,
          loading: false,
        });
      } else {
        setBranding((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, []);

  // Apply CSS custom properties when branding loads
  useEffect(() => {
    if (!applyCSS || branding.loading) return;

    const root = document.documentElement;
    if (branding.primaryColor && branding.primaryColor !== DEFAULT_PRIMARY) {
      root.style.setProperty("--primary", hexToHSL(branding.primaryColor));
    }
    if (branding.accentColor && branding.accentColor !== DEFAULT_ACCENT) {
      root.style.setProperty("--accent", hexToHSL(branding.accentColor));
    }

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--accent");
    };
  }, [applyCSS, branding.loading, branding.primaryColor, branding.accentColor]);

  return branding;
}
