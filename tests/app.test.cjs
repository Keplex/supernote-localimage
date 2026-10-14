// Render the actual App and controls with a mocked native bridge, not a copy of the UI logic.
const {test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const {create, act} = require('react-test-renderer');
const {transformFileSync} = require('@babel/core');
global.IS_REACT_ACT_ENVIRONMENT = true;
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = (module, file) => module._compile(transformFileSync(file, {
    presets: ['module:@react-native/babel-preset'], babelrc: false, configFile: false,
  }).code, file);
}
const originalPath = '/storage/emulated/0/MyStyle/original.jpg';
let renders, insertions, saves, closes, reopens, toasts, storedLanguage, selectionCancelled, renderFailure;
let renderHook, insertHook, closeFailure, reopenFailure;
const image = path => ({path, width: 800, height: 600, black: 0, white: 255,
  histogram: new Array(16).fill(20), darkPercent: 0, lightPercent: 0});
const processor = {
  async inspect() {return {width: 4000, height: 3000};},
  async render(path, _root, recipe, mode) {
    renders.push({path, recipe, mode});
    if (renderHook) {await renderHook(mode);}
    if (renderFailure) {throw new Error('PNG 保存失败');}
    return image(`/private/${mode}-${renders.length}.png`);
  },
  async getLanguage() {return storedLanguage;},
  async setLanguage(value) {storedLanguage = value; return true;},
};
const sdk = {
  PluginManager: {
    async init() {}, async registerButton() {return true;},
    registerButtonListener() {return {remove() {}};},
    async hasPermission() {return 1;}, async requestPermission() {return 1;},
    async getPluginDirPath() {return '/private/plugins/limg26nomad00001';},
    async closePluginView() {closes++; return !closeFailure;},
    async showPluginView() {reopens++; return !reopenFailure;},
  },
  PluginCommAPI: {async getCurrentFilePath() {return {success: true, result: '/Note/Test.note'};},
    async getCurrentPageNum() {return {success: true, result: 0};}},
  FileUtils: {async exists() {return true;}},
  RattaFileSelector: {async selectFile() {return selectionCancelled ? null : [originalPath];}},
  PluginNoteAPI: {async insertImage(path) {insertions.push(path); return insertHook ? insertHook() : {success: true, result: true};},
    async saveCurrentNote() {saves++; return {success: true, result: true};}},
};
const NativeImage = props => React.createElement('Image', props);
NativeImage.resolveAssetSource = () => ({uri: 'icon.png'});
const native = {Image: NativeImage, NativeModules: {LocalImageProcessor: processor},
  ToastAndroid: {LONG: 1, show: message => {toasts.push(message);}},
  StyleSheet: {create: value => value, absoluteFill: {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}},
  BackHandler: {addEventListener: () => ({remove() {}})}};
for (const name of ['SafeAreaView', 'ScrollView', 'StatusBar', 'Text', 'View', 'Pressable']) {native[name] = name;}
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id === 'react-native') {return native;}
  if (id === 'sn-plugin-lib') {return sdk;}
  if (id.endsWith('.png')) {return 1;}
  return originalLoad.call(this, id, ...rest);
};
const App = require('../App.tsx').default;
const {setLanguage} = require('../src/i18n.ts');
const flush = async () => {for (let i = 0; i < 30; i++) {await Promise.resolve();}};
beforeEach(() => {
  renders = []; insertions = []; saves = 0; closes = 0; reopens = 0; toasts = []; storedLanguage = 'zh';
  selectionCancelled = false; renderFailure = false; renderHook = null; insertHook = null;
  closeFailure = false; reopenFailure = false; setLanguage('zh');
});
async function mount() {
  let view;
  await act(async () => {view = create(React.createElement(App), {createNodeMock: () => ({scrollTo() {}})}); await flush();});
  return view;
}
const button = (view, label) => view.root.findAllByType('Pressable').find(b => b.props.accessibilityLabel === label);
async function press(view, label) {
  const found = button(view, label); assert.ok(found, `Missing button: ${label}`); assert.ok(!found.props.disabled, `Disabled: ${label}`);
  await act(async () => {found.props.onPress(); await flush();});
}
async function unmount(view) {await act(async () => {view.unmount(); await flush();});}

