import React from 'react';
import {Image, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {t} from './i18n';
import type {Language} from './i18n';

export function AppHeader({noteName, language, about = false, onBack, onLanguage, onAbout, disabled = false, languageDisabled = false}: {
  noteName: string; language: Language; about?: boolean; onBack: () => void; onLanguage: () => void; onAbout: () => void;
  disabled?: boolean; languageDisabled?: boolean;
}) {
  return <>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <View style={s.header} accessibilityLabel="Local Image header">
      <View style={s.side}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('返回笔记')} accessibilityHint={noteName}
          accessibilityState={{disabled}} disabled={disabled} onPress={onBack} style={[s.back, disabled && s.disabled]}>
          <Text style={s.noteName} numberOfLines={1}>{noteName || t('返回笔记')}</Text>
          <Image source={require('../assets/note-arrow.png')} resizeMode="contain" style={s.arrow} accessibilityLabel="Return to note icon" accessible={false} />
        </Pressable>
      </View>
      <View style={s.brand} accessibilityLabel="Local Image centered title">
        <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Local Image logo" />
        <Text style={s.title} numberOfLines={1} accessibilityLabel="Local Image header title">{t('本地插图')}</Text>
      </View>
      <View style={[s.side, s.actions]}>
        <Pressable accessibilityRole="button" accessibilityLabel="中文 / English" accessibilityHint={t('切换界面语言')}
          accessibilityValue={{text: language === 'zh' ? '中文' : 'English'}}
          accessibilityState={{disabled: disabled || languageDisabled}} disabled={disabled || languageDisabled} onPress={onLanguage}
          style={[s.languageButton, disabled && s.disabled]}>
          <Text style={[s.languageText, language === 'zh' ? s.currentLanguage : s.otherLanguage]} accessibilityLabel="Chinese language label">中文</Text>
          <Text style={s.languageDivider}>/</Text>
          <Text style={[s.languageText, language === 'en' ? s.currentLanguage : s.otherLanguage]} accessibilityLabel="English language label">En</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('关于')} accessibilityHint={t(about ? '返回编辑' : '查看插件介绍')}
          accessibilityState={{disabled, selected: about}} disabled={disabled} onPress={onAbout}
          style={({pressed}) => [s.iconButton, (about || pressed) && s.selected, disabled && s.disabled]}>
          <Image source={require('../assets/about.png')} style={s.actionIcon} accessibilityLabel="About icon" accessible={false} />
        </Pressable>
      </View>
    </View>
  </>;
}
const s = StyleSheet.create({
  header: {height: 60, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#111', flexDirection: 'row', alignItems: 'center'},
  side: {width: 160}, actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8},
  back: {width: 146, height: 38, borderRadius: 3, backgroundColor: '#000', justifyContent: 'center', paddingLeft: 14, paddingRight: 26},
  noteName: {fontSize: 16, lineHeight: 22, color: '#fff', includeFontPadding: false},
  arrow: {position: 'absolute', right: -10, top: 5, width: 30, height: 28},
  brand: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  logo: {width: 28, height: 28}, title: {fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#111', flexShrink: 1},
  iconButton: {width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  languageButton: {width: 96, height: 44, borderRadius: 4, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center'},
  languageText: {fontSize: 16, lineHeight: 22, includeFontPadding: false},
  currentLanguage: {color: '#111', fontWeight: '600'}, otherLanguage: {color: '#999', fontWeight: '400'},
  languageDivider: {fontSize: 16, lineHeight: 22, color: '#999', includeFontPadding: false},
  actionIcon: {width: 28, height: 28}, selected: {backgroundColor: '#ddd'}, disabled: {opacity: 0.35},
});
