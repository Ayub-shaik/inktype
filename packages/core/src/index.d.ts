export type SlotRole =
  | "title"
  | "subtitle"
  | "body"
  | "bullet"
  | "node"
  | "caption";

export type SlotStyle = "title" | "body" | "mono" | "label";
export type Aspect = "story" | "square" | "wide";
export type Background = "paper" | "dark" | "grid";

export interface Slot {
  id: string;
  role: SlotRole;
  x: number;
  y: number;
  w: number;
  h: number;
  maxChars?: number;
  style?: SlotStyle;
}

export interface Template {
  id: string;
  name: string;
  blurb: string;
  aspect: Aspect;
  background: Background;
  ingest: string;
  slots: Slot[];
}

export interface ContentDoc {
  title?: string;
  subtitle?: string;
  bullets: string[];
  nodes: string[];
  freeform: string;
}

export interface FilledSlot {
  slot: Slot;
  text: string;
}

export declare const TEMPLATES: Template[];

export declare function getTemplate(id: string): Template;
export declare function parseContent(raw: string): ContentDoc;
export declare function fillTemplate(
  template: Template,
  doc: ContentDoc,
): FilledSlot[];
export declare function liveFill(
  templateId: string,
  rawText: string,
): { template: Template; doc: ContentDoc; filled: FilledSlot[] };
export declare function aspectPadding(aspect: Aspect): string;