test('Insert directly bypasses every preview/export and inserts original exactly once', async () => {
  const view = await mount();
  await act(async () => {const pick = button(view, '⚡ 直接插入'); pick.props.onPress(); pick.props.onPress(); await flush();});
  assert.deepEqual(renders, []); assert.deepEqual(insertions, [originalPath]);
  assert.equal(saves, 0); assert.equal(closes, 1); await unmount(view);
});
test('editing screen also inserts the original without export when asked', async () => {
  const view = await mount(); await press(view, '选择并编辑');
  assert.deepEqual(renders.map(r => r.mode), ['base']);
  for (const label of ['1%', '5%', '← 左', '↑ 上', '↓ 下', '→ 右']) {assert.equal(button(view, label), undefined);}
  await press(view, '插入原图');
  assert.deepEqual(renders.map(r => r.mode), ['base']); assert.deepEqual(insertions, [originalPath]); await unmount(view);
});
test('actual tone controls auto-refresh, block dirty inserts and export the latest recipe', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const view = await mount(); await press(view, '选择并编辑'); await press(view, '下一步：灰阶');
  await act(async () => {context.mock.timers.tick(500); await flush();});
  assert.ok(!button(view, '插入编辑后的图片').props.disabled);
  await press(view, '亮度 +'); await press(view, '亮度 +');
  assert.ok(button(view, '等待预览').props.disabled);
  await act(async () => {context.mock.timers.tick(499); await flush();});
  assert.equal(renders.length, 1);
  await act(async () => {context.mock.timers.tick(1); await flush();});
  assert.equal(renders.length, 2); assert.equal(renders[1].recipe.brightness, 2);
  await press(view, '对比原灰阶'); assert.ok(button(view, '插入编辑后的图片').props.disabled);
  await press(view, '看调整效果'); await press(view, '插入编辑后的图片');
  assert.equal(renders.at(-1).mode, 'export'); assert.equal(renders.at(-1).recipe.brightness, 2);
  assert.match(insertions[0], /export-/); await unmount(view);
});
test('English switch is persisted, translates controls, and survives reopening', async () => {
  let view = await mount(); await press(view, '中文 / English');
  assert.equal(storedLanguage, 'en'); assert.ok(button(view, 'Choose & edit'));
  await press(view, 'Choose & edit'); await press(view, 'Next: tone');
  for (const label of ['↺ Reset tone', 'Compare original', 'Lift shadows +', 'Lower highlights +']) {assert.ok(button(view, label));}
  await unmount(view); view = await mount(); assert.ok(button(view, '⚡ Insert directly')); await unmount(view);
});
test('failed automatic refresh does not loop; resetting tone automatically retries', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const view = await mount(); await press(view, '选择并编辑'); await press(view, '下一步：灰阶');
  await press(view, '亮度 +'); renderFailure = true;
  await act(async () => {context.mock.timers.tick(500); await flush();});
  assert.equal(button(view, '立即更新'), undefined); assert.ok(button(view, '等待预览').props.disabled);
  const count = renders.length;
  await act(async () => {context.mock.timers.tick(10000); await flush();}); assert.equal(renders.length, count);
  renderFailure = false; await press(view, '↺ 还原灰阶');
  await act(async () => {context.mock.timers.tick(500); await flush();}); assert.ok(!button(view, '插入编辑后的图片').props.disabled);
  await unmount(view);
});
test('leaving tone cancels a delayed refresh and a cancelled picker never inserts', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const view = await mount(); await press(view, '选择并编辑'); await press(view, '下一步：灰阶');
  await press(view, '亮度 +'); await press(view, '1 裁剪');
  await act(async () => {context.mock.timers.tick(5000); await flush();});
  assert.deepEqual(renders.map(r => r.mode), ['base']);
  selectionCancelled = true; await press(view, '换一张'); assert.deepEqual(insertions, []); await unmount(view);
});

