import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ImageController, READ, WRITE, fileUri, imagePath, validateDimensions} from '../src/core.ts';
import type {Dependencies} from '../src/core.ts';

const ok = (result: unknown) => ({success: true, result, error: null});
function fixture() {
  const calls: string[] = [];
  const state = {file: '/storage/emulated/0/Note/测试.note', page: 2,
    paths: ['/storage/emulated/0/MyStyle/中文 #图.JPG'] as string[] | null,
    granted: 1, choice: 1, exists: true, width: 1200, height: 1600};
  const deps = {
    async hasPermission(p: string) {calls.push('check:' + p); return state.granted;},
    async requestPermission(p: string) {calls.push('request:' + p); return state.choice;},
    async currentFile() {return ok(state.file);},
    async currentPage() {return ok(state.page);},
    async selectFile(params: object) {
      calls.push('pick'); assert.equal((params as {selectType: number}).selectType, 1);
      return state.paths;
    },
    async exists(_p: string) {return state.exists;},
    async measure(_uri: string) {return {width: state.width, height: state.height};},
    async insert(_p: string): Promise<unknown> {calls.push('insert'); return ok(true);},
    async save(): Promise<unknown> {calls.push('save'); return ok(true);},
  };
  return {state, calls, deps, controller: new ImageController(deps)};
}

test('successful selection and insertion use exact path, current page, permissions and save', async () => {
  const f = fixture();
  const image = await f.controller.pick();
  assert.equal(image?.path, f.state.paths?.[0]);
  assert.equal(image?.target.page, 2);
  assert.match(image!.uri, /%23/);
  assert.deepEqual(await f.controller.insert(), {saved: true});
  assert.equal(f.controller.canInsert, false);
  assert.ok(f.calls.indexOf('check:' + WRITE) < f.calls.indexOf('insert'));
  assert.ok(f.calls.indexOf('insert') < f.calls.indexOf('save'));
  assert.equal(f.calls.filter(c => c === 'insert').length, 1);
  await assert.rejects(f.controller.insert(), /重复提交/);
});

test('cancelling picker does not mutate note and preserves an existing preview', async () => {
  const f = fixture();
  f.state.paths = null;
  assert.equal(await f.controller.pick(), null);
  assert.equal(f.controller.canInsert, false);
  f.state.paths = ['/storage/emulated/0/MyStyle/a.png'];
  const previous = await f.controller.pick();
  f.state.paths = [];
  assert.equal(await f.controller.pick(), null);
  assert.equal(f.controller.selection, previous);
  assert.ok(!f.calls.includes('insert'));
});

for (const choice of [-1, 0]) {
  test(`permission choice ${choice} stops before reading and inserting`, async () => {
    const f = fixture(); f.state.granted = 0; f.state.choice = choice;
    await assert.rejects(f.controller.pick(), /授权|权限/);
    assert.ok(!f.calls.includes('pick'));
    assert.ok(!f.calls.includes('insert'));
  });
}

for (const choice of [1, 2]) {
  test(`permission choice ${choice} is accepted and rechecked after picker and before mutation`, async () => {
    const f = fixture(); f.state.granted = 0; f.state.choice = choice;
    await f.controller.pick(); await f.controller.insert();
    assert.equal(f.calls.filter(c => c === 'request:' + READ).length, 3);
    assert.equal(f.calls.filter(c => c === 'request:' + WRITE).length, 1);
  });
}

test('revoked write permission prevents insertion but allows retry after grant', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.hasPermission = async name => name === WRITE ? 0 : 1;
  f.state.choice = 0;
  await assert.rejects(f.controller.insert(), /写入权限/);
  assert.equal(f.controller.canInsert, true);
  assert.ok(!f.calls.includes('insert'));
  f.state.choice = 2;
  assert.equal((await f.controller.insert()).saved, true);
});

