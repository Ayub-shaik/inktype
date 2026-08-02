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

export interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
}

export interface ContentDoc {
  title?: string;
  subtitle?: string;
  bullets: string[];
  nodes: string[];
  freeform: string;
  flow?: "vertical" | "horizontal" | null;
  kind?: "tree" | null;
  tree?: TreeNode[] | null;
}

export interface FilledSlot {
  slot: Slot;
  text: string;
}

export declare const TEMPLATES: Template[];

export declare function getTemplate(id: string): Template;
export declare function isConnectorLine(line: string): boolean;
export declare function extractVerticalFlow(raw: string): ContentDoc | null;
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
export declare function looksLikeTreeText(raw: string): boolean;
export declare function parseTree(raw: string): TreeNode[];
export declare function flattenTree(
  roots: TreeNode[],
): { id: string; label: string; parentId: string | null; depth: number }[];
export declare function countTreeNodes(roots: TreeNode[]): number;
