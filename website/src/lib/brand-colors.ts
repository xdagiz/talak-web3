export const BRAND_COLORS = {
  cyanBlue: "#18B7FF",
  neonGreen: "#33E38E",
  warmYellow: "#F4B942",
  softPurple: "#8B5CFF",
  coralRed: "#FF5A5F",
} as const;

export const BRAND_COLOR_LIST = [
  { name: "Cyan Blue",   hex: BRAND_COLORS.cyanBlue,   varName: "--brand-cyan" },
  { name: "Neon Green",  hex: BRAND_COLORS.neonGreen,  varName: "--brand-green" },
  { name: "Warm Yellow", hex: BRAND_COLORS.warmYellow, varName: "--brand-yellow" },
  { name: "Soft Purple", hex: BRAND_COLORS.softPurple, varName: "--brand-purple" },
  { name: "Coral Red",   hex: BRAND_COLORS.coralRed,   varName: "--brand-coral" },
];