test('reject unsupported extensions and non-file URIs', () => {
  for (const path of ['/a.webp', '/a.gif', '/a.svg', '/a.png.exe', 'content://file/a.jpg', 'https://a/b.jpg']) {
    assert.throws(() => imagePath(path));
  }
  assert.equal(imagePath('/中文 文件.JPEG'), '/中文 文件.JPEG');
  assert.equal(imagePath('file:///folder/a%20b.png'), '/folder/a b.png');
  assert.equal(fileUri('/a b/#100%.png'), 'file:///a%20b/%23100%25.png');
});

test('bad dimensions and oversized images cannot be inserted', async () => {
  for (const size of [[0, 2], [NaN, 10], [Infinity, 1], [9000, 100], [5000, 5000]]) {
    assert.throws(() => validateDimensions(...size as [number, number]));
  }
  const f = fixture(); f.state.width = 9000;
  await assert.rejects(f.controller.pick(), /尺寸过大/);
  assert.equal(f.controller.canInsert, false);
});

test('corrupt image decode blocks insertion', async () => {
  const f = fixture(); f.deps.measure = async () => {throw new Error('decode');};
  await assert.rejects(f.controller.pick(), /解码/);
  assert.equal(f.controller.canInsert, false);
});

test('missing image and image deleted after preview are rejected', async () => {
  const f = fixture(); f.state.exists = false;
  await assert.rejects(f.controller.pick(), /不存在/);
  f.state.exists = true; await f.controller.pick(); f.state.exists = false;
  await assert.rejects(f.controller.insert(), /已移动/);
  assert.ok(!f.calls.includes('insert'));
});

test('PDF context is rejected before the picker', async () => {
  const f = fixture(); f.state.file = '/Document/test.pdf';
  await assert.rejects(f.controller.pick(), /笔记工具栏/);
  assert.ok(!f.calls.includes('pick'));
});

for (const change of ['file', 'page']) {
  test(`changing ${change} after preview stops mutation`, async () => {
    const f = fixture(); await f.controller.pick();
    if (change === 'file') {f.state.file = '/Note/other.note';} else {f.state.page++;}
    await assert.rejects(f.controller.insert(), /页码已变化/);
    assert.ok(!f.calls.includes('insert'));
  });
}

test('invalid current page response blocks mutation', async () => {
  const f = fixture(); f.state.page = -1;
  await assert.rejects(f.controller.pick(), /当前页/);
});

test('known native failure preserves error code, does not save, and permits explicit retry', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.insert = async () => ({success: false, error: {code: 1217, message: 'locked'}});
  await assert.rejects(f.controller.insert(), /1217/);
  assert.equal(f.controller.canInsert, true);
  assert.ok(!f.calls.includes('save'));
});

test('success true with result false is not a successful insertion', async () => {
  const f = fixture(); await f.controller.pick(); f.deps.insert = async () => ok(false);
  await assert.rejects(f.controller.insert(), /图片未插入/);
  assert.ok(!f.calls.includes('save'));
});

for (const mode of ['reject', 'null', 'malformed']) {
  test(`ambiguous insert ${mode} blocks duplicate submission`, async () => {
    const f = fixture(); await f.controller.pick();
    f.deps.insert = async () => {
      f.calls.push('insert');
      if (mode === 'reject') {throw new Error('connection lost');}
      return mode === 'null' ? null : {success: true};
    };
    await assert.rejects(f.controller.insert(), /返回笔记检查/);
    await assert.rejects(f.controller.insert(), /重复提交/);
    assert.equal(f.calls.filter(c => c === 'insert').length, 1);
    assert.ok(!f.calls.includes('save'));
  });
}

for (const mode of ['false', 'reject', 'null']) {
  test(`save ${mode} reports inserted but unconfirmed save and prevents duplicate`, async () => {
    const f = fixture(); await f.controller.pick();
    f.deps.save = async () => {
      if (mode === 'reject') {throw new Error('save failed');}
      return mode === 'null' ? null : ok(false);
    };
    const result = await f.controller.insert();
    assert.equal(result.saved, false);
    assert.match(result.warning!, /图片已插入/);
    await assert.rejects(f.controller.insert(), /重复提交/);
    assert.equal(f.calls.filter(c => c === 'insert').length, 1);
  });
}

