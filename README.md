# 本地插图 / Local Image 0.4.2

![Local Image](assets/icon.png)

Supernote 本地插图插件：插入 PNG/JPG/JPEG，按需裁剪和调整灰阶。中英文界面，全程离线，原文件保留。

开发者 **Keplex**；借助 **OpenAI GPT** 辅助开发、研究与测试。独立社区项目，非 Supernote 官方插件。项目代码与原创 logo 采用 [MIT 许可证](LICENSE)，第三方组件保留各自许可证。

需要支持官方插件功能及 `sn-plugin-lib 0.2.3` 对应接口的系统。0.4.1 已获用户真机反馈；0.4.2 的图标对齐修改已完成桌面测试和打包，仍需安装后核验墨水屏上的效果。其他型号的兼容性取决于其插件系统版本。

## 安装升级

1. 把 `LocalImage-0.4.2.snplg` 原样复制到设备 **MyStyle** 文件夹，不解压。
2. 打开 **设置 → 应用 → 插件 → 添加插件**，选择安装包，按系统提示升级。
3. **重启设备**，让新版原生模块加载。
4. 打开 `.note` 笔记目标页，从工具栏进入 **本地插图 / Local Image**。

插件 ID 沿用前版，版本码递增为 6。原有安装包保留在交付目录。

## 0.4.2 的变化

- 两个还原按钮的图形由字体字符改为独立图片图标，与文字横排并垂直居中，采用与闪电相同的方式。
- 圆形对比按钮中的半圆图形改为 24×24 的独立图片图标，在按钮中水平、垂直居中。普通和选中状态分别使用黑、白图标。

## 0.4.1 的变化

- 主界面和关于页共用固定高度的顶栏，返回按钮、logo、标题、语言和关于按钮的位置保持一致。
- 快捷入口改为黑底白字的 **直接插入 / Insert directly**，加上白色闪电图标。
- **自然、均衡、提亮、压暗、线稿** 与浅灰色 **↺ 还原灰阶** 放在同一行。还原按钮与裁剪页 **↺ 还原全图** 使用同一样式。
- **◐ 对比原灰阶** 移到预览右上角，使用 44×44 圆形按钮和浅色半透明背景。点击切换到原灰阶，再点返回调整效果。亮度、对比度等手动控件继续留在图片下面。

## 0.4.0 的变化

- **← 返回笔记** 放到左上角；标题、首页和系统入口统一使用新 logo。
- 0.4.0 统一了中英文入口文案，进入编辑后只保留 **换一张**；快捷入口在 0.4.1 改名为 **直接插入 / Insert directly**。
- 裁剪角按钮与较小的浅灰色 **↺ 还原全图** 区分。
- 灰阶在最后一次操作 **0.5 秒** 后自动预览，移除手动更新按钮。连续点击合并处理，过期预览不会覆盖新结果。
- **还原灰阶 / 对比原灰阶** 在 0.4.0 中位于预览上方；直方图和自动黑白点保留布局空间。完成按钮改为 **插入编辑后的图片**。
- 右上角新增中英文 **关于**，包括开发者、功能、用法、限制、版本日志和 MIT 许可证全文。
- 插入并保存后尝试自动选中新图片；无法核验单图选区时退回手动套索。
- 新增默认关闭的 **白底遮线（实验）**，详见下文。

## 使用

**直接插入：** 点 **直接插入**，选好文件后立即提交原文件并保存笔记。此操作跳过编辑预览和导出，不重新编码。取消选择不会修改笔记。耗时仍取决于读取、系统插入、保存及选区核验。

**裁剪：** 点 **选择并编辑**。选 **左上角** 或 **右下角**，然后点击图片定位；用触控笔更精确，也可拖动后松手更新。拖动中不连续刷新。**↺ 还原全图** 清除裁剪。

**灰阶：** 点 **下一步：灰阶**。选择预设或用加减号调整，停止操作 0.5 秒后自动开始生成预览；处理时间另计。若失败，调整参数或点 **还原灰阶** 重试，不会无限重试。

| 控件 | 用途 |
| --- | --- |
| 自然 | 保留原始亮度的灰阶转换 |
| 均衡 | 根据裁剪区域自动调整黑白点 |
| 提亮 / 压暗 | 提亮暗图或压低过亮图片 |
| 线稿 | 拉开浅色线条与背景层次 |
| 亮度 / 对比度 | −4 至 +4 档 |
| 提亮暗部 / 压暗亮部 | 0 至 4 档，调整阴影和高光 |

图片右上角的 **◐** 显示相同裁剪范围的未调整灰阶图；再点一次返回调整效果。预览上方的文字说明当前显示的状态。**还原灰阶** 保留裁剪和白底遮线开关，重置灰阶参数。

预览完成后点 **插入编辑后的图片**。正在处理、失败或对比原灰阶时暂停此操作，避免插入未经确认的结果。编辑副本保存在 `MyStyle/LocalImage`。**插入原图** 忽略所有编辑和白底遮线，直接使用原文件。

**自动选中：** 保存后核对插入前后的页面元素，只有新增加一个图片元素且选区内仅有该图片时才显示选框。如果接口不支持、选区混入已有笔迹或身份无法确认，则保留手动套索流程。不会为此重试插入，不会移动、删除或重写已有内容。系统关闭插件后是否保持选区仍待真机确认。

