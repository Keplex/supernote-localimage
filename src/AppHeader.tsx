import React from 'react';
import {Image, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Button} from './EditorControls';
import {t} from './i18n';
import type {Language} from './i18n';

/** One layout for the editor and About, including a stable back-button slot. */
export function AppHeader({language, about = false, onBack, onLanguage, onAbout, disabled = false, languageDisabled = false}: {
  language: Language; about?: boolean; onBack: () => void; onLanguage: () => void; onAbout: () => void;
  disabled?: boolean; languageDisabled?: boolean;
}) {
  const backLabel = `← ${t(about ? '返回编辑' : '返回笔记')}`;
  return <>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <View style={s.header} accessibilityLabel="Local Image header">
      <View style={s.back}>
        <Button small label={language === 'en' ? '← Back' : backLabel} accessibilityLabel={backLabel} onPress={onBack} disabled={disabled} />
      </View>
      <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Local Image logo" />
      <Text style={s.title} numberOfLines={1} accessibilityLabel="Local Image header title">{t(about ? '关于' : '本地插图')}</Text>
      <Button label={language === 'zh' ? 'English' : '中文'} accessibilityLabel="中文 / English" onPress={onLanguage} disabled={disabled || languageDisabled} small />
      <Button label={t('关于')} onPress={onAbout} disabled={disabled} selected={about} small />
    </View>
  </>;
}
const s = StyleSheet.create({
  header: {height: 54, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#111', flexDirection: 'row', gap: 8, alignItems: 'center'},
  back: {width: 104}, logo: {width: 30, height: 30},
  title: {flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#111'},
});
