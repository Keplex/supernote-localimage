# 本地插图 / Local Image 0.3.0

Supernote 本地插图插件：选择 PNG/JPG/JPEG，按需裁剪和调整灰阶，再插入当前笔记页。中英文界面，全程离线，保留原文件。

需要设备系统支持官方插件功能及 `sn-plugin-lib 0.2.3` 对应的接口。0.2.0 已由用户确认可正常使用；0.3.0 已完成桌面测试和打包，新界面与自动预览仍需真机试用。其他型号的兼容性取决于其插件系统版本。

## 安装升级

1. 将 `LocalImage-0.3.0.snplg` 原样复制到设备 `MyStyle` 文件夹，不解压。
2. **设置 → 应用 → 插件 → 添加插件**，选择新版安装包，按系统提示升级。
3. 升级后重启设备，使新版原生模块加载。
4. 在 `.note` 笔记的目标页和图层，从工具栏打开 **本地插图 / Local Image**。

插件 ID 与前版相同，版本号已递增。此前安装包保留，可供需要时参考；旧版资料描述的是旧版行为。

## 0.3.0 的变化

- 裁剪、灰阶页面压缩竖向间距，相关按钮横排；灰阶四项调节采用两列布局。
- 预览区根据窗口和控件实际高度伸缩，插入操作固定在底部。普通竖屏以无需滚动为目标；极小窗口、大字号或较长错误提示下保留滚动能力。
- 灰阶参数停止调节 **1.2 秒** 后自动更新预览。连续点击合并为一次处理，不让旧参数结果覆盖新结果。
- **还原灰阶、对比原灰阶、立即更新** 放在预览上方，随时可见。自动刷新失败时，原位置显示 **重试预览**，不会反复自动重试。
- 取消裁剪方向微调和 1%/5% 按钮，改用触控笔点击或拖动定位裁剪角。
- 顶部 **English / 中文** 一键切换，记住语言选择。首次使用按系统语言选择中文或英文。系统文件选择器的系统控件仍遵循设备语言。
- 新增 **选图直插**：跳过编辑预览和导出，直接提交原图片。

## 使用

### 直接插入原图

点 **选图直插**，在系统选择器中选好文件，即直接插入当前笔记页并保存。此入口不再展示编辑预览，选择文件就是确认插入；取消选择不会修改笔记。

旧版“插入原图”本来就直接提交原文件，没有重新编码。旧版选图后仍会生成编辑预览；新的快捷入口跳过这一步。原图插入仍会核对授权、文件和目标页，并调用系统插入及笔记保存接口，因此实际耗时还取决于图片大小和设备处理速度。

### 裁剪

点 **选择并编辑**。在裁剪页选 **左上角** 或 **右下角**，再点图片定位所选角；使用触控笔可以更精确地选择裁剪边界。也可拖动后松手更新，拖动中不持续刷新。

**还原全图** 清除裁剪；底部 **下一步：灰阶** 查看裁剪后的效果。**插入原图** 会忽略全部编辑，使用原文件。

### 灰阶

选择预设或点击加减号，停止操作 1.2 秒后自动预览，也可点顶部 **立即更新**。

| 控件 | 用途 |
| --- | --- |
| 自然 | 保留原始亮度的灰阶转换 |
| 均衡 | 根据裁剪区域自动调整黑白点 |
| 提亮 / 压暗 | 提亮暗图或压低过亮的图片 |
| 线稿 | 拉开浅色线条与背景的层次 |
| 亮度 / 对比度 | −4 至 +4 档 |
| 提亮暗部 / 压暗亮部 | 0 至 4 档，分别调整阴影和高光 |

顶部 **对比原灰阶** 显示相同裁剪范围下、未调整明暗的灰阶图；点 **看调整效果** 返回。**还原灰阶** 恢复自然灰阶并自动预览，不清除裁剪。

预览完成后点底部 **插入效果**。预览尚未更新、更新失败或正在对比原灰阶时，会暂停插入效果，防止插入未经确认的结果。处理副本保存至 `MyStyle/LocalImage`，原文件不变。

## 文件与限制

- 仅在 NOTE 中使用，每次一张；支持 PNG/JPG/JPEG。输入上限为 1600 万像素、长边 8192 像素。
- 编辑输出是白底、非透明的灰阶 PNG；按 EXIF 方向裁剪。原图直插不改变分辨率、颜色或透明度。
- 缩略预览与最终图片的精细纹理可能略有差异；导出使用预览确认的灰阶参数与黑白点。
- 插入位置、大小和图层沿用系统行为，可使用系统套索调整。
- 插件只声明文件读取与写入权限，不请求网络权限。预览缓存自动清理；原图和已导出的处理副本不会自动删除，多次编辑会累积副本。
- 图片本身完全纯黑或纯白的区域无法恢复已丢失的细节。
- 若插入结果不明确或保存失败，请按提示回到笔记检查，避免重复插入。

升级后可重点试用：中英文切换及重开后的记忆、连续点击后仅刷新一次、预览上方按钮和底部插入按钮是否都可见，以及选图直插的等待时间。

## English quick guide

Install the complete `.snplg` through **Settings → Apps → Plugins**, then restart the device. Open a note and launch **Local Image** from its toolbar. Use **English / 中文** at the top to change the interface language; the preference is saved.

- **Pick & insert** inserts the selected original immediately, without an editing preview or export. Choosing a file confirms insertion; cancelling leaves the note unchanged.
- **Choose & edit** opens the crop screen. Select **Top left** or **Bottom right**, then tap with the stylus. Drag and release also works. **Reset crop** restores the whole image.
- **Next: tone** opens tone controls. Changes refresh automatically after **1.2 seconds** without another tap. **Reset tone**, **Compare original** and **Refresh now** are above the preview.
- **Insert edited** saves and inserts a new grayscale PNG; **Insert original** ignores edits and uses the source file. Original images are never overwritten.

## 从源码构建

Node.js 22.18+、pnpm 11.25.0；原生工具链见 [native/BUILD.md](native/BUILD.md)。运行依赖固定为 React 19.0.0、React Native 0.79.2、官方 `sn-plugin-lib` 0.2.3。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck
pnpm run test
pnpm run test:native
pnpm run build
```

输出：`build/outputs/LocalImage-0.3.0.snplg`。源码包附样例图和验证报告。50 项 JavaScript/TypeScript 测试覆盖插入流程、实际组件交互、自动预览队列、语言切换及裁剪几何；18 项 JVM 测试覆盖像素引擎。桌面布局检查覆盖中英文两页和三种窗口尺寸。桌面布局预览不等于设备截图。

## 开发依据

- [官方插件文档](https://docs.supernote.com/en)
- [创建、打包与安装](https://docs.supernote.com/en/first-plugin)
- [insertImage](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-note-api/insert-image)
- [权限规范](https://docs.supernote.com/en/plugin-base/permission)
- 官方 SDK 和模板的公开实现。第三方许可见包内 `THIRD-PARTY-NOTICES.txt`。
