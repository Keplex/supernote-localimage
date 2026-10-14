import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {fileUri} from './core';
import {imageFrame, pointInImage, moveCorner, stepTone, PRESETS, recipeKey, FULL_CROP} from './editor';
import type {Corner, Crop, Tone, ToneControl, RenderResult} from './editor';
import {t} from './i18n';

export function Button({label, onPress, disabled = false, primary = false, selected = false, small = false, secondary = false,
  accessibilityLabel, icon}: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; selected?: boolean;
  small?: boolean; secondary?: boolean; accessibilityLabel?: string; icon?: 'bolt' | 'reset';
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{disabled, selected}} disabled={disabled} onPress={onPress}
    style={[s.button, secondary && s.secondary, (primary || selected) && s.primary, disabled && s.disabled, small && s.small]}>
    {icon === 'bolt' && <Image source={require('../assets/bolt.png')} style={s.buttonIcon} accessibilityLabel="Quick insert icon" accessible={false} />}
    {icon === 'reset' && <Image source={require('../assets/reset.png')} resizeMode="contain" style={s.buttonIcon} accessibilityLabel="Reset icon" accessible={false} />}
    <Text style={[s.buttonText, (primary || selected) && s.white, small && s.smallText]}>{label}</Text>
  </Pressable>;
}

export function ResetButton({label, onPress, disabled}: {label: string; onPress: () => void; disabled: boolean}) {
  return <Button label={label} accessibilityLabel={`↺ ${label}`} icon="reset" onPress={onPress} disabled={disabled} small secondary />;
}

export function CompareButton({compare, onPress, disabled}: {compare: boolean; onPress: () => void; disabled: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={t(compare ? '看调整效果' : '对比原灰阶')}
    accessibilityHint={t('点击切换原始灰阶和调整效果。')} accessibilityState={{disabled, selected: compare}}
    disabled={disabled} onPress={onPress} style={[s.compare, compare && s.primary, disabled && s.disabled]}>
    <Image source={compare ? require('../assets/compare-white.png') : require('../assets/compare.png')} resizeMode="contain"
      style={s.compareIcon} accessibilityLabel={compare ? 'Compare icon white' : 'Compare icon'} accessible={false} />
  </Pressable>;
}

export function CropCanvas({image, crop, corner, setCrop, disabled, height}: {
  image: RenderResult; crop: Crop; corner: Corner; setCrop: (crop: Crop) => void; disabled: boolean; height: number;
}) {
  const [box, setBox] = useState({width: 0, height: 0});
  const frame = imageFrame(box.width, box.height, image.width, image.height);
  const left = frame.x + frame.width * crop.left, top = frame.y + frame.height * crop.top;
  const right = frame.x + frame.width * crop.right, bottom = frame.y + frame.height * crop.bottom;
  return <View style={[s.canvas, {height}]} accessibilityLabel={t('裁剪区域')}
    onLayout={event => setBox(event.nativeEvent.layout)}
    onStartShouldSetResponder={() => !disabled} onMoveShouldSetResponder={() => !disabled}
    onResponderTerminationRequest={() => false}
    onResponderRelease={event => {
      if (disabled) {return;}
      const p = pointInImage(event.nativeEvent.locationX, event.nativeEvent.locationY, frame);
      if (p) {setCrop(moveCorner(crop, corner, p.x, p.y));}
    }}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{uri: fileUri(image.path)}} resizeMode="contain" style={s.full} />
      {frame.width > 0 && <>
        <View style={[s.shade, {left: frame.x, top: frame.y, width: frame.width, height: top - frame.y}]} />
        <View style={[s.shade, {left: frame.x, top: bottom, width: frame.width, height: frame.y + frame.height - bottom}]} />
        <View style={[s.shade, {left: frame.x, top, width: left - frame.x, height: bottom - top}]} />
        <View style={[s.shade, {left: right, top, width: frame.x + frame.width - right, height: bottom - top}]} />
        <View style={[s.cropBorder, {left, top, width: right - left, height: bottom - top}]} />
        <View style={[s.handle, corner === 'topLeft' && s.activeHandle, {left: left - 7, top: top - 7}]} />
        <View style={[s.handle, corner === 'bottomRight' && s.activeHandle, {left: right - 7, top: bottom - 7}]} />
      </>}
    </View>
  </View>;
}

