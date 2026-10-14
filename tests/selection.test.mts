import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureElements, selectInsertedImage} from '../src/selection.ts';
import type {SelectionAPI} from '../src/selection.ts';
const ok = (result: unknown) => ({success: true, result});
const context = {path: '/Note/Test.note', page: 2};
const ink = {numInPage: 1, pageNum: 2, type: 0};
const picture = {numInPage: 2, pageNum: 2, type: 200, picture: {rect: {left: 100, top: 200, right: 500, bottom: 700}}};
function fixture() {
  const state = {page: 2, list: [ink] as object[], selected: [] as object[], mixed: false, fail: false};
  const calls: unknown[] = [];
  const api: SelectionAPI = {
    async currentFile() {return ok(context.path);}, async currentPage() {return ok(state.page);},
    async elements() {return ok(state.list);}, async pageSize() {return ok({width: 1404, height: 1872});},
    async selected() {if (state.fail) {throw Error('unsupported');} return ok(state.selected);},
    async lasso(rect) {calls.push(rect); state.selected = state.mixed ? [ink, picture] : [picture]; return ok(true);},
    async state(value) {calls.push(value); return ok(true);},
  };
  return {state, calls, api};
}
test('selects only the single newly inserted image with the documented pixel rectangle', async () => {
  const f = fixture(); const before = await captureElements(f.api, context);
  f.state.list.push(picture); await selectInsertedImage(f.api, context, before);
  assert.deepEqual(f.calls, [picture.picture.rect, 0]);
});
test('existing verified selection is shown without selecting surrounding ink again', async () => {
  const f = fixture(); f.state.list.push(picture); f.state.selected = [picture];
  await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [0]);
});
test('mixed lasso is removed rather than leaving old ink selected', async () => {
  const f = fixture(); f.state.list.push(picture); f.state.mixed = true;
  await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [picture.picture.rect, 2]);
});
test('unreadable selection after lasso is removed and never reported as insertion failure', async () => {
  const f = fixture(); f.state.list.push(picture); f.state.fail = true;
  await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [picture.picture.rect, 2]);
});
test('changed page, missing metadata, multiple additions and renumbering skip selection', async () => {
  for (const scenario of ['page', 'missing', 'many', 'renumbered', 'wrongType', 'badRect']) {
    const f = fixture(); f.state.list.push(picture);
    if (scenario === 'page') {f.state.page = 3;}
    if (scenario === 'missing') {f.api.elements = async () => ({success: false});}
    if (scenario === 'many') {f.state.list.push({...picture, numInPage: 3});}
    if (scenario === 'renumbered') {f.state.list[0] = {...ink, numInPage: 7};}
    if (scenario === 'wrongType') {f.state.list[1] = {...picture, type: 0};}
    if (scenario === 'badRect') {f.state.list[1] = {...picture, picture: {rect: {...picture.picture.rect, left: -10}}};}
    await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [], scenario);
  }
});
test('failure showing the newly made selection removes it', async () => {
  const f = fixture(); f.state.list.push(picture);
  f.api.state = async value => {f.calls.push(value); return ok(value !== 0);};
  await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [picture.picture.rect, 0, 2]);
});
test('capture rejects unknown or duplicate identities without breaking insertion', async () => {
  const f = fixture(); f.state.list = [ink, ink];
  assert.equal(await captureElements(f.api, context), null);
  f.api.elements = async () => {throw Error('unsupported');};
  assert.equal(await captureElements(f.api, context), null);
  await selectInsertedImage(f.api, context, null); assert.deepEqual(f.calls, []);
});
test('page changes during selection do not clear a selection on the new page', async () => {
  const f = fixture(); f.state.list.push(picture);
  f.api.lasso = async rect => {f.calls.push(rect); f.state.page = 3; return ok(false);};
  await selectInsertedImage(f.api, context, [1]); assert.deepEqual(f.calls, [picture.picture.rect]);
});