// Optional desktop layout check using actual rendered component styles.
test('About is bilingual, displays MIT license, and returns to the current editing session', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const view = await mount();
  assert.ok(button(view, '返回笔记')); assert.ok(button(view, '⚡ 直接插入'));
  assert.match(JSON.stringify(view.toJSON()), /Test.note/);
  await press(view, '选择并编辑'); assert.equal(button(view, '⚡ 直接插入'), undefined);
  assert.ok(button(view, '↺ 还原全图'));
  await press(view, '下一步：灰阶'); await press(view, '亮度 +');
  await press(view, '关于');
  assert.match(JSON.stringify(view.toJSON()), /Keplex/);
  await press(view, '查看 MIT 许可证全文'); assert.match(JSON.stringify(view.toJSON()), /Permission is hereby granted/);
  await act(async () => {context.mock.timers.tick(500); await flush();});
  assert.equal(renders.length, 1);
  await press(view, '关于');
  await act(async () => {context.mock.timers.tick(500); await flush();});
  assert.equal(renders.at(-1).recipe.brightness, 1);
  assert.equal(button(view, '立即更新'), undefined);
  await press(view, '中文 / English'); await press(view, 'About');
  assert.match(JSON.stringify(view.toJSON()), /Developer: Keplex/);
  await press(view, 'About'); assert.ok(button(view, 'Insert edited image'));
  await unmount(view);
});

test('the note-name return button closes the plugin from About', async () => {
  const view = await mount(); await press(view, '关于');
  assert.match(JSON.stringify(view.toJSON()), /Test.note/);
  await press(view, '返回笔记'); assert.equal(closes, 1); await unmount(view);
});

test('late insert failure reopens the plugin and keeps duplicate insertion blocked', async () => {
  const view = await mount();
  let reject;
  insertHook = () => new Promise((_, fail) => {reject = fail;});
  await press(view, '⚡ 直接插入');
  assert.equal(closes, 1); assert.equal(reopens, 0);
  await act(async () => {reject(Error('bridge lost')); await flush();});
  assert.equal(reopens, 1); assert.equal(saves, 0);
  assert.match(JSON.stringify(view.toJSON()), /返回笔记检查/);
  assert.ok(button(view, '插入原图').props.disabled);
  assert.equal(insertions.length, 1); await unmount(view);
});

test('a failed error-overlay reopen falls back to a native toast', async () => {
  const view = await mount(); reopenFailure = true;
  insertHook = async () => ({success: false, error: {code: 1217}});
  await press(view, '⚡ 直接插入');
  assert.equal(reopens, 1); assert.equal(toasts.length, 1); assert.match(toasts[0], /1217/);
  assert.equal(insertions.length, 1); await unmount(view);
});

test('failed note handoff offers manual return without repeating a successful insertion', async () => {
  const view = await mount(); closeFailure = true;
  await press(view, '⚡ 直接插入');
  assert.match(JSON.stringify(view.toJSON()), /图片已插入，但暂时无法返回笔记/);
  assert.equal(insertions.length, 1); assert.equal(saves, 0); assert.equal(closes, 1);
  closeFailure = false; await press(view, '返回笔记');
  assert.equal(closes, 2); assert.equal(insertions.length, 1); await unmount(view);
});
test('white masking starts off, survives tone presets/reset and reaches export', async context => {
  context.mock.timers.enable({apis: ['setTimeout']});
  const view = await mount(); await press(view, '选择并编辑'); await press(view, '下一步：灰阶');
  assert.equal(button(view, '白底遮线（实验）').props.accessibilityState.selected, false);
  await press(view, '白底遮线（实验）'); await press(view, '均衡'); await press(view, '↺ 还原灰阶');
  assert.equal(button(view, '白底遮线（实验）').props.accessibilityState.selected, true);
  await act(async () => {context.mock.timers.tick(500); await flush();});
  assert.equal(renders.at(-1).recipe.opaqueWhite, true);
  await press(view, '插入编辑后的图片'); assert.equal(renders.at(-1).mode, 'export');
  assert.equal(renders.at(-1).recipe.opaqueWhite, true); await unmount(view);
});

// It approximates native layout and cannot verify e-ink refresh or Android font metrics.
if (process.env.LOCALIMAGE_LAYOUT_QA) {
  test('desktop layout snapshots fit crop/tone in Chinese and English', async () => {
    const {checkLayouts} = require('../scripts/layout-qa.cjs');
    await checkLayouts({mount, press, unmount, act, flush, setStoredLanguage: value => {storedLanguage = value;}});
  });
}