顶部 **English / 中文** 切换语言并保存偏好；系统文件选择器按设备语言显示。**关于** 页返回时保留编辑状态。

## 白底遮线（实验）

用户提供的原图是 RGB PNG，**没有透明通道**。截图对照发现：`#FEFEFE` 的近白区域遮住横线，`#FFFFFF` 的纯白和其他灰色区域让横线透出。这与社区笔记解析工具记录的“254 为白墨、255 为透明”约定相符，不能解释为普通 PNG 透明度或完整的图片层级控制。

灰阶页开启 **白底遮线（实验）** 后，编辑输出中经过缩放、灰阶处理的纯白像素转换为 `#FEFEFE`。其他灰阶不变。**仅白色区域遮线；灰色区域仍可能透线，整张图片不会因此置顶，也不保证盖住手写内容。** 原图中已有的 `#FEFEFE` 在未转换时也可能遮线。

预览只展示图片自身，不模拟模板。请插入后检查，特别是再次缩放、保存重开及导出 PDF 后的效果。不同系统版本可能有差异。研究依据和可复现方法见 [白底遮线研究](docs/white-mask-research.md)。

## 文件与限制

- 每次一张图片，仅支持 NOTE；输入上限为 1600 万像素、长边 8192 像素。
- 编辑输出为不带透明度的灰阶 PNG，按 EXIF 方向裁剪。原图插入保留颜色、透明度和分辨率。
- 预览与最终输出的精细纹理可能略有差异；导出使用预览确认的灰阶参数与黑白点。
- 插入位置、初始大小和层级由系统决定；自动选中成功后可调整大小，否则使用系统套索。
- 只声明文件读写权限，不请求网络权限。预览缓存自动清理；原图和已导出的副本不会自动删除。
- 完全纯黑或纯白的区域无法恢复已丢失的细节。
- 普通竖屏以无需滚动为目标；极小窗口、大字号和长错误提示下保留滚动能力。关于页可滚动。
- 插入或保存结果不明确时，按提示返回笔记检查，避免重复插入。

## English quick guide

Install the complete `.snplg` through **Settings → Apps → Plugins**, then restart the device. Open a note and launch **Local Image** from its toolbar. Change the UI language with **English / 中文**; the preference is saved.

- **Insert directly** inserts the selected original immediately, without rendering or exporting it. Cancelling leaves the note unchanged.
- **Choose & edit** opens cropping. Select **Top left** or **Bottom right**, then tap with the stylus or drag and release. **↺ Reset crop** restores the full image.
- **Next: tone** opens tone controls. Preview starts automatically **0.5 seconds** after the last change, plus processing time. Reset or adjust tone to retry a failed preview.
- **Insert edited image** saves and inserts a grayscale copy. **Insert original** ignores all edits and white masking.
- After saving, the plugin attempts to select just the new image. If it cannot verify that selection, use the system lasso. This still needs device verification.
- **White masks lines (experimental)** is off by default. It converts pure white to Supernote’s special white. **It masks lines in white areas only; lines may still show through grays. It does not bring the whole image to the front.** Check on the device, including after resizing and reopening.
- **About** contains usage, limitations, credits, changelog and the full MIT license. Developer: **Keplex**, assisted by **OpenAI GPT**. This is an independent community project.

## 从源码构建

Node.js 22.18+、pnpm 11.25.0；原生工具链见 [native/BUILD.md](native/BUILD.md)。运行依赖固定为 React 19.0.0、React Native 0.79.2、官方 `sn-plugin-lib` 0.2.3。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck
pnpm run test
pnpm run test:native
pnpm run build
```

输出 `build/outputs/LocalImage-0.4.2.snplg`。测试覆盖插入和选区保护、实际组件交互、自动预览、语言及关于页、裁剪几何和像素处理。桌面布局检查为 CSS 近似，不能替代 Android 真机和墨水屏验证。

Logo 的矢量源为 `assets/icon.svg`，实际打包使用同目录 `icon.png`。修改 SVG 后可用已有的 SVG 渲染工具重新导出 128×128 PNG；二者均属本项目 MIT 许可。

## 版本日志

- **0.4.2 / 2026-10-14：** 修复还原和对比图标偏下、与文字对齐的问题。
- **0.4.1 / 2026-10-14：** 统一顶栏，闪电直接插入入口，预设与还原横排，圆形浮动对比按钮。
- **0.4.0 / 2026-10-14：** UI 与 logo 更新，0.5 秒自动预览，关于与许可，尝试自动选图，实验性白底遮线。
- **0.3.0 / 2026-10-13：** 紧凑布局、中英文切换、自动预览和原图快捷插入。
- **0.2.0 / 2026-10-13：** 裁剪和灰阶调整。
- **0.1.0 / 2026-10-12：** 本地图片插入。

## 开发依据

- [官方插件文档](https://docs.supernote.com/en)
- [创建、打包与安装](https://docs.supernote.com/en/first-plugin)
- [insertImage](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-note-api/insert-image)
- [lassoElements](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/lasso-elements)
- [setLassoBoxState](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/set-lasso-box-state)
- 官方 SDK 公开类型与实现。第三方许可见安装包及源码中的 `THIRD-PARTY-NOTICES.txt`。
