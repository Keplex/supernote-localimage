import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FULL_CROP, NEUTRAL, moveCorner, imageFrame, pointInImage, stepTone, recipeKey, resolvedRecipe, previewHeight} from '../src/editor.ts';
test('portrait preview maps touches without counting the letterbox margins', () => {
  const frame = imageFrame(500, 400, 600, 1200);
  assert.deepEqual(frame, {x: 150, y: 0, width: 200, height: 400});
  assert.equal(pointInImage(100, 200, frame), null);
  assert.deepEqual(pointInImage(250, 200, frame), {x: 0.5, y: 0.5});
});
test('landscape preview centers vertically and rejects touches in top margin', () => {
  const frame = imageFrame(500, 400, 1000, 200);
  assert.deepEqual(frame, {x: 0, y: 150, width: 500, height: 100});
  assert.equal(pointInImage(250, 100, frame), null);
  assert.deepEqual(pointInImage(500, 250, frame), {x: 1, y: 1});
});
test('zero-size layout is safe before onLayout', () => {
  assert.equal(pointInImage(0, 0, imageFrame(0, 0, 100, 100)), null);
});
test('corners cannot cross, leave image bounds or produce an empty crop', () => {
  const first = moveCorner({...FULL_CROP}, 'topLeft', 1.1, 0.9);
  assert.deepEqual(first, {left: 0.98, top: 0.9, right: 1, bottom: 1});
  const second = moveCorner(first, 'bottomRight', -1, -1);
  assert.deepEqual(second, {left: 0.98, top: 0.9, right: 1, bottom: 0.92});
  assert.deepEqual(moveCorner(second, 'topLeft', NaN, 0), second);
});
test('preview fills remaining measured space without forcing ordinary screens to scroll', () => {
  for (const viewport of [460, 600, 900, 1100]) {
    for (const [top, bottom] of [[70, 0], [64, 174], [82, 202]]) {
      assert.equal(previewHeight(viewport, top, bottom) + top + bottom + 16, viewport);
    }
  }
  assert.equal(previewHeight(200, 80, 174), 120); // Tiny/landscape windows may scroll.
});
test('tone steps respect individual ranges and do not mutate an existing recipe', () => {
  const base = {...NEUTRAL};
  assert.equal(stepTone(base, 'shadows', -1).shadows, 0);
  assert.equal(stepTone({...base, brightness: 4}, 'brightness', 1).brightness, 4);
  assert.equal(stepTone(base, 'contrast', -1).contrast, -1);
  assert.deepEqual(base, NEUTRAL);
});
test('crop or tone changes invalidate the preview key', () => {
  const key = recipeKey(FULL_CROP, NEUTRAL);
  assert.notEqual(key, recipeKey({...FULL_CROP, left: 0.1}, NEUTRAL));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, brightness: 1}));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, autoLevels: true}));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, opaqueWhite: true}));
});
test('export freezes the exact black/white points that were used by preview', () => {
  const result = {path: '/preview.png', width: 100, height: 100, black: 35, white: 215,
    histogram: [], darkPercent: 0, lightPercent: 0};
  const recipe = resolvedRecipe(FULL_CROP, {...NEUTRAL, autoLevels: true, brightness: 2, opaqueWhite: true}, result);
  assert.equal(recipe.black, 35); assert.equal(recipe.white, 215);
  assert.equal(recipe.autoLevels, false); assert.equal(recipe.brightness, 2);
  assert.equal(recipe.opaqueWhite, true);
});