test('concurrent taps cannot insert twice or launch picker during mutation', async () => {
  const f = fixture(); await f.controller.pick();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => {release = resolve;});
  f.deps.insert = async () => {f.calls.push('insert'); await waiting; return ok(true);};
  const first = f.controller.insert();
  await assert.rejects(f.controller.insert(), /进行中/);
  await assert.rejects(f.controller.pick(), /进行中/);
  release(); await first;
  assert.equal(f.calls.filter(c => c === 'insert').length, 1);
});

test('selecting another image explicitly allows another insertion', async () => {
  const f = fixture(); await f.controller.pick(); await f.controller.insert();
  f.state.paths = ['/storage/emulated/0/MyStyle/next.jpeg'];
  await f.controller.pick(); await f.controller.insert();
  assert.equal(f.calls.filter(c => c === 'insert').length, 2);
});

test('editor exports after permission and inserts the generated PNG rather than the source', async () => {
  const f = fixture(); await f.controller.pick();
  let inserted = '';
  f.deps.insert = async path => {inserted = path; return ok(true);};
  await f.controller.insert(async selection => {
    assert.equal(selection.path, f.state.paths![0]);
    assert.ok(f.calls.includes('check:' + WRITE));
    return '/storage/emulated/0/MyStyle/LocalImage/adjusted.png';
  });
  assert.equal(inserted, '/storage/emulated/0/MyStyle/LocalImage/adjusted.png');
});
test('failed export never falls back to inserting the original and can be retried', async () => {
  const f = fixture(); await f.controller.pick();
  await assert.rejects(f.controller.insert(async () => {throw new Error('disk full');}), /disk full/);
  assert.equal(f.controller.canInsert, true); assert.ok(!f.calls.includes('insert'));
});
test('note context is checked after slow image processing before insertion', async () => {
  const f = fixture(); await f.controller.pick();
  await assert.rejects(f.controller.insert(async () => {
    f.state.page++; return '/storage/emulated/0/MyStyle/LocalImage/adjusted.png';
  }), /页码已变化/);
  assert.ok(!f.calls.includes('insert'));
});
test('denying write permission stops export before any file is created', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.hasPermission = async name => name === WRITE ? 0 : 1;
  f.state.choice = 0;
  let called = false;
  await assert.rejects(f.controller.insert(async () => {called = true; return '/adjusted.png';}));
  assert.equal(called, false);
});
test('selection hooks surround insertion/save, and failed selection never retries insertion', async () => {
  const f = fixture(); const deps = f.deps as Dependencies;
  deps.captureSelection = async () => {f.calls.push('capture'); return [1];};
  deps.selectInserted = async (_, snapshot) => {
    assert.deepEqual(snapshot, [1]); f.calls.push('select'); throw Error('unsupported');
  };
  await f.controller.pick(); assert.deepEqual(await f.controller.insert(), {saved: true});
  assert.deepEqual(f.calls.filter(c => ['capture', 'insert', 'save', 'select'].includes(c)), ['capture', 'insert', 'save', 'select']);
  await assert.rejects(f.controller.insert(), /重复提交/);
});
test('failed optional capture does not prevent insertion', async () => {
  const f = fixture(); (f.deps as Dependencies).captureSelection = async () => {throw Error('unsupported');};
  await f.controller.pick(); assert.deepEqual(await f.controller.insert(), {saved: true});
});
test('context is checked again after optional selection metadata reads', async () => {
  const f = fixture(); (f.deps as Dependencies).captureSelection = async () => {f.state.page++; return [];};
  await f.controller.pick(); await assert.rejects(f.controller.insert(), /页码已变化/);
  assert.ok(!f.calls.includes('insert'));
});
