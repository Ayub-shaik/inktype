export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutOverrides = Record<string, Partial<Rect>>;

export function mergeRect(base: Rect, override?: Partial<Rect>): Rect {
  return {
    x: override?.x ?? base.x,
    y: override?.y ?? base.y,
    w: override?.w ?? base.w,
    h: override?.h ?? base.h,
  };
}