export function TonePresets({tone, setTone, disabled}: {tone: Tone; setTone: (tone: Tone) => void; disabled: boolean}) {
  return <View style={s.row}>{PRESETS.map(preset => <View key={preset.name} style={s.flex}>
      <Button small label={t(preset.name)} disabled={disabled}
        selected={recipeKey(FULL_CROP, tone) === recipeKey(FULL_CROP, {...preset.tone, opaqueWhite: tone.opaqueWhite})}
        onPress={() => setTone({...preset.tone, opaqueWhite: tone.opaqueWhite})} />
    </View>)}</View>;
}

export function ToneControls({tone, setTone, disabled}: {tone: Tone; setTone: (tone: Tone) => void; disabled: boolean}) {
  const controls: {field: ToneControl; label: string}[] = [
    {field: 'brightness', label: '亮度'}, {field: 'contrast', label: '对比度'},
    {field: 'shadows', label: '提亮暗部'}, {field: 'highlights', label: '压暗亮部'},
  ];
  return <View style={s.grid}>{controls.map(({field, label}) => <View style={s.control} key={field}>
      <Text style={s.label}>{t(label)}</Text>
      <Button small label="−" accessibilityLabel={`${t(label)} −`}
        disabled={disabled || tone[field] <= (field === 'brightness' || field === 'contrast' ? -4 : 0)}
        onPress={() => setTone(stepTone(tone, field, -1))} />
      <Text accessibilityLabel={`${t(label)} ${tone[field]}`} style={s.value}>{tone[field] > 0 ? '+' : ''}{tone[field]}</Text>
      <Button small label="+" accessibilityLabel={`${t(label)} +`} disabled={disabled || tone[field] >= 4}
        onPress={() => setTone(stepTone(tone, field, 1))} />
    </View>)}</View>;
}

export function Histogram({result}: {result: RenderResult}) {
  const maximum = Math.max(1, ...result.histogram);
  return <View style={s.row}>
    <View style={s.bars}>{result.histogram.map((count, i) => <View key={i}
      style={[s.bar, {height: Math.max(1, Math.round(count / maximum * 16))}]} />)}</View>
    <Text style={s.hint}>{t('黑')} {result.darkPercent.toFixed(1)}% · {t('白')} {result.lightPercent.toFixed(1)}%</Text>
  </View>;
}
const s = StyleSheet.create({
  row: {flexDirection: 'row', gap: 6, alignItems: 'center'}, flex: {flex: 1},
  hint: {fontSize: 12, lineHeight: 18, color: '#333'},
  button: {minHeight: 44, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1.5, borderColor: '#111', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexDirection: 'row', gap: 5},
  buttonIcon: {width: 18, height: 18},
  buttonText: {fontSize: 16, lineHeight: 20, fontWeight: '600', color: '#111', textAlign: 'center'},
  small: {paddingHorizontal: 7, minHeight: 40, minWidth: 36}, smallText: {fontSize: 14, lineHeight: 18},
  secondary: {backgroundColor: '#eee', borderColor: '#888'},
  primary: {backgroundColor: '#111'}, white: {color: '#fff'}, disabled: {opacity: 0.35},
  compare: {position: 'absolute', top: 8, right: 8, zIndex: 1, width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    borderColor: '#333', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center'},
  compareIcon: {width: 24, height: 24},
  canvas: {backgroundColor: '#eee', overflow: 'hidden'}, full: {height: '100%', width: '100%'},
  shade: {position: 'absolute', backgroundColor: '#fff', opacity: 0.75},
  cropBorder: {position: 'absolute', borderColor: '#000', borderWidth: 2, borderStyle: 'dashed'},
  handle: {position: 'absolute', width: 14, height: 14, borderColor: '#000', borderWidth: 2, backgroundColor: '#fff'}, activeHandle: {backgroundColor: '#000'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6},
  control: {width: '49%', flexDirection: 'row', gap: 4, alignItems: 'center', borderBottomWidth: 1, borderColor: '#aaa', paddingBottom: 3},
  label: {flex: 1, fontSize: 14, lineHeight: 18, color: '#111'},
  value: {fontSize: 18, color: '#111', width: 26, textAlign: 'center', fontVariant: ['tabular-nums']},
  bars: {flex: 1, flexDirection: 'row', gap: 2, height: 18, alignItems: 'flex-end'}, bar: {flex: 1, backgroundColor: '#444'},
});
