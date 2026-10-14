import {Image, NativeModules, ToastAndroid} from 'react-native';
import {FileUtils, PluginCommAPI, PluginManager, PluginNoteAPI, RattaFileSelector} from 'sn-plugin-lib';
import type {Dependencies} from './core';
import {ensurePermission, READ} from './core';
import type {Recipe, RenderResult} from './editor';
import {setLanguage} from './i18n';
import type {Language} from './i18n';

interface Processor {
  inspect(path: string): Promise<{width: number; height: number}>;
  render(path: string, pluginRoot: string, recipe: Recipe, mode: string): Promise<RenderResult>;
  getLanguage(): Promise<string>;
  setLanguage(language: string): Promise<boolean>;
}
function processor(): Processor {
  const module = NativeModules.LocalImageProcessor as Processor | undefined;
  if (!module?.render) {throw new Error('图片编辑模块未加载。请安装完整升级包并重启设备。');}
  return module;
}
export async function loadLanguage(): Promise<Language> {
  const value = await processor().getLanguage();
  const language = value === 'en' ? 'en' : 'zh';
  setLanguage(language); return language;
}
export async function saveLanguage(language: Language): Promise<void> {
  if (!(await processor().setLanguage(language))) {throw new Error('语言设置未保存，请重试切换。');}
}
export async function renderImage(path: string, recipe: Recipe, mode: 'base' | 'neutral' | 'preview' | 'export'): Promise<RenderResult> {
  await ensurePermission(dependencies, READ);
  const root = await PluginManager.getPluginDirPath();
  if (!root) {throw new Error('无法读取插件私有目录。');}
  return processor().render(path, root, recipe, mode);
}

export const BUTTON_ID = 101;
let startup: Promise<void> | undefined;

export function initializePlugin(): Promise<void> {
  if (!startup) {
    startup = (async () => {
      await PluginManager.init();
      const registered = await PluginManager.registerButton(1, ['NOTE'], {
        id: BUTTON_ID,
        name: '本地插图 / Local Image',
        icon: Image.resolveAssetSource(require('../assets/icon.png')).uri,
        showType: 1,
      });
      if (!registered) {throw new Error('工具栏按钮注册失败，请重新启用插件。');}
    })();
  }
  return startup;
}

export async function showInsertionFailure(message: string): Promise<void> {
  try {if (await PluginManager.showPluginView()) {return;}} catch { /* Fall back to a system message. */ }
  ToastAndroid.show(message, ToastAndroid.LONG);
}

export const dependencies: Dependencies = {
  hasPermission: name => PluginManager.hasPermission(name),
  requestPermission: (name, description) => PluginManager.requestPermission(name, description),
  currentFile: () => PluginCommAPI.getCurrentFilePath(),
  currentPage: () => PluginCommAPI.getCurrentPageNum(),
  selectFile: params => RattaFileSelector.selectFile(params),
  exists: path => FileUtils.exists(path),
  measure: uri => processor().inspect(decodeURIComponent(uri.slice(7))),
  insert: path => PluginNoteAPI.insertImage(path),
  returnToNote: () => PluginManager.closePluginView(),
};
