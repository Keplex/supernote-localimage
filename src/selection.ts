import type {Context} from './core.ts';

type Rect = {left: number; top: number; right: number; bottom: number};
interface Element {numInPage: number; pageNum: number; type: number; picture?: {rect?: Rect}}
export interface SelectionAPI {
  currentFile(): Promise<unknown>; currentPage(): Promise<unknown>;
  elements(context: Context): Promise<unknown>; pageSize(context: Context): Promise<unknown>;
  selected(): Promise<unknown>; lasso(rect: Rect): Promise<unknown>; state(value: number): Promise<unknown>;
}
function result(value: unknown): unknown {
  const response = value as {success?: boolean; result?: unknown} | null;
  if (response?.success !== true) {throw new Error('Selection API unavailable');}
  return response.result;
}
function elements(value: unknown, context: Context): Element[] {
  const items = result(value) as Element[];
  if (!Array.isArray(items) || items.some(e => !e || !Number.isInteger(e.numInPage) || e.numInPage < 1
    || e.pageNum !== context.page || !Number.isInteger(e.type))
    || new Set(items.map(e => e.numInPage)).size !== items.length) {throw new Error('Unverifiable page elements');}
  return items;
}
async function samePage(api: SelectionAPI, context: Context): Promise<boolean> {
  return result(await api.currentFile()) === context.path && result(await api.currentPage()) === context.page;
}
export async function captureElements(api: SelectionAPI, context: Context): Promise<unknown> {
  try {
    if (!await samePage(api, context)) {return null;}
    return elements(await api.elements(context), context).map(e => e.numInPage);
  } catch {return null;}
}

/** Best effort only. Never alter note content or leave an unverified mixed selection. */
export async function selectInsertedImage(api: SelectionAPI, context: Context, snapshot: unknown): Promise<void> {
  if (!Array.isArray(snapshot) || !snapshot.every(n => Number.isInteger(n) && n > 0)) {return;}
  let ownsSelection = false;
  try {
    if (!await samePage(api, context)) {return;}
    const before = new Set<number>(snapshot);
    const after = elements(await api.elements(context), context);
    if (after.length !== before.size + 1 || ![...before].every(n => after.some(e => e.numInPage === n))) {return;}
    const added = after.filter(e => !before.has(e.numInPage));
    if (added.length !== 1 || added[0].type !== 200) {return;}
    const image = added[0];
    const onlyImage = (value: unknown) => {
      const list = elements(value, context);
      return list.length === 1 && list[0].type === 200 && list[0].numInPage === image.numInPage;
    };
    let alreadySelected = false;
    try {alreadySelected = onlyImage(await api.selected());} catch { /* Try a new bounded selection. */ }
    if (!alreadySelected) {
      const rect = image.picture?.rect;
      const size = result(await api.pageSize(context)) as {width: number; height: number} | null;
      if (!rect || !size || !Number.isFinite(size.width) || !Number.isFinite(size.height)
        || ![rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)
        || rect.left < 0 || rect.top < 0 || rect.right <= rect.left || rect.bottom <= rect.top
        || rect.right > size.width || rect.bottom > size.height) {return;}
      if (!await samePage(api, context)) {return;}
      ownsSelection = true;
      if (result(await api.lasso(rect)) !== true || !onlyImage(await api.selected())) {return;}
    }
    if (!await samePage(api, context)) {return;}
    if (result(await api.state(0)) === true) {ownsSelection = false;}
  } catch { /* Optional host support must never turn a saved insertion into a failure. */ }
  finally {
    if (ownsSelection) {
      try {if (await samePage(api, context)) {await api.state(2);}} catch { /* Host may have closed. */ }
    }
  }
}
