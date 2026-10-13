const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const unitless = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'zIndex']);
function flatten(style) {return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};}
function css(style) {
  style = flatten(style);
  const expanded = {...style};
  for (const dimension of ['padding', 'margin']) {
    if (style[dimension + 'Horizontal'] != null) {expanded[dimension + 'Left'] = expanded[dimension + 'Right'] = style[dimension + 'Horizontal'];}
    if (style[dimension + 'Vertical'] != null) {expanded[dimension + 'Top'] = expanded[dimension + 'Bottom'] = style[dimension + 'Vertical'];}
  }
  return Object.entries(expanded).filter(([name]) => !/Horizontal|Vertical|fontVariant/.test(name)).map(([name, value]) => {
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
  const out = path.join(root, 'build/layout-qa'); fs.mkdirSync(out, {recursive: true});
  try {
    for (const language of ['zh', 'en']) {
      setStoredLanguage(language); const view = await mount();
      await press(view, language === 'zh' ? '选择并编辑' : 'Choose & edit');
      for (const stage of ['crop', 'tone']) {
        if (stage === 'tone') {
          await press(view, language === 'zh' ? '下一步：灰阶' : 'Next: tone');
          await press(view, language === 'zh' ? '均衡' : 'Balanced');
          await press(view, language === 'zh' ? '立即更新' : 'Refresh now');
        }
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
              if (type === 'Image') {return `<img${layout} style="${style};object-fit:contain" src="${sample}">`;}
              let children = (item.children || []).map(node).join('');
              if (type === 'ScrollView') {children = `<div style="min-height:100%;${css(props.contentContainerStyle)}">${children}</div>`;}
              return `<div${layout}${label} data-type="${type}" style="${style}${props.numberOfLines === 1 ? ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : ''}">${children}</div>`;
            }
            const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;font-family:Arial,"Microsoft YaHei",sans-serif}body{display:flex}div{position:relative;box-sizing:border-box;border-width:0;display:flex;flex-direction:column;flex-shrink:0;min-width:0}img{display:block;min-width:0}[data-type=Text]{display:block;flex-shrink:1}[data-type=ScrollView]{overflow:auto;min-height:0}[data-type=Pressable]{cursor:pointer}</style>' + node(view.toJSON());
            await page.setContent(html);
            const sizes = await page.locator('[data-layout]').evaluateAll(nodes => nodes.map(n => ({id: Number(n.dataset.layout), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height})));
            await act(async () => {for (const size of sizes) {layouts[size.id]({nativeEvent: {layout: size}});} await flush();});
          }
          const metrics = await page.locator('[data-type=ScrollView]').evaluate(n => ({visible: n.clientHeight, content: n.scrollHeight, width: n.clientWidth, contentWidth: n.scrollWidth}));
          assert.ok(metrics.content <= metrics.visible + 2, `${language}/${stage}/${width}: vertical overflow ${JSON.stringify(metrics)}`);
          assert.ok(metrics.contentWidth <= metrics.width + 2, 'Horizontal overflow');
          const buttons = await page.locator('[data-type=Pressable]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(); return {label: n.dataset.label, top: r.top, bottom: r.bottom, left: r.left, right: r.right};
          }));
          assert.ok(buttons.every(b => b.top >= 0 && b.bottom <= height && b.left >= 0 && b.right <= width), JSON.stringify(buttons));
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
