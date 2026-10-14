export interface Crop {left: number; top: number; right: number; bottom: number}
export interface Tone {brightness: number; contrast: number; shadows: number; highlights: number; black: number; white: number; autoLevels: boolean; opaqueWhite: boolean}
export type Recipe = Crop & Tone;
export interface RenderResult {
  path: string; width: number; height: number; black: number; white: number;
  histogram: number[]; darkPercent: number; lightPercent: number;
}
export const FULL_CROP: Crop = {left: 0, top: 0, right: 1, bottom: 1};
export const NEUTRAL: Tone = {brightness: 0, contrast: 0, shadows: 0, highlights: 0, black: 0, white: 255, autoLevels: false, opaqueWhite: false};
export type Corner = 'topLeft' | 'bottomRight';
export type ToneControl = 'brightness' | 'contrast' | 'shadows' | 'highlights';
export const PRESETS: {name: string; tone: Tone}[] = [
  {name: '自然', tone: {...NEUTRAL}},
  {name: '均衡', tone: {...NEUTRAL, autoLevels: true}},
  {name: '提亮', tone: {...NEUTRAL, brightness: 2, shadows: 2}},
  {name: '压暗', tone: {...NEUTRAL, brightness: -2, highlights: 2}},
  {name: '线稿', tone: {...NEUTRAL, contrast: 3, autoLevels: true}},
];
function clamp(n: number, min: number, max: number): number {return Math.max(min, Math.min(max, n));}
export function moveCorner(crop: Crop, corner: Corner, x: number, y: number): Crop {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {return {...crop};}
  const result = corner === 'topLeft'
    ? {...crop, left: clamp(x, 0, crop.right - 0.02), top: clamp(y, 0, crop.bottom - 0.02)}
    : {...crop, right: clamp(x, crop.left + 0.02, 1), bottom: clamp(y, crop.top + 0.02, 1)};
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, Math.round(value * 10000) / 10000])) as unknown as Crop;
}
// Measure controls instead of assuming a particular device resolution or text size.
export function previewHeight(viewport: number, top: number, bottom: number): number {
  return Math.max(120, Math.floor(viewport - top - bottom - 16));
}
export function imageFrame(boxWidth: number, boxHeight: number, width: number, height: number) {
  if (boxWidth <= 0 || boxHeight <= 0 || width <= 0 || height <= 0) {return {x: 0, y: 0, width: 0, height: 0};}
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return {x: (boxWidth - width * scale) / 2, y: (boxHeight - height * scale) / 2, width: width * scale, height: height * scale};
}
export function pointInImage(x: number, y: number, frame: ReturnType<typeof imageFrame>) {
  if (frame.width <= 0 || frame.height <= 0 || x < frame.x || y < frame.y
    || x > frame.x + frame.width || y > frame.y + frame.height) {return null;}
  return {x: (x - frame.x) / frame.width, y: (y - frame.y) / frame.height};
}
export function stepTone(tone: Tone, field: ToneControl, direction: number): Tone {
  const minimum = field === 'brightness' || field === 'contrast' ? -4 : 0;
  return {...tone, [field]: clamp(tone[field] + direction, minimum, 4)};
}
export function recipeKey(crop: Crop, tone: Tone): string {
  return JSON.stringify([crop.left, crop.top, crop.right, crop.bottom, tone.brightness, tone.contrast,
    tone.shadows, tone.highlights, tone.black, tone.white, tone.autoLevels, tone.opaqueWhite]);
}
export function resolvedRecipe(crop: Crop, tone: Tone, rendered: RenderResult): Recipe {
  return {...crop, ...tone, black: rendered.black, white: rendered.white, autoLevels: false};
}
