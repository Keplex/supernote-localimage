import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {basename, errorText, fileUri, ImageController} from './src/core';
import type {Selection} from './src/core';
import {BUTTON_ID, dependencies, initializePlugin, renderImage, loadLanguage, saveLanguage} from './src/runtime';
import {FULL_CROP, NEUTRAL, recipeKey, resolvedRecipe, previewHeight} from './src/editor';
import type {Corner, Crop, Recipe, RenderResult, Tone} from './src/editor';
import {Button, CropCanvas, Histogram, ToneControls} from './src/EditorControls';
import {PreviewQueue} from './src/previewQueue';
import type {PreviewStatus} from './src/previewQueue';
import {getLanguage, setLanguage, t} from './src/i18n';

interface Preview {image: RenderResult; neutral: RenderResult; key: string; recipe: Recipe}
interface Request {path: string; crop: Crop; tone: Tone}

export default function App(): React.JSX.Element {
  const controller = useRef(new ImageController(dependencies));
  const alive = useRef(true), working = useRef(false), closing = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const neutralCache = useRef<{key: string; image: RenderResult} | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState('');
  const [language, showLanguage] = useState(getLanguage()), [languageBusy, setLanguageBusy] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState(''), [submitted, setSubmitted] = useState(false);
  const [stage, setStage] = useState<'crop' | 'tone'>('crop');
  const [base, setBase] = useState<RenderResult | null>(null);
  const [crop, setCrop] = useState<Crop>({...FULL_CROP}), [tone, setTone] = useState<Tone>({...NEUTRAL});
  const [corner, setCorner] = useState<Corner>('topLeft');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [compare, setCompare] = useState(false), [previewError, setPreviewError] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [viewport, setViewport] = useState(500), [topHeight, setTopHeight] = useState(80), [bottomHeight, setBottomHeight] = useState(175);
  const dirty = !preview || preview.key !== recipeKey(crop, tone);

  const [queue] = useState(() => new PreviewQueue<Request, Preview>(async request => {
    const cropKey = request.path + recipeKey(request.crop, NEUTRAL);
    let neutral = neutralCache.current?.key === cropKey ? neutralCache.current.image : null;
    if (!neutral) {neutral = await renderImage(request.path, {...request.crop, ...NEUTRAL}, 'neutral');}
    neutralCache.current = {key: cropKey, image: neutral};
    const key = recipeKey(request.crop, request.tone);
    const image = key === recipeKey(request.crop, NEUTRAL) ? neutral
      : await renderImage(request.path, {...request.crop, ...request.tone}, 'preview');
    return {image, neutral, key, recipe: resolvedRecipe(request.crop, request.tone, image)};
  }, result => {
    if (alive.current) {setPreview(result); setPreviewError(false);}
  }, error => {
    if (alive.current) {setPreviewError(true); setMessage(errorText(error));}
  }, status => {if (alive.current) {setPreviewStatus(status);}}));

  function resetEditor() {
    queue.cancel(); neutralCache.current = null;
    controller.current = new ImageController(dependencies);
    setSelection(null); setBase(null); setPreview(null);
    setCrop({...FULL_CROP}); setTone({...NEUTRAL}); setCorner('topLeft'); setStage('crop'); setCompare(false);
    setMessage(''); setSubmitted(false); setPreviewError(false);
  }
  async function close() {
    if (working.current || closing.current) {return;}
    queue.cancel(); closing.current = true;
    try {
      if (!(await PluginManager.closePluginView()) && alive.current) {setMessage('暂时无法关闭插件，请使用系统返回操作。');}
    } catch (error) {if (alive.current) {setMessage(`${t('返回笔记失败')}: ${errorText(error)}`);}}
    finally {closing.current = false;}
  }
  useEffect(() => {
    alive.current = true;
    let subscription: {remove(): void} | undefined;
    void initializePlugin().then(async () => {
      try {const value = await loadLanguage(); if (alive.current) {showLanguage(value);}}
      catch (error) {if (alive.current) {setMessage(errorText(error));}}
      if (!alive.current) {return;}
      setReady(true);
      subscription = PluginManager.registerButtonListener({onButtonPress(event) {
        if (event.id === BUTTON_ID && !working.current) {resetEditor();}
      }});
    }).catch(error => {if (alive.current) {setMessage(errorText(error));}});
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!working.current) {void close();} return true;
    });
    return () => {alive.current = false; queue.cancel(); subscription?.remove(); back.remove();};
  }, []);

  useEffect(() => {
    if (stage === 'tone' && selection && !busy && !submitted) {
      queue.request({path: selection.path, crop: {...crop}, tone: {...tone}});
    }
    return () => queue.cancel();
  }, [queue, stage, selection, crop, tone, busy, submitted]);

  async function switchLanguage() {
    if (languageBusy) {return;}
    const value = language === 'zh' ? 'en' : 'zh';
    setLanguage(value); showLanguage(value); setLanguageBusy(true);
    try {await saveLanguage(value);}
    catch (error) {if (alive.current) {setMessage(errorText(error));}}
    finally {if (alive.current) {setLanguageBusy(false);}}
  }

  // Shared mutation path: omitting prepare passes the original file straight to insertImage.
  async function finishInsertion(prepare?: (selected: Selection) => Promise<string>): Promise<boolean> {
    try {
      const result = await controller.current.insert(prepare);
      if (alive.current) {
        setSubmitted(true);
        setMessage(result.saved ? '图片已插入并保存。' : result.warning || '图片已插入，请返回笔记检查。');
      }
      return result.saved;
    } catch (error) {
      if (alive.current) {setSubmitted(!controller.current.canInsert); setMessage(errorText(error));}
      return false;
    }
  }
  async function choose(direct = false) {
    if (working.current || !ready) {return;}
    queue.cancel(); working.current = true; setBusy('正在读取图片…'); setMessage('');
    let saved = false;
    try {
      const selected = await controller.current.pick();
      if (!selected) {if (alive.current) {setMessage('已取消选择，笔记未修改。');} return;}
      if (!alive.current) {return;}
      neutralCache.current = null;
      setSelection(selected); setBase(null); setPreview(null);
      setCrop({...FULL_CROP}); setTone({...NEUTRAL}); setCorner('topLeft'); setStage('crop'); setCompare(false);
      setSubmitted(false); setPreviewError(false);
      if (direct) {
        setBusy('正在插入原图…'); saved = await finishInsertion();
      } else {
        setBusy('正在生成预览…');
        const image = await renderImage(selected.path, {...FULL_CROP, ...NEUTRAL}, 'base');
        neutralCache.current = {key: selected.path + recipeKey(FULL_CROP, NEUTRAL), image};
        if (alive.current) {setBase(image); scroll.current?.scrollTo({y: 0, animated: false});}
      }
    } catch (error) {if (alive.current) {setMessage(errorText(error));}}
    finally {working.current = false; if (alive.current) {setBusy('');}}
    if (saved && alive.current) {await close();}
  }
  function refresh() {
    if (working.current || !selection || submitted) {return;}
    if (previewError) {neutralCache.current = null;}
    setMessage('');
    queue.request({path: selection.path, crop: {...crop}, tone: {...tone}}, true);
  }
  async function insert(edited: boolean) {
    if (working.current || !controller.current.canInsert || (edited && (dirty || !preview || previewError || compare || previewStatus !== 'idle'))) {return;}
    queue.cancel(); working.current = true;
    setBusy(edited ? '正在保存图片并插入…' : '正在插入原图…'); setMessage('');
    let saved = false;
    try {
      const applied = preview?.recipe;
      saved = await finishInsertion(edited && applied ? async selected =>
        (await renderImage(selected.path, applied, 'export')).path : undefined);
    } finally {working.current = false; if (alive.current) {setBusy('');}}
    if (saved && alive.current) {await close();}
  }
  function changeStage(value: 'crop' | 'tone') {
    if (stage === value) {return;}
    queue.cancel(); setStage(value); setCompare(false); scroll.current?.scrollTo({y: 0, animated: false});
  }
  const locked = !!busy || submitted;
  const display = compare ? preview?.neutral : preview?.image;
  const height = previewHeight(viewport, topHeight, stage === 'tone' ? bottomHeight : 0);
  const statusText = previewStatus === 'waiting' ? '等待自动预览…' : previewStatus === 'rendering' ? '正在更新预览…'
    : previewError ? '预览未就绪，请重试' : compare ? '原始灰阶（已裁剪）' : '停止调节 1.2 秒后自动预览';
  return <SafeAreaView style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <View style={s.header}>
      <Text style={[s.title, s.flex]}>{t('本地插图')}</Text>
      <Button label={language === 'zh' ? 'English' : '中文'} accessibilityLabel="中文 / English" onPress={() => void switchLanguage()} disabled={!ready || !!busy || languageBusy} small />
      <Button label={t('返回笔记')} onPress={() => void close()} disabled={!!busy} small />
    </View>
    <View style={s.fileRow}>
      <View style={s.flex}><Text style={s.file} numberOfLines={1}>{selection ? basename(selection.path) : t('选择一张图片开始')}</Text>
        <Text style={s.hint}>{selection ? `${selection.width} × ${selection.height}` : 'PNG / JPG / JPEG'}</Text></View>
      <Button label={t(selection ? '换图' : '选择并编辑')} onPress={() => void choose()} disabled={!ready || !!busy} small />
      <Button label={t('选图直插')} onPress={() => void choose(true)} disabled={!ready || !!busy} small />
    </View>
    {selection && <View style={s.tabs}>
      <View style={s.flex}><Button label={`1 ${t('裁剪')}`} selected={stage === 'crop'} disabled={locked} onPress={() => changeStage('crop')} small /></View>
      <View style={s.flex}><Button label={`2 ${t('灰阶')}`} selected={stage === 'tone'} disabled={locked || !base} onPress={() => changeStage('tone')} small /></View>
    </View>}
    <ScrollView ref={scroll} style={s.flex} onLayout={event => setViewport(event.nativeEvent.layout.height)} contentContainerStyle={s.content}>
      {!selection ? <View style={s.empty}>
        <Image source={require('./assets/icon.png')} style={s.icon} />
        <Text style={s.body}>{t('全程离线 · 原图保留')}</Text>
        <Text style={s.hint}>{t('选图直插跳过编辑预览，直接使用原文件。')}</Text>
      </View> : <>
        <View onLayout={event => setTopHeight(event.nativeEvent.layout.height)} style={s.top}>
          <View style={s.row}>
            {stage === 'crop' ? <>
              <View style={s.flex}><Button label={t('左上角')} selected={corner === 'topLeft'} onPress={() => setCorner('topLeft')} disabled={locked} small /></View>
              <View style={s.flex}><Button label={t('右下角')} selected={corner === 'bottomRight'} onPress={() => setCorner('bottomRight')} disabled={locked} small /></View>
              <View style={s.flex}><Button label={t('还原全图')} onPress={() => setCrop({...FULL_CROP})} disabled={locked} small /></View>
            </> : <>
              <View style={s.flex}><Button label={t('还原灰阶')} onPress={() => {setTone({...NEUTRAL}); setCompare(false); setMessage('');}} disabled={locked} small /></View>
              <View style={s.flex}><Button label={t(compare ? '看调整效果' : '对比原灰阶')} onPress={() => setCompare(!compare)} disabled={locked || !preview || dirty || previewStatus !== 'idle'} selected={compare} small /></View>
              <View style={s.flex}><Button label={t(previewError ? '重试预览' : '立即更新')} onPress={refresh} disabled={locked} small /></View>
            </>}
          </View>
          <Text style={s.hint}>{t(stage === 'crop' ? '选择一个角，再点图定位；触控笔更精确。拖动后松手更新。' : statusText)}</Text>
        </View>
        {stage === 'crop' ? <>
          {base ? <CropCanvas image={base} crop={crop} corner={corner} setCrop={setCrop} disabled={locked} height={height} />
            : <View style={[s.placeholder, {height}]}><Text style={s.hint}>{t('选图直插跳过编辑预览，直接使用原文件。')}</Text></View>}
        </> : <>
          <View style={[s.preview, {height}]}>
            {display && <Image key={display.path} source={{uri: fileUri(display.path)}} resizeMode="contain" style={s.full}
              accessibilityLabel={t(compare ? '原始灰阶（已裁剪）' : '调整后的效果')}
              onError={() => {setPreviewError(true); setMessage('预览文件读取失败，请重试预览。');}} />}
          </View>
          <View onLayout={event => setBottomHeight(event.nativeEvent.layout.height)} style={s.bottom}>
            {display && <Histogram result={display} />}
            <ToneControls tone={tone} setTone={value => {setTone(value); setCompare(false); setMessage('');}} disabled={locked} />
            {tone.autoLevels && <Text style={s.hint}>{t('自动黑白点')}</Text>}
          </View>
        </>}
      </>}
    </ScrollView>
    <View style={s.footer}>
      {!!message && <Text selectable style={s.message} accessibilityLiveRegion="polite">{errorText(message)}</Text>}
      {!!busy && <Text style={s.busy} accessibilityLiveRegion="polite">{t(busy)}</Text>}
      {selection ? <>
        <View style={s.row}>
          <View style={s.flex}><Button label={t('插入原图')} disabled={locked} onPress={() => void insert(false)} /></View>
          <View style={s.flex}>{stage === 'crop'
            ? <Button label={t('下一步：灰阶')} primary disabled={locked || !base} onPress={() => changeStage('tone')} />
            : <Button label={t(submitted ? '已提交' : dirty || previewStatus !== 'idle' ? '等待预览' : '插入效果')} primary
              disabled={locked || dirty || previewError || compare || previewStatus !== 'idle'} onPress={() => void insert(true)} />}</View>
        </View>
        <Text style={s.hint} numberOfLines={1}>{t('目标')}: {basename(selection.target.path)} · {t('页')} {selection.target.page + 1}</Text>
      </> : <Text style={s.hint}>Local Image 0.3.0</Text>}
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#fff'}, flex: {flex: 1}, row: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  header: {paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#111', flexDirection: 'row', gap: 8, alignItems: 'center'},
  title: {fontSize: 21, fontWeight: '700', color: '#111'},
  fileRow: {flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6},
  tabs: {flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 4},
  content: {flexGrow: 1, paddingHorizontal: 12, paddingVertical: 4, width: '100%'},
  top: {gap: 4, paddingBottom: 6}, bottom: {gap: 6, paddingTop: 6},
  hint: {fontSize: 12, lineHeight: 18, color: '#333'}, body: {fontSize: 17, lineHeight: 24, color: '#111'},
  file: {fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#111'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12}, icon: {width: 60, height: 60},
  preview: {backgroundColor: '#eee'}, placeholder: {alignItems: 'center', justifyContent: 'center'}, full: {width: '100%', height: '100%'},
  footer: {paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderColor: '#aaa', gap: 4},
  message: {fontSize: 13, lineHeight: 18, color: '#111'}, busy: {fontSize: 14, lineHeight: 20, color: '#111', fontWeight: '600'},
});
