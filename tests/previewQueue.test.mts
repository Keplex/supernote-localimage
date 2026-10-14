import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewQueue, PREVIEW_DELAY} from '../src/previewQueue.ts';

const flush = async () => {await Promise.resolve(); await Promise.resolve(); await Promise.resolve();};
test('rapid changes merge into one render 0.5 seconds after the last tap', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const rendered: number[] = [], published: number[] = [];
  const queue = new PreviewQueue(async (n: number) => {rendered.push(n); return n;}, n => published.push(n), assert.fail, () => {});
  queue.request(1); context.mock.timers.tick(100);
  queue.request(2); context.mock.timers.tick(100);
  queue.request(3); context.mock.timers.tick(PREVIEW_DELAY - 1);
  assert.deepEqual(rendered, []);
  context.mock.timers.tick(1); await flush();
  assert.deepEqual(rendered, [3]); assert.deepEqual(published, [3]); queue.cancel();
});
test('a slow obsolete render cannot publish; only one native job runs at a time', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const rendered: number[] = [], published: number[] = [];
  let release!: (n: number) => void;
  const queue = new PreviewQueue((n: number) => {rendered.push(n); return new Promise<number>(r => {release = r;});},
    n => published.push(n), assert.fail, () => {});
  queue.request(1, true); queue.request(2); context.mock.timers.tick(PREVIEW_DELAY);
  queue.request(3); context.mock.timers.tick(PREVIEW_DELAY);
  assert.deepEqual(rendered, [1]);
  release(1); await flush(); assert.deepEqual(published, []); assert.deepEqual(rendered, [1, 3]);
  release(3); await flush(); assert.deepEqual(published, [3]); queue.cancel();
});
test('closing or changing the image cancels pending work and ignores in-flight results', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  let count = 0, release!: (n: number) => void;
  const published: number[] = [];
  const queue = new PreviewQueue((_n: number) => {count++; return new Promise<number>(r => {release = r;});},
    n => published.push(n), assert.fail, () => {});
  queue.request(1); queue.cancel(); context.mock.timers.tick(5000); assert.equal(count, 0);
  queue.request(2, true); queue.cancel(); release(2); await flush(); assert.deepEqual(published, []);
});
test('refresh now replaces the pending debounce and does not cause a second delayed refresh', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const rendered: number[] = [];
  const queue = new PreviewQueue(async (n: number) => {rendered.push(n); return n;}, () => {}, assert.fail, () => {});
  queue.request(1); queue.request(2, true); await flush(); context.mock.timers.tick(5000); await flush();
  assert.deepEqual(rendered, [2]); queue.cancel();
});
test('render failures are reported once and require another change or explicit retry', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const errors: unknown[] = []; let count = 0;
  const queue = new PreviewQueue(async (_n: number) => {count++; throw new Error('full');}, assert.fail, e => errors.push(e), () => {});
  queue.request(1, true); await flush(); context.mock.timers.tick(10000); await flush();
  assert.equal(count, 1); assert.equal(errors.length, 1);
  queue.request(1, true); await flush(); assert.equal(count, 2); queue.cancel();
});
test('obsolete errors cannot replace feedback for a newly selected image', async () => {
  let reject!: (e: Error) => void;
  const errors: unknown[] = [];
  const queue = new PreviewQueue((_n: number) => new Promise<number>((_, r) => {reject = r;}), assert.fail, e => errors.push(e), () => {});
  queue.request(1, true); queue.cancel(); reject(new Error('old')); await flush();
  assert.deepEqual(errors, []);
});
