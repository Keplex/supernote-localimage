import React, {useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from './EditorControls';
import {AppHeader} from './AppHeader';
import type {Language} from './i18n';
import {t} from './i18n';
import {MIT_LICENSE} from './license';

export const ABOUT = {
  zh: [
    ['本地插图 / Local Image 0.5.2', '开发者：Keplex\n借助 OpenAI GPT 辅助开发、研究与测试。\n独立社区项目，非 Supernote 官方插件。'],
    ['功能与使用', '全程离线，支持 PNG / JPG / JPEG，保留原图。\n“直接插入”：选好图片后直接插入原文件。\n“选择并编辑”：先用触控笔点击或拖动裁剪角，再调整灰阶。预设与还原按钮位于预览上方，◐ 可对比原灰阶。停止操作 0.5 秒后自动更新预览；完成后点“插入编辑后的图片”。\n“插入原图”忽略全部编辑，包括白底遮线。'],
    ['插入后的选中状态', '发起插入后立即返回笔记，保留系统原生的图片选区，供调整位置和大小；不再额外保存或重新创建套索。返回后请按系统方式确认位置并继续书写。选区能否保留仍取决于设备系统，请在真机验证；未显示选框时可用系统套索。'],
    ['白底遮线（实验）', '灰阶页的开关默认关闭。开启后，将编辑输出中的纯白转换为 Supernote 的特殊白色，使白色区域遮住模板线。灰色区域仍可能透线，不能让整张图片置顶，也不保证盖住手写内容。\n预览显示图片本身，不模拟笔记模板；请插入后检查效果，缩放及不同系统版本可能改变结果。'],
    ['版本日志', '0.5.2 · 2026-10-14\n返回按钮恢复 0.5.0 的箭头尺寸与位置；移除语言切换的按压灰底、延时反馈和保存设置时的透明度变化，减少额外刷新。\n\n0.5.1 · 2026-10-14\n编辑区恢复白底；中文/En 语言切换与点按反馈；调整返回箭头比例与位置；logo 改为圆圈加号。\n\n0.5.0 · 2026-10-14\n尝试保留系统插入选区；简化粗线条 logo；圆角按钮、笔记名返回、居中标题、语言与关于图标；加深编辑区底色。\n\n0.4.2 · 2026-10-14\n还原和对比图形改用独立图标，修复图标偏下及与文字对齐问题。\n\n0.4.1 · 2026-10-14\n统一主界面和关于页顶栏；闪电快捷直接插入；灰阶预设与还原横排；圆形浮动对比按钮。\n\n0.4.0 · 2026-10-14\n新 logo、左侧返回、统一中英文字、关于页与 MIT 许可证；0.5 秒自动预览；稳定的灰阶布局；尝试自动选中新图；实验性白底遮线。\n\n0.3.0 · 2026-10-13\n紧凑自适应界面、中英文切换、自动预览、原图快捷插入。\n\n0.2.0 · 2026-10-13\n触控裁剪、灰阶预设及亮度/对比度/暗部/亮部调整。\n\n0.1.0 · 2026-10-12\n本地图片插入笔记。'],
    ['许可与兼容性', '项目代码与原创 logo 采用 MIT 许可证。第三方组件保留各自许可证，详见安装包及源码中的 THIRD-PARTY-NOTICES.txt。\n需要兼容官方插件接口的 Supernote 系统；不同设备的支持情况取决于系统版本。只使用文件读写权限，不请求网络权限。'],
  ],
  en: [
    ['Local Image 0.5.2', 'Developer: Keplex\nBuilt with assistance from OpenAI GPT for development, research and testing.\nIndependent community project; not an official Supernote plugin.'],
    ['Features & usage', 'Offline PNG / JPG / JPEG insertion; originals are kept.\n“Insert directly” inserts the selected original immediately.\n“Choose & edit” opens cropping: tap or drag the corners with a stylus, then adjust tone. Presets and Reset tone are above the preview; tap ◐ to compare original tone. Preview updates 0.5 s after the last change. Finish with “Insert edited image”.\n“Insert original” ignores all edits, including white masking.'],
    ['Selection after insertion', 'The plugin returns to the note as soon as insertion starts, leaving the native image selection available for positioning and resizing. It no longer forces an extra save or rebuilds the lasso. Confirm placement using the normal note controls, then continue writing. Selection retention depends on the host system and needs device verification; use the system lasso if no selection appears.'],
    ['White masks lines (experimental)', 'Off by default in the tone screen. Converts pure white in the edited output to Supernote’s special white, allowing white areas to mask template lines. Lines may still show through grays. This does not bring the whole image to the front or guarantee coverage of handwriting.\nThe preview shows the image without a simulated note template. Check after insertion; resizing and system versions may affect the result.'],
    ['Changelog', '0.5.2 · 2026-10-14\nRestore the 0.5.0 note-return arrow and button; remove language-toggle pressed/timed highlights and save-time opacity changes to reduce extra refreshes.\n\n0.5.1 · 2026-10-14\nWhite editor background, Chinese/En language toggle with tap feedback, refined return-arrow proportions and a circled-plus logo.\n\n0.5.0 · 2026-10-14\nAttempt to retain native selection after insertion; simpler bold logo, rounded buttons, note-name return, centered title, language/About icons and darker preview backgrounds.\n\n0.4.2 · 2026-10-14\nUse centered image assets for Reset and Compare icons, removing font-baseline offsets.\n\n0.4.1 · 2026-10-14\nShared stable header, lightning shortcut for direct insertion, presets beside Reset tone, and a round floating comparison button.\n\n0.4.0 · 2026-10-14\nNew logo, left-side Back, consistent labels, About and MIT license; 0.5 s auto preview; stable tone layout; attempted selection of new images; experimental white masking.\n\n0.3.0 · 2026-10-13\nCompact adaptive layout, Chinese/English UI, auto preview and quick original insertion.\n\n0.2.0 · 2026-10-13\nStylus cropping, tone presets, brightness, contrast, shadows and highlights.\n\n0.1.0 · 2026-10-12\nInsert local images into notes.'],
    ['License & compatibility', 'Project code and original logo are MIT licensed. Third-party components retain their own licenses; see THIRD-PARTY-NOTICES.txt in the package and source.\nRequires a Supernote system with compatible official plugin APIs. Device support depends on the system version. File read/write access only; no network permission.'],
  ],
};

export function AboutScreen({onBack, onNote, noteName, language, onLanguage, languageDisabled}: {
  onBack: () => void; onNote: () => void; noteName: string; language: Language; onLanguage: () => void; languageDisabled: boolean;
}) {
  const [license, setLicense] = useState(false);
  return <SafeAreaView style={s.screen}>
    <AppHeader about noteName={noteName} language={language} onBack={onNote} onLanguage={onLanguage} onAbout={onBack} languageDisabled={languageDisabled} />
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>{t('关于')}</Text>
      {ABOUT[language].map(([title, body]) => <View key={title} style={s.section}>
        <Text style={s.title}>{title}</Text><Text selectable style={s.body}>{body}</Text>
      </View>)}
      <Button label={license ? (language === 'zh' ? '收起 MIT 许可证' : 'Hide MIT license') : (language === 'zh' ? '查看 MIT 许可证全文' : 'Read the MIT license')}
        onPress={() => setLicense(!license)} secondary />
      {license && <Text selectable style={s.body}>{MIT_LICENSE}</Text>}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#fff'}, scroll: {flex: 1},
  title: {fontSize: 19, fontWeight: '700', color: '#111'},
  content: {padding: 16, gap: 18}, section: {gap: 8}, body: {fontSize: 15, lineHeight: 23, color: '#111'},
});
