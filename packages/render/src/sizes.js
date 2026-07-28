/** Social + product canvas sizes (aligned with automation/config/excalidraw-preferences.yaml). */

export const CANVAS = {
  story: { width: 1080, height: 1350, label: "story" },
  square: { width: 1080, height: 1080, label: "square" },
  wide: { width: 1920, height: 1080, label: "wide" },
};

export const DEFAULT_EXPORT = {
  format: "jpeg",
  quality: 92,
};

export const SURFACES = {
  inktype: {
    brand: "InkType",
    footerTitle: "fold",
    defaultAspect: "story",
    watermark: true,
  },
  linkedin: {
    brand: "pager notes",
    footerTitle: "fold",
    defaultAspect: "story",
    watermark: false,
    series: "Pager Notes",
  },
  whatsapp: {
    brand: "pager notes",
    footerTitle: "fold",
    defaultAspect: "story",
    watermark: false,
  },
  portfolio: {
    brand: "pager notes",
    footerTitle: "fold",
    defaultAspect: "story",
    watermark: false,
  },
};

/** Phrases banned on channel packages (from excalidraw-preferences.yaml). */
export const FORBIDDEN_PHRASES = [
  "Give Me 2 Minutes",
  "In Simple Words",
  "Here are N fresh",
  "concise model answers",
  "Let's dive in",
  "Hope this helps",
  "Complete Roadmap 20",
];

export const CHANNEL_TEMPLATES = [
  "notebook",
  "compare",
  "flow",
  "commands",
  "interview",
  "pathway",
  "atlas",
];
