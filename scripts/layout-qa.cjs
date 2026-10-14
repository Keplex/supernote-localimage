const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const unitless = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'zIndex']);
function flatten(style) {return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};}
function css(style) {
  if (typeof style === 'function') {style = style({pressed: false});}
  style = flatten(style);
  const expanded = {...style};
  for (const dimension of ['padding', 'margin']) {
    if (style[dimension + 'Horizontal'] != null) {expanded[dimension + 'Left'] = expanded[dimension + 'Right'] = style[dimension + 'Horizontal'];}
    if (style[dimension + 'Vertical'] != null) {expanded[dimension + 'Top'] = expanded[dimension + 'Bottom'] = style[dimension + 'Vertical'];}
  }
  return Object.entries(expanded).filter(([name]) => !/Horizontal|Vertical|fontVariant|includeFontPadding/.test(name)).map(([name, value]) => {
    if (name === 'flex' && value === 1) {return 'flex:1 1 0%';}
    if (name === 'borderColor') {return `border-color:${value};border-style:solid`;}
    if (name === 'borderWidth') {return `border-width:${value}px;border-style:solid`;}
    return name.replace(/[A-Z]/g, s => '-' + s.toLowerCase()) + ':' + (typeof value === 'number' && !unitless.has(name) ? value + 'px' : value);
  }).join(';');
}
exports.checkLayouts = async ({mount, press, unmount, act, flush, setStoredLanguage}) => {
  const {chromium} = require(process.env.LOCALIMAGE_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({headless: true, executablePath: process.env.LOCALIMAGE_BROWSER});
  const sample = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'samples/sample-grayscale.jpg')).toString('base64');
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/icon.png')).toString('base64');
  const bolt = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/bolt.png')).toString('base64');
  const icons = {
    'Local Image logo': logo, 'Quick insert icon': bolt,
    ...Object.fromEntries([['Reset icon', 'reset'], ['Compare icon', 'compare'], ['Compare icon white', 'compare-white'],
      ['About icon', 'about'], ['Return to note icon', 'note-arrow']]
      .map(([label, file]) => [label, 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', file + '.png')).toString('base64')])),
  };
  const out = path.join(root, 'build/layout-qa'); fs.mkdirSync(out, {recursive: true});
  try {
    for (const language of ['zh', 'en']) {
      setStoredLanguage(language); const view = await mount();
      const toneHeights = new Map();
      const headers = new Map();
      for (const stage of ['home', 'crop', 'tone', 'tone-natural', 'tone-compare', 'about']) {
        if (stage === 'crop') {await press(view, language === 'zh' ? '选择并编辑' : 'Choose & edit');}
        if (stage === 'tone') {
          await press(view, language === 'zh' ? '下一步：灰阶' : 'Next: tone');
          await press(view, language === 'zh' ? '均衡' : 'Balanced');
          await act(async () => {await new Promise(resolve => setTimeout(resolve, 650)); await flush();});
        }
        if (stage === 'tone-natural') {
          await press(view, language === 'zh' ? '自然' : 'Natural');
          await act(async () => {await new Promise(resolve => setTimeout(resolve, 650)); await flush();});
        }
        if (stage === 'about') {await press(view, language === 'zh' ? '关于' : 'About');}
        if (stage === 'tone-compare') {await press(view, language === 'zh' ? '对比原灰阶' : 'Compare original');}
        for (const [width, height] of [[600, 800], [702, 936], [936, 1248]]) {
          const page = await browser.newPage({viewport: {width, height}});
          for (let pass = 0; pass < 4; pass++) {
            const layouts = [];
            function node(item) {
              if (typeof item === 'string') {return escape(item);}
              if (!item || item.type === 'StatusBar') {return '';}
              if (Array.isArray(item)) {return item.map(node).join('');}
              const {type, props} = item;
              let layout = '';
              if (props.onLayout) {layout = ` data-layout="${layouts.length}"`; layouts.push(props.onLayout);}
              const style = css(props.style);
              const label = props.accessibilityLabel ? ` data-label="${escape(props.accessibilityLabel)}"` : '';
              if (type === 'Image') {return `<img${layout}${label} style="${style};object-fit:contain" src="${icons[props.accessibilityLabel] || sample}">`;}
              let children = (item.children || []).map(node).join('');
              if (type === 'ScrollView') {children = `<div style="min-height:100%;${css(props.contentContainerStyle)}">${children}</div>`;}
              return `<div${layout}${label} data-type="${type}" style="${style}${props.numberOfLines === 1 ? ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : ''}">${children}</div>`;
            }
            const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;font-family:Arial,"Microsoft YaHei",sans-serif}body{display:flex}div{position:relative;box-sizing:border-box;border-width:0;display:flex;flex-direction:column;flex-shrink:0;min-width:0}img{display:block;min-width:0}[data-type=Text]{display:block;flex-shrink:1;white-space:pre-wrap}[data-type=ScrollView]{overflow:auto;min-height:0}[data-type=Pressable]{cursor:pointer}</style>' + node(view.toJSON());
            await page.setContent(html);
            const sizes = await page.locator('[data-layout]').evaluateAll(nodes => nodes.map(n => ({id: Number(n.dataset.layout), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height})));
            await act(async () => {for (const size of sizes) {layouts[size.id]({nativeEvent: {layout: size}});} await flush();});
          }
          const metrics = await page.locator('[data-type=ScrollView]').evaluate(n => ({visible: n.clientHeight, content: n.scrollHeight, width: n.clientWidth, contentWidth: n.scrollWidth}));
          if (stage !== 'about') {assert.ok(metrics.content <= metrics.visible + 2, `${language}/${stage}/${width}: vertical overflow ${JSON.stringify(metrics)}`);}
          assert.ok(metrics.contentWidth <= metrics.width + 2, 'Horizontal overflow');
          const buttons = await page.locator('[data-type=Pressable]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(); return {label: n.dataset.label, top: r.top, bottom: r.bottom, left: r.left, right: r.right,
              radius: parseFloat(getComputedStyle(n).borderRadius)};
          }));
          assert.ok(buttons.every(b => b.top >= 0 && (stage === 'about' || b.bottom <= height) && b.left >= 0 && b.right <= width), JSON.stringify(buttons));
          assert.ok(buttons.every(b => b.radius > 0), 'Every button must have rounded corners');
          const header = await page.locator('[data-label="Local Image header"]').evaluate(n => {
            const rect = e => {const r = e.getBoundingClientRect(); return {left: r.left, top: r.top, width: r.width, height: r.height};};
            return {header: rect(n), brand: rect(n.querySelector('[data-label="Local Image centered title"]')),
              logo: rect(n.querySelector('[data-label="Local Image logo"]')), title: rect(n.querySelector('[data-label="Local Image header title"]')),
              buttons: [...n.querySelectorAll('[data-type=Pressable]')].map(rect)};
          });
          assert.ok(Math.abs(header.brand.left + header.brand.width / 2 - width / 2) < 0.01, 'Brand must be centered in the screen');
          assert.ok(Math.abs((header.logo.left + header.title.left + header.title.width) / 2 - width / 2) < 0.01, 'Visible logo and title must be centered together');
          if (stage === 'home') {headers.set(width, header);}
          else {assert.deepEqual(header, headers.get(width), 'Header controls must keep their coordinates on every page');}
          const arrow = await page.locator('img[data-label="Return to note icon"]').evaluate(n => {
            const r = n.getBoundingClientRect(), b = n.parentElement.getBoundingClientRect();
            return {y: (r.top + r.bottom - b.top - b.bottom) / 2, overlap: r.right - b.right};
          });
          assert.deepEqual(arrow, {y: 0, overlap: 10}, 'Note return arrow must be centered and overlap the right edge');
          const languageLabels = await page.locator('[data-label="Chinese language label"], [data-label="English language label"]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(), b = n.parentElement.getBoundingClientRect();
            return {label: n.dataset.label, color: getComputedStyle(n).color, y: (r.top + r.bottom - b.top - b.bottom) / 2};
          }));
          for (const label of languageLabels) {
            const active = label.label === (language === 'zh' ? 'Chinese language label' : 'English language label');
            assert.equal(label.color, active ? 'rgb(17, 17, 17)' : 'rgb(153, 153, 153)');
            assert.ok(Math.abs(label.y) < 0.01, 'Language labels must be vertically centered');
          }
          const iconAlignment = await page.locator('img[data-label="Reset icon"], img[data-label="Compare icon"], img[data-label="Compare icon white"], img[data-label="About icon"]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(), b = n.parentElement.getBoundingClientRect();
            const text = n.parentElement.querySelector('[data-type=Text]')?.getBoundingClientRect();
            return {label: n.dataset.label, y: (r.top + r.bottom - b.top - b.bottom) / 2,
              x: (r.left + r.right - b.left - b.right) / 2,
              textY: text ? (r.top + r.bottom - text.top - text.bottom) / 2 : 0};
          }));
          for (const icon of iconAlignment) {
            assert.ok(Math.abs(icon.y) < 0.01, `${icon.label} must be vertically centered`);
            if (icon.label === 'Reset icon') {assert.ok(Math.abs(icon.textY) < 0.01, 'Reset icon must align with text');}
            else {assert.ok(Math.abs(icon.x) < 0.01, `${icon.label} must be horizontally centered`);}
          }
          if (stage === 'tone' || stage === 'tone-natural' || stage === 'tone-compare') {
            const previewLabel = stage === 'tone-compare' ? (language === 'zh' ? '原始灰阶（已裁剪）' : 'Original tone (cropped)') : (language === 'zh' ? '调整后的效果' : 'Edited preview');
            const preview = await page.locator(`img[data-label="${previewLabel}"]`).evaluate(n => ({top: n.getBoundingClientRect().top, height: n.getBoundingClientRect().height}));
            if (stage === 'tone') {toneHeights.set(width, preview);}
            else {assert.deepEqual(preview, toneHeights.get(width), 'Auto levels must not shift the preview');}
            const compare = await page.locator(`[data-label="${stage === 'tone-compare' ? (language === 'zh' ? '看调整效果' : 'Show edited') : (language === 'zh' ? '对比原灰阶' : 'Compare original')}"]`).evaluate(n => {
              const r = n.getBoundingClientRect(), p = n.parentElement.getBoundingClientRect();
              return {width: r.width, height: r.height, round: getComputedStyle(n).borderRadius, top: r.top - p.top, right: p.right - r.right};
            });
            assert.deepEqual(compare, {width: 44, height: 44, round: '22px', top: 8, right: 8});
            const reset = buttons.find(b => b.label === (language === 'zh' ? '↺ 还原灰阶' : '↺ Reset tone'));
            const presets = buttons.filter(b => (language === 'zh' ? ['自然','均衡','提亮','压暗','线稿'] : ['Natural','Balanced','Lighter','Darker','Line art']).includes(b.label));
            assert.ok(presets.length === 5 && presets.every(b => b.top === reset.top && b.right < reset.left && b.bottom < preview.top), 'Presets must sit left of reset above the image');
          }
          const name = `${stage}-${language}-${width}x${height}`;
          await page.screenshot({path: path.join(out, name + '.png')});
          fs.writeFileSync(path.join(out, name + '.html'), await page.content());
          console.log('Layout fits:', name, JSON.stringify(metrics)); await page.close();
        }
      }
      await unmount(view);
    }
  } finally {await browser.close();}
};
